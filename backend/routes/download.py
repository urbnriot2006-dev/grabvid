"""
Media download route.
Accepts a URL and format, streams the downloaded file back to the client.
"""
import os
import shutil
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
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
    summary="Download media",
    description="Downloads media from the specified URL in the requested format and streams it back.",
)
async def download(request: DownloadRequest):
    """
    Download media in the specified format.
    
    - Downloads the media using yt-dlp
    - Streams the file back to the client
    - Cleans up temporary files after streaming
    """
    url = request.url.strip()
    format_id = request.format_id.strip()
    
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
