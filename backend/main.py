"""
GrabVid Backend API Server
FastAPI application for media analysis and download.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router
from routes.download import router as download_router
from routes.health import router as health_router

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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
