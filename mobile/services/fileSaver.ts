/**
 * File saving service — saves downloaded files to device storage
 * Falls back to share sheet if media library access is restricted (Expo Go)
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { MediaType } from '../constants';

/**
 * Save a downloaded file to the device's media library or share
 */
export async function saveToDevice(
  filePath: string,
  mediaType: MediaType,
): Promise<string> {
  if (mediaType === 'video' || mediaType === 'image') {
    try {
      return await saveToMediaLibrary(filePath);
    } catch (err: any) {
      // Media library save failed (common in Expo Go on Android)
      // Fall back to share sheet so user can save manually
      console.warn('Media library save failed, falling back to share:', err.message);
      await shareFile(filePath);
      return filePath;
    }
  } else {
    // Audio files — open share sheet so user can save to Files
    await shareFile(filePath);
    return filePath;
  }
}

/**
 * Save video/image to the device's photo library
 */
async function saveToMediaLibrary(filePath: string): Promise<string> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Media library permission denied. Please enable it in Settings.');
  }

  // Ensure file exists
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists) {
    throw new Error('Downloaded file not found.');
  }

  // Create or get the GrabVid album
  const asset = await MediaLibrary.createAssetAsync(filePath);
  
  try {
    let album = await MediaLibrary.getAlbumAsync('GrabVid');
    if (!album) {
      album = await MediaLibrary.createAlbumAsync('GrabVid', asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
  } catch {
    // Album creation may fail in some environments but asset is still saved
  }

  return asset.uri;
}

/**
 * Share a file using the native share sheet
 */
export async function shareFile(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Download Complete', 'File saved to app storage. Sharing is not available on this device.');
    return;
  }
  await Sharing.shareAsync(filePath, {
    mimeType: getMimeType(filePath),
    dialogTitle: 'Save your download',
  });
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
