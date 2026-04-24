# GrabVid

A cross-platform mobile media downloader app built with **Expo/React Native** and a **Python FastAPI** backend.

> **One codebase → iOS + Android** — develop on Windows, build for both platforms via EAS.

## Project Structure

```
grabvid/
├── backend/                    # Python FastAPI server
│   ├── main.py                 # App entry point
│   ├── Dockerfile              # Production container
│   ├── requirements.txt
│   ├── models/schemas.py       # Pydantic models
│   ├── routes/
│   │   ├── analyze.py          # POST /api/v1/analyze
│   │   ├── download.py         # POST /api/v1/download
│   │   └── health.py           # GET /health
│   └── services/
│       ├── platform_detector.py
│       └── media_extractor.py  # yt-dlp wrapper
│
├── mobile/                     # Expo React Native app
│   ├── app/                    # Expo Router (file-based routing)
│   │   ├── _layout.tsx         # Root layout
│   │   └── (tabs)/
│   │       ├── _layout.tsx     # Tab navigation
│   │       ├── index.tsx       # Download screen
│   │       ├── history.tsx     # History screen
│   │       └── settings.tsx    # Settings screen
│   ├── constants/index.ts      # Theme, platforms, types
│   ├── services/
│   │   ├── api.ts              # Backend API calls
│   │   ├── storage.ts          # SQLite history
│   │   └── fileSaver.ts        # Save to device
│   ├── app.json                # Expo config
│   └── package.json
│
└── README.md
```

## Quick Start

### 1. Backend Server

**Prerequisites:** Python 3.10+, ffmpeg installed

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs → http://localhost:8000/docs

### 2. Mobile App (Expo)

**Prerequisites:** Node.js 18+

```bash
cd mobile
npm install
npx expo start
```

- Press **a** for Android emulator
- Press **w** for web preview
- Scan QR code with **Expo Go** on your phone

### 3. Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
eas build --platform android --profile preview

# Build iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analyze` | Analyze URL → platform info + formats |
| POST | `/api/v1/download` | Download media (streaming response) |
| GET | `/health` | Health check |

## Supported Platforms (10)

| Platform | Formats |
|----------|---------|
| YouTube | MP4 1080p/720p/480p, MP3 |
| Instagram | MP4 HD/SD, JPEG, GIF |
| TikTok | MP4 ±watermark, MP3 |
| X/Twitter | MP4 HD/SD, JPEG, GIF |
| Facebook | MP4 HD/SD, JPEG, GIF |
| Vimeo | MP4 1080p/720p/480p, MP3 |
| SoundCloud | MP3 320/128kbps, WAV, FLAC |
| Pinterest | JPEG original/compressed, MP4 |
| Reddit | MP4 HD/SD, JPEG, GIF |
| Twitch | MP4 1080p/720p/480p, MP3 |

## Configuration

Update the backend URL in:
- `mobile/constants/index.ts` → `API_CONFIG.baseURL`
- For Android emulator: `http://10.0.2.2:8000`
- For iOS simulator: `http://localhost:8000`
- For physical device: use your machine's local IP (e.g., `http://192.168.1.100:8000`)
- For production: your deployed server URL

## Legal

This application is for downloading media you have the right to download. Users are responsible for copyright compliance.

## License

MIT
