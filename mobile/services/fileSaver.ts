/**
 * File saving service — saves downloaded files to device storage
 */
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { MediaType } from '../constants';

/**
 * Save a downloaded file to the device's media library or share
 */
export async function saveToDevice(
  filePath: string,
  mediaType: MediaType,
): Promise<string> {
  if (mediaType === 'video' || mediaType === 'image') {
    return saveToMediaLibrary(filePath);
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
  
  let album = await MediaLibrary.getAlbumAsync('GrabVid');
  if (!album) {
    album = await MediaLibrary.createAlbumAsync('GrabVid', asset, false);
  } else {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
  }

  return asset.uri;
}

/**
 * Share a file using the native share sheet
 */
export async function shareFile(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(filePath);
}

/**
 * Get the file extension from a format type
 */
export function getExtensionForType(formatId: string): string {
  if (formatId.includes('mp4') || formatId.includes('video')) return 'mp4';
  if (formatId.includes('mp3') || formatId === 'mp3_audio') return 'mp3';
  if (formatId === 'wav') return 'wav';
  if (formatId === 'flac') return 'flac';
  if (formatId.includes('jpeg') || formatId.includes('jpg')) return 'jpg';
  if (formatId === 'gif') return 'gif';
  return 'mp4';
}
