/**
 * API Service — Communicates with the GrabVid FastAPI backend
 */
import * as FileSystem from 'expo-file-system';
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
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Download media — streams file to local filesystem with progress
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

  // We need to POST to the download endpoint but expo-file-system's
  // createDownloadResumable only supports GET. So we use a two-step approach:
  // 1. POST to get the download, and capture the response as a blob
  // 2. Write to file system

  const res = await fetch(DOWNLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: normalizedUrl, format_id: formatId }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.detail?.message || `Download failed (${res.status})`);
  }

  // Get filename from headers
  const filename = res.headers.get('X-File-Name')
    || extractFilename(res.headers.get('Content-Disposition'))
    || `download_${Date.now()}.mp4`;

  const contentLength = parseInt(res.headers.get('Content-Length') || '0', 10);

  // Read as blob and write to file
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Download stream unavailable');

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (contentLength > 0) {
        onProgress(Math.min(received / contentLength, 1));
      }
    }
  }

  // Combine chunks into single array
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const fullArray = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    fullArray.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to base64 and write to file
  const base64 = uint8ArrayToBase64(fullArray);
  const filePath = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  onProgress(1);
  return filePath;
}

/**
 * Alternative download using FileSystem.createDownloadResumable
 * (works for GET-based download endpoints)
 */
export async function downloadMediaAlt(
  downloadUrl: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  const filename = `download_${Date.now()}.mp4`;
  const filePath = FileSystem.documentDirectory + filename;

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    filePath,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress(Math.min(progress, 1));
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) throw new Error('Download failed');

  onProgress(1);
  return result.uri;
}

// ─── Helpers ─────────────────────────────────────────────────

function extractFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?(.+?)"?$/);
  return match ? match[1] : null;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
