#!/bin/bash
set -e

echo "=== GrabVid Backend Starting ==="

# 1. Upgrade yt-dlp to the absolute latest version on every boot
echo "Upgrading yt-dlp to latest..."
pip install --no-cache-dir --upgrade yt-dlp 2>&1 | tail -1
echo "yt-dlp version: $(yt-dlp --version)"

# 2. Start cron daemon in the background (handles 6-hourly yt-dlp updates)
echo "Starting cron for periodic yt-dlp updates..."
cron

# 3. Launch the FastAPI server
echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
