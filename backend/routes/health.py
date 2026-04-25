"""
Health check route.
"""
import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    cookies_file = os.getenv("COOKIES_FILE")
    cookies_loaded = bool(cookies_file and os.path.exists(cookies_file))
    cookies_size = 0
    if cookies_loaded:
        cookies_size = os.path.getsize(cookies_file)

    return {
        "status": "healthy",
        "service": "grabvid-api",
        "version": "1.0.0",
        "cookies_loaded": cookies_loaded,
        "cookies_size_bytes": cookies_size,
        "env_youtube_cookies": bool(os.getenv("YOUTUBE_COOKIES_BASE64")),
        "env_instagram_cookies": bool(os.getenv("INSTAGRAM_COOKIES_BASE64")),
        "env_snapchat_cookies": bool(os.getenv("SNAPCHAT_COOKIES_BASE64")),
        "env_tiktok_cookies": bool(os.getenv("TIKTOK_COOKIES_BASE64")),
    }
