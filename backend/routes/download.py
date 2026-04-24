"""
Media download route.
Accepts a URL and format, streams the downloaded file back to the client.
Supports both POST (JSON body) and GET (query params) for mobile compatibility.
"""
import os
import shutil
import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from models.schemas import DownloadRequest, ErrorResponse
from services.media_extractor import download_media

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/download",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Download failed"},
    },
    summary="Download media (POST)",
    description="Downloads media from the specified URL in the requested format and streams it back.",
)
async def download_post(request: DownloadRequest):
    """Download media via POST with JSON body."""
    return await _do_download(request.url.strip(), request.format_id.strip())


@router.get(
    "/download",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Download failed"},
    },
    summary="Download media (GET)",
    description="Downloads media via GET with query params. Used by mobile apps for progress tracking.",
)
async def download_get(
    url: str = Query(..., description="The media URL to download"),
    format_id: str = Query(..., description="The format ID to download"),
):
    """Download media via GET with query params (for expo-file-system compatibility)."""
    return await _do_download(url.strip(), format_id.strip())


async def _do_download(url: str, format_id: str):
    """Core download logic shared by GET and POST endpoints."""
    if not url or not format_id:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_request", "message": "URL and format_id are required."},
        )
    
    # Ensure URL has a protocol
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    
    try:
        file_path, filename, content_type = await download_media(url, format_id)
    except ValueError as e:
        logger.warning(f"Download failed for {url} format {format_id}: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "download_failed", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected download error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "server_error",
                "message": "Download failed. Please try again later.",
            },
        )
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=500,
            detail={"error": "file_not_found", "message": "Downloaded file was not found."},
        )
    
    file_size = os.path.getsize(file_path)
    temp_dir = os.path.dirname(file_path)
    
    def iterfile():
        """Stream file in chunks and clean up after."""
        try:
            with open(file_path, "rb") as f:
                while chunk := f.read(8192):
                    yield chunk
        finally:
            # Clean up temp directory
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass
    
    return StreamingResponse(
        iterfile(),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(file_size),
            "X-File-Name": filename,
        },
    )
