/**
 * API Service — Communicates with Cobalt API to bypass custom backend
 */
import * as FileSystem from 'expo-file-system/legacy';
import { AnalyzeResponse, FormatInfo, detectPlatform } from '../constants';

const COBALT_API = 'https://api.cobalt.tools/api/json';

/**
 * Mock analyze URL — Since Cobalt doesn't provide a pre-download formats list
 * in the same way, we detect the platform locally and give the user
 * standard format choices (Video/Audio).
 */
export async function analyzeURL(url: string): Promise<AnalyzeResponse> {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const platform = detectPlatform(normalizedUrl);
  
  // Fake the analyze response so the UI still works exactly as before
  return {
    platform: platform?.id || 'unknown',
    platform_name: platform?.name || 'Unknown',
    platform_color: platform?.color || '#636366',
    title: 'Ready to Download', // Cobalt API doesn't give us a title before download
    formats: [
      {
        format_id: 'video_best',
        label: 'Best Quality Video',
        type: 'video',
        quality: 'Max',
        extension: 'mp4',
        estimated_size: 'Unknown',
        estimated_size_bytes: 0
      },
      {
        format_id: 'audio_only',
        label: 'Audio Only',
        type: 'audio',
        quality: 'Best',
        extension: 'mp3',
        estimated_size: 'Unknown',
        estimated_size_bytes: 0
      }
    ]
  };
}

/**
 * Download media — Asks Cobalt for the direct link, then downloads it native via expo-file-system
 */
export async function downloadMedia(
  url: string,
  formatId: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const isAudioOnly = formatId === 'audio_only';

  // 1. Ask Cobalt for the direct media URL
  const cobaltRes = await fetch(COBALT_API, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Cobalt public instances sometimes require basic user agents to prevent simple scraping
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      url: normalizedUrl,
      vQuality: 'max',
      isAudioOnly: isAudioOnly,
      isNoTTWatermark: true, // Removes TikTok watermark!
    })
  });

  const data = await cobaltRes.json();

  if (data.status === 'error') {
    throw new Error(data.text || 'Cobalt API failed to process this video.');
  }

  let directUrl = data.url;

  // Handle 'picker' status (e.g. Instagram carousels with multiple items)
  if (data.status === 'picker' && data.picker && data.picker.length > 0) {
    directUrl = data.picker[0].url;
  }

  if (!directUrl) {
    throw new Error('Failed to extract a valid download link from Cobalt.');
  }

  // 2. Download from the direct URL using expo-file-system
  const ext = isAudioOnly ? 'mp3' : 'mp4';
  const filename = `grabvid_${Date.now()}.${ext}`;
  const filePath = FileSystem.documentDirectory + filename;

  const downloadResumable = FileSystem.createDownloadResumable(
    directUrl,
    filePath,
    {},
    (downloadProgress) => {
      if (downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress(Math.min(progress, 1));
      }
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Native download failed — no file was received.');
  }

  // Ensure progress hits 100%
  onProgress(1);
  return result.uri;
}
