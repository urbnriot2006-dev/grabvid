"""
URL analysis route.
Accepts a URL, detects the platform, and returns available download formats.
"""
import logging
from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AnalyzeResponse, ErrorResponse
from services.media_extractor import analyze_url

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or unsupported URL"},
        500: {"model": ErrorResponse, "description": "Server error during analysis"},
    },
    summary="Analyze a URL",
    description="Accepts a URL from a supported platform and returns metadata and available download formats.",
)
async def analyze(request: AnalyzeRequest):
    """
    Analyze a URL and return platform info + available formats.
    
    - Detects the platform from the URL domain
    - Extracts metadata (title, thumbnail, duration, author)
    - Returns available download formats with estimated sizes
    """
    url = request.url.strip()
    
    if not url:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_url", "message": "Please provide a valid URL."},
        )
    
    # Ensure URL has a protocol
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    
    try:
        result = await analyze_url(url)
        return result
    except ValueError as e:
        logger.warning(f"Analysis failed for URL: {url} - {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "analysis_failed", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error analyzing URL: {url} - {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "server_error",
                "message": "An unexpected error occurred. Please try again later.",
            },
        )
