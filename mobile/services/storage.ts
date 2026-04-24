/**
 * SQLite-based download history storage using expo-sqlite
 */
import * as SQLite from 'expo-sqlite';
import { DownloadRecord, PlatformId, MediaType } from '../constants';

const DB_NAME = 'grabvid.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS download_history (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        platform TEXT NOT NULL,
        platform_color TEXT NOT NULL,
        format_label TEXT NOT NULL,
        format_type TEXT NOT NULL,
        file_size TEXT NOT NULL,
        download_date INTEGER NOT NULL,
        local_path TEXT
      );
    `);
  }
  return db;
}

/**
 * Add a download record to history
 */
export async function addDownloadRecord(record: DownloadRecord): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO download_history 
     (id, url, title, platform, platform_color, format_label, format_type, file_size, download_date, local_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.url,
      record.title,
      record.platform,
      record.platform_color,
      record.format_label,
      record.format_type,
      record.file_size,
      record.download_date,
      record.local_path || null,
    ]
  );
}

/**
 * Get all download records, most recent first
 */
export async function getDownloadHistory(): Promise<DownloadRecord[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM download_history ORDER BY download_date DESC LIMIT 100'
  );
  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    platform: row.platform as PlatformId,
    platform_color: row.platform_color,
    format_label: row.format_label,
    format_type: row.format_type as MediaType,
    file_size: row.file_size,
    download_date: row.download_date,
    local_path: row.local_path,
  }));
}

/**
 * Delete a single record
 */
export async function deleteDownloadRecord(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM download_history WHERE id = ?', [id]);
}

/**
 * Clear all history
 */
export async function clearDownloadHistory(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM download_history');
}
