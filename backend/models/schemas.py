"""
Pydantic models for API requests and responses.
"""
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from enum import Enum


class MediaType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"


class Platform(str, Enum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    VIMEO = "vimeo"
    SOUNDCLOUD = "soundcloud"
    PINTEREST = "pinterest"
    REDDIT = "reddit"
    TWITCH = "twitch"
    SNAPCHAT = "snapchat"
    UNKNOWN = "unknown"


# Platform display info
PLATFORM_INFO = {
    Platform.YOUTUBE: {
        "name": "YouTube",
        "color": "#FF0000",
        "icon": "play.rectangle.fill",
        "android_icon": "smart_display",
    },
    Platform.INSTAGRAM: {
        "name": "Instagram",
        "color": "#E1306C",
        "icon": "camera.fill",
        "android_icon": "photo_camera",
    },
    Platform.TIKTOK: {
        "name": "TikTok",
        "color": "#00F2EA",
        "icon": "music.note",
        "android_icon": "music_note",
    },
    Platform.TWITTER: {
        "name": "X / Twitter",
        "color": "#1DA1F2",
        "icon": "bubble.left.fill",
        "android_icon": "chat_bubble",
    },
    Platform.FACEBOOK: {
        "name": "Facebook",
        "color": "#1877F2",
        "icon": "person.2.fill",
        "android_icon": "group",
    },
    Platform.VIMEO: {
        "name": "Vimeo",
        "color": "#1AB7EA",
        "icon": "play.circle.fill",
        "android_icon": "play_circle",
    },
    Platform.SOUNDCLOUD: {
        "name": "SoundCloud",
        "color": "#FF5500",
        "icon": "waveform",
        "android_icon": "graphic_eq",
    },
    Platform.PINTEREST: {
        "name": "Pinterest",
        "color": "#E60023",
        "icon": "pin.fill",
        "android_icon": "push_pin",
    },
    Platform.REDDIT: {
        "name": "Reddit",
        "color": "#FF4500",
        "icon": "bubble.left.and.bubble.right.fill",
        "android_icon": "forum",
    },
    Platform.TWITCH: {
        "name": "Twitch",
        "color": "#9146FF",
        "icon": "tv.fill",
        "android_icon": "live_tv",
    },
    Platform.SNAPCHAT: {
        "name": "Snapchat",
        "color": "#FFFC00",
        "icon": "camera.fill",
        "android_icon": "photo_camera",
    },
}


class AnalyzeRequest(BaseModel):
    """Request model for URL analysis."""
    url: str = Field(..., description="The URL to analyze", examples=["https://www.youtube.com/watch?v=dQw4w9WgXcQ"])


class FormatInfo(BaseModel):
    """Available download format information."""
    format_id: str = Field(..., description="Unique format identifier")
    label: str = Field(..., description="Human-readable format label")
    type: MediaType = Field(..., description="Media type (video/audio/image)")
    quality: str = Field(..., description="Quality descriptor")
    extension: str = Field(..., description="File extension")
    estimated_size: str = Field(..., description="Human-readable estimated size")
    estimated_size_bytes: int = Field(0, description="Estimated size in bytes")
    has_watermark: Optional[bool] = Field(None, description="TikTok watermark status")


class AnalyzeResponse(BaseModel):
    """Response model for URL analysis."""
    platform: Platform
    platform_name: str
    platform_color: str
    title: str
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    duration_formatted: Optional[str] = None
    author: Optional[str] = None
    formats: List[FormatInfo]


class DownloadRequest(BaseModel):
    """Request model for media download."""
    url: str = Field(..., description="The URL to download from")
    format_id: str = Field(..., description="Selected format ID")


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    message: str
    platform: Optional[str] = None
