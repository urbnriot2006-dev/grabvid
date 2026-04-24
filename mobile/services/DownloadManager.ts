/**
 * DownloadManager — Production-grade download & gallery save service.
 *
 * Uses react-native-blob-util for raw HTTP streaming (real Content-Length,
 * progress tracking, background downloads) and @react-native-camera-roll
 * for reliable gallery/Photos saves on both Android and iOS.
 *
 * ⚠️  These are NATIVE modules — they require an Expo development build.
 *     They will NOT work inside Expo Go.
 */
import ReactNativeBlobUtil from 'react-native-blob-util';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Platform, PermissionsAndroid } from 'react-native';
import { API_CONFIG } from '../constants';

// ─── Types ───────────────────────────────────────────────────

export interface DownloadProgress {
  received: number;
  total: number;
  percent: number;
}

export interface DownloadResult {
  success: boolean;
  path?: string;
  error?: string;
}

// ─── DownloadManager ─────────────────────────────────────────

class DownloadManager {
  private activeTask: any = null;

  // ── Permissions ──────────────────────────────────────────────

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const sdkVersion = Platform.Version;

      if (typeof sdkVersion === 'number' && sdkVersion >= 33) {
        // Android 13+  — granular media permissions
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ]);
        return (
          granted['android.permission.READ_MEDIA_VIDEO'] === 'granted' &&
          granted['android.permission.READ_MEDIA_IMAGES'] === 'granted'
        );
      } else if (typeof sdkVersion === 'number' && sdkVersion >= 29) {
        // Android 10-12 — scoped storage, no explicit permission needed
        return true;
      } else {
        // Android 9 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'GrabVid needs storage access to save downloads.',
            buttonPositive: 'Allow',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    // iOS — permissions handled by CameraRoll at save-time
    return true;
  }

  // ── Main download ────────────────────────────────────────────

  async downloadVideo(
    url: string,
    formatId: string,
    onProgress: (progress: DownloadProgress) => void,
    onComplete: (result: DownloadResult) => void,
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      onComplete({
        success: false,
        error: 'Storage permission denied. Enable it in Settings.',
      });
      return;
    }

    // Build the backend download URL (GET endpoint with query params)
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    const downloadUrl = `${API_CONFIG.baseURL}/api/v1/download?url=${encodeURIComponent(normalizedUrl)}&format_id=${encodeURIComponent(formatId)}`;

    // Determine extension from formatId
    const ext = this.getExtension(formatId);
    const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/grabvid_${Date.now()}.${ext}`;

    try {
      this.activeTask = ReactNativeBlobUtil.config({
        path: tempPath,
        fileCache: true,
        appendExt: ext,
        timeout: 300000, // 5-minute timeout
        indicator: true, // iOS: show network activity indicator
        IOSBackgroundTask: true, // iOS: keep downloading in background
      }).fetch('GET', downloadUrl, {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        Accept: '*/*',
        'Accept-Encoding': 'identity', // Prevent gzip — we need the raw file
        Connection: 'keep-alive',
      });

      // Track progress
      this.activeTask.progress(
        { count: 10 },
        (received: string, total: string) => {
          const r = parseInt(received, 10);
          const t = parseInt(total, 10);
          const percent = t > 0 ? Math.round((r / t) * 100) : 0;
          onProgress({ received: r, total: t, percent });
        },
      );

      const response = await this.activeTask;
      const statusCode = response.info().status;

      // ── Error responses ────────────────────────────────────
      if (statusCode < 200 || statusCode >= 300) {
        // Try to read the JSON error body from the server
        let serverMsg = `Server returned status ${statusCode}`;
        try {
          const body = await ReactNativeBlobUtil.fs.readFile(tempPath, 'utf8');
          const errObj = JSON.parse(body);
          serverMsg =
            errObj?.detail?.message ||
            errObj?.detail ||
            errObj?.message ||
            serverMsg;
        } catch {}
        await this.cleanupFile(tempPath);
        onComplete({ success: false, error: serverMsg });
        return;
      }

      const savedPath = response.path();

      // Verify the file exists
      const fileExists = await ReactNativeBlobUtil.fs.exists(savedPath);
      if (!fileExists) {
        onComplete({ success: false, error: 'Download file not found' });
        return;
      }

      // Verify file size (tiny file = server error JSON, not real media)
      const stat = await ReactNativeBlobUtil.fs.stat(savedPath);
      if (parseInt(String(stat.size), 10) < 1000) {
        await this.cleanupFile(savedPath);
        onComplete({
          success: false,
          error:
            'Downloaded file is too small — may be corrupted or the server returned an error.',
        });
        return;
      }

      // ── Save to gallery ────────────────────────────────────
      await this.saveToGallery(savedPath, ext);

      // Cleanup temp file
      await this.cleanupFile(savedPath);

      onComplete({ success: true, path: savedPath });
    } catch (error: any) {
      await this.cleanupFile(tempPath);

      if (error.message?.includes('cancelled')) {
        onComplete({ success: false, error: 'Download cancelled' });
        return;
      }

      onComplete({
        success: false,
        error: this.getFriendlyError(error),
      });
    }
  }

  // ── Gallery save ─────────────────────────────────────────────

  private async saveToGallery(filePath: string, ext: string): Promise<void> {
    const fileUri =
      Platform.OS === 'ios' ? filePath : `file://${filePath}`;

    const assetType =
      ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif'
        ? 'photo'
        : 'video';

    if (Platform.OS === 'android') {
      try {
        await CameraRoll.saveAsset(fileUri, { type: assetType });
      } catch {
        // Fallback: copy to Downloads folder & trigger media scanner
        const downloadPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/grabvid_${Date.now()}.${ext}`;
        await ReactNativeBlobUtil.fs.cp(filePath, downloadPath);
        await ReactNativeBlobUtil.fs.scanFile([
          { path: downloadPath, mime: this.getMimeType(ext) },
        ]);
      }
    } else {
      // iOS: save to camera roll
      await CameraRoll.saveAsset(fileUri, { type: assetType });
    }
  }

  // ── Cancel ───────────────────────────────────────────────────

  cancelDownload(): void {
    if (this.activeTask) {
      this.activeTask.cancel();
      this.activeTask = null;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async cleanupFile(path: string): Promise<void> {
    try {
      const exists = await ReactNativeBlobUtil.fs.exists(path);
      if (exists) await ReactNativeBlobUtil.fs.unlink(path);
    } catch {}
  }

  private getExtension(formatId: string): string {
    if (formatId.includes('mp4') || formatId.includes('video')) return 'mp4';
    if (formatId.includes('mp3') || formatId === 'mp3_audio') return 'mp3';
    if (formatId === 'wav') return 'wav';
    if (formatId === 'flac') return 'flac';
    if (formatId.includes('jpeg') || formatId.includes('jpg')) return 'jpg';
    if (formatId === 'gif') return 'gif';
    return 'mp4';
  }

  private getMimeType(ext: string): string {
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

  private getFriendlyError(error: any): string {
    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('timeout'))
      return 'Download timed out. Try on a stronger connection.';
    if (msg.includes('network'))
      return 'Network error. Check your internet and try again.';
    if (msg.includes('ssl') || msg.includes('certificate'))
      return 'Secure connection failed. Try again shortly.';
    if (msg.includes('space') || msg.includes('storage'))
      return 'Not enough storage space on your device.';
    return `Download failed: ${error?.message || 'Unknown error'}`;
  }
}

export default new DownloadManager();
