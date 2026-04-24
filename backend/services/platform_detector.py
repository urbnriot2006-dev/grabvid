"""
Platform detection service.
Maps URLs to their corresponding platform.
"""
import re
from models.schemas import Platform


# Domain to platform mapping patterns
PLATFORM_PATTERNS = {
    Platform.YOUTUBE: [
        r"(?:www\.)?youtube\.com",
        r"youtu\.be",
        r"m\.youtube\.com",
        r"music\.youtube\.com",
    ],
    Platform.INSTAGRAM: [
        r"(?:www\.)?instagram\.com",
        r"instagr\.am",
    ],
    Platform.TIKTOK: [
        r"(?:www\.)?tiktok\.com",
        r"vm\.tiktok\.com",
        r"vt\.tiktok\.com",
    ],
    Platform.TWITTER: [
        r"(?:www\.)?twitter\.com",
        r"(?:www\.)?x\.com",
        r"t\.co",
    ],
    Platform.FACEBOOK: [
        r"(?:www\.)?facebook\.com",
        r"fb\.watch",
        r"fb\.com",
        r"m\.facebook\.com",
        r"web\.facebook\.com",
    ],
    Platform.VIMEO: [
        r"(?:www\.)?vimeo\.com",
        r"player\.vimeo\.com",
    ],
    Platform.SOUNDCLOUD: [
        r"(?:www\.)?soundcloud\.com",
        r"m\.soundcloud\.com",
    ],
    Platform.PINTEREST: [
        r"(?:www\.)?pinterest\.com",
        r"pin\.it",
        r"(?:www\.)?pinterest\.\w{2,3}",
    ],
    Platform.REDDIT: [
        r"(?:www\.)?reddit\.com",
        r"redd\.it",
        r"old\.reddit\.com",
        r"new\.reddit\.com",
        r"v\.redd\.it",
        r"i\.redd\.it",
    ],
    Platform.TWITCH: [
        r"(?:www\.)?twitch\.tv",
        r"clips\.twitch\.tv",
        r"m\.twitch\.tv",
    ],
    Platform.SNAPCHAT: [
        r"(?:www\.)?snapchat\.com",
        r"story\.snapchat\.com",
        r"t\.snapchat\.com",
    ],
}


def detect_platform(url: str) -> Platform:
    """
    Detect the platform from a given URL based on domain matching.
    
    Args:
        url: The URL to analyze
        
    Returns:
        Platform enum value, or Platform.UNKNOWN if not recognized
    """
    # Normalize the URL
    url_lower = url.lower().strip()
    
    # Remove protocol prefix for domain matching
    domain_part = url_lower
    if "://" in domain_part:
        domain_part = domain_part.split("://", 1)[1]
    
    # Remove path and query
    domain_part = domain_part.split("/")[0]
    domain_part = domain_part.split("?")[0]
    domain_part = domain_part.split("#")[0]
    
    for platform, patterns in PLATFORM_PATTERNS.items():
        for pattern in patterns:
            if re.match(pattern, domain_part):
                return platform
    
    return Platform.UNKNOWN


def get_platform_domains(platform: Platform) -> list[str]:
    """Get the list of domain patterns for a platform."""
    return PLATFORM_PATTERNS.get(platform, [])
