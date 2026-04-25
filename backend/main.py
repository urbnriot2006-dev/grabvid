"""
GrabVid Backend API Server
FastAPI application for media analysis and download.
"""
import os
import base64
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router
from routes.download import router as download_router
from routes.health import router as health_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="GrabVid API",
    description="Media analysis and download API for GrabVid mobile apps",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(analyze_router, prefix="/api/v1")
app.include_router(download_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """
    On startup, decode multiple cookie env vars into a single cookies.txt file.
    This allows yt-dlp to authenticate across multiple platforms (YouTube, Instagram, etc)
    without storing cookies in the repo.
    """
    platforms = ["YOUTUBE", "INSTAGRAM", "SNAPCHAT", "TIKTOK"]
    cookies_path = "/tmp/cookies.txt"
    
    # Clear any old cookies file
    if os.path.exists(cookies_path):
        os.remove(cookies_path)
        
    combined_cookies_data = b""
    loaded_platforms = []
    
    for platform in platforms:
        env_var = f"{platform}_COOKIES_BASE64"
        cookies_b64 = os.getenv(env_var)
        
        if cookies_b64:
            try:
                cookies_data = base64.b64decode(cookies_b64)
                # Ensure the file starts with the Netscape header if it's the first one,
                # though yt-dlp is usually forgiving if the header is there somewhere.
                if not combined_cookies_data and not cookies_data.startswith(b"# Netscape"):
                    combined_cookies_data += b"# Netscape HTTP Cookie File\n\n"
                    
                combined_cookies_data += cookies_data + b"\n\n"
                loaded_platforms.append(platform)
            except Exception as e:
                logger.error(f"Failed to decode {platform} cookies: {e}")
    
    if combined_cookies_data:
        try:
            with open(cookies_path, "wb") as f:
                f.write(combined_cookies_data)
            os.environ["COOKIES_FILE"] = cookies_path
            logger.info(f"Successfully loaded cookies for: {', '.join(loaded_platforms)} ({len(combined_cookies_data)} bytes)")
        except Exception as e:
            logger.error(f"Failed to write combined cookies file: {e}")
    else:
        logger.info("No cookie env vars set — private videos will fail")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
