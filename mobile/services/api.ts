/**
 * API Service — Communicates with the GrabVid FastAPI backend
 */
import * as FileSystem from 'expo-file-system/legacy';
import { API_CONFIG, AnalyzeResponse, FormatInfo } from '../constants';

const ANALYZE_URL = `${API_CONFIG.baseURL}/api/v1/analyze`;
const DOWNLOAD_URL = `${API_CONFIG.baseURL}/api/v1/download`;

/**
 * Analyze a URL — returns platform info + available formats
 */
export async function analyzeURL(url: string): Promise<AnalyzeResponse> {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const res = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizedUrl }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const msg = errBody?.detail?.message || errBody?.message || `Server error (${res.status})`;
      throw new Error(msg);
    }

    return (await res.json()) as AnalyzeResponse;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Server took too long to respond. Render might be starting up—please try again in a few seconds.');
    }
    if (err.message === 'Network request failed') {
      throw new Error('Network error. Please check your internet connection or the server URL.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Download media — uses expo-file-system for native download with progress
 * Uses GET endpoint with query params (compatible with createDownloadResumable)
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

  // Build the GET download URL with query params
  const downloadUrl = `${DOWNLOAD_URL}?url=${encodeURIComponent(normalizedUrl)}&format_id=${encodeURIComponent(formatId)}`;

  // Generate a filename based on format
  const ext = getExtension(formatId);
  const filename = `grabvid_${Date.now()}.${ext}`;
  const filePath = FileSystem.documentDirectory + filename;

  // Use expo-file-system's createDownloadResumable for native progress tracking
  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    filePath,
    {},
    (downloadProgress) => {
      if (downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress(Math.min(progress, 1));
      }
    },
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Download failed — no file was received.');
    }

    // Check HTTP status code if available
    const statusCode = result.status;
    if (statusCode && statusCode >= 400) {
      const errorContent = await FileSystem.readAsStringAsync(result.uri).catch(() => '');
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      try {
        const errObj = JSON.parse(errorContent);
        throw new Error(errObj?.detail?.message || errObj?.detail || 'Server returned an error.');
      } catch (parseErr: any) {
        if (parseErr.message.includes('Server returned')) throw parseErr;
        throw new Error(`Download failed with status ${statusCode}`);
      }
    }

    // Check file size — if tiny, it's likely an error response, not a real video
    const fileInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
    if (fileInfo.exists && (fileInfo as any).size < 10000) {
      // File under 10KB — probably a JSON error, not a real media file
      const content = await FileSystem.readAsStringAsync(result.uri).catch(() => '');
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      
      // Try to parse as JSON error
      try {
        const errObj = JSON.parse(content);
        throw new Error(errObj?.detail?.message || errObj?.detail || 'Download failed — server returned an error instead of the file.');
      } catch (parseErr: any) {
        if (parseErr.message.includes('Download failed') || parseErr.message.includes('Server')) throw parseErr;
        throw new Error('Download failed — received an invalid file (too small). The server may be busy, please try again.');
      }
    }

    onProgress(1);
    return result.uri;
  } catch (err: any) {
    // Clean up partial file
    await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function getExtension(formatId: string): string {
  if (formatId.includes('mp4') || formatId.includes('video')) return 'mp4';
  if (formatId.includes('mp3') || formatId === 'mp3_audio') return 'mp3';
  if (formatId === 'wav') return 'wav';
  if (formatId === 'flac') return 'flac';
  if (formatId.includes('jpeg') || formatId.includes('jpg')) return 'jpg';
  if (formatId === 'gif') return 'gif';
  return 'mp4';
}
