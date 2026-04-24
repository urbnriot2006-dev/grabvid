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
    On startup, decode YOUTUBE_COOKIES_BASE64 env var into a cookies.txt file.
    This allows YouTube authentication without storing cookies in the repo.
    """
    cookies_b64 = os.getenv("YOUTUBE_COOKIES_BASE64")
    if cookies_b64:
        try:
            cookies_data = base64.b64decode(cookies_b64)
            cookies_path = "/tmp/cookies.txt"
            with open(cookies_path, "wb") as f:
                f.write(cookies_data)
            os.environ["COOKIES_FILE"] = cookies_path
            logger.info(f"YouTube cookies loaded successfully ({len(cookies_data)} bytes)")
        except Exception as e:
            logger.error(f"Failed to decode YouTube cookies: {e}")
    else:
        logger.info("No YOUTUBE_COOKIES_BASE64 env var set — YouTube may block some requests")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
