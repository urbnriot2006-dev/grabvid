/**
 * File saving service — saves downloaded files to device storage
 * In Expo Go: opens share sheet for manual gallery save
 * In production build: saves directly to gallery
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { MediaType } from '../constants';

/**
 * Save a downloaded file — always opens share sheet in dev,
 * tries gallery first in production
 */
export async function saveToDevice(
  filePath: string,
  mediaType: MediaType,
): Promise<string> {
  // Verify file exists
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists) {
    throw new Error('Downloaded file not found.');
  }

  // Try saving to media library first (works in production builds)
  if (mediaType === 'video' || mediaType === 'image') {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(filePath);
        if (asset) {
          try {
            let album = await MediaLibrary.getAlbumAsync('GrabVid');
            if (!album) {
              await MediaLibrary.createAlbumAsync('GrabVid', asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }
          } catch {
            // Album creation may fail but asset is saved
          }
          return asset.uri;
        }
      }
    } catch (err) {
      console.warn('MediaLibrary save failed:', err);
    }
  }

  // Fallback: open share sheet so user can save manually
  await openShareSheet(filePath);
  return filePath;
}

/**
 * Open native share sheet — user can tap "Save to Gallery" or share elsewhere
 */
async function openShareSheet(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert(
      'Download Complete',
      'File saved to app storage but sharing is not available on this device.',
    );
    return;
  }

  try {
    await Sharing.shareAsync(filePath, {
      mimeType: getMimeType(filePath),
      dialogTitle: 'Save your download',
    });
  } catch (err) {
    // User cancelled the share sheet — that's OK
    console.log('Share sheet dismissed');
  }
}

/**
 * Share a file using the native share sheet (public export)
 */
export async function shareFile(filePath: string): Promise<void> {
  await openShareSheet(filePath);
}

/**
 * Get MIME type from file path
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'flac': return 'audio/flac';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}
