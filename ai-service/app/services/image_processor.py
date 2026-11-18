"""
Image Processing and Validation Service
Validates image files by inspecting binary magic numbers (JPEG, PNG, WebP),
enforces a 5MB size limit, safely resolves paths across Windows and Unix platforms,
and prevents malformed/missing payloads from silently entering the vision pipeline.
"""

import os
import re
import base64
import logging
from enum import Enum
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger("civicai.image_processor")

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 Megabytes


class ImageValidationStatus(str, Enum):
    VALID = "VALID"
    MISSING = "MISSING"
    CORRUPT_OR_UNSUPPORTED = "CORRUPT_OR_UNSUPPORTED"
    EXCEEDS_SIZE_LIMIT = "EXCEEDS_SIZE_LIMIT"


class ImageInspectionResult:
    def __init__(
        self,
        image_bytes: Optional[bytes],
        mime_type: str,
        status: ImageValidationStatus,
        error_message: Optional[str] = None,
        source_description: str = "none"
    ):
        self.image_bytes = image_bytes
        self.mime_type = mime_type
        self.status = status
        self.error_message = error_message
        self.source_description = source_description

    @property
    def is_valid(self) -> bool:
        return self.status == ImageValidationStatus.VALID and self.image_bytes is not None


def inspect_image_bytes(data: bytes) -> Tuple[bool, ImageValidationStatus, str, Optional[str]]:
    """
    Validates actual binary image content using magic numbers (not trusting filenames or headers).
    Supported formats: JPEG/JPG, PNG, WebP. Max size: 5MB.
    """
    if not data or len(data) == 0:
        return False, ImageValidationStatus.MISSING, "", "Image payload is empty (0 bytes)."

    if len(data) > MAX_IMAGE_SIZE_BYTES:
        return (
            False,
            ImageValidationStatus.EXCEEDS_SIZE_LIMIT,
            "",
            f"Image payload size ({len(data)} bytes) exceeds the maximum allowed limit of {MAX_IMAGE_SIZE_BYTES} bytes (5MB)."
        )

    # JPEG magic bytes: FF D8 FF
    if data.startswith(b"\xff\xd8\xff"):
        return True, ImageValidationStatus.VALID, "image/jpeg", None

    # PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True, ImageValidationStatus.VALID, "image/png", None

    # WebP magic bytes: RIFF....WEBP
    if len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return True, ImageValidationStatus.VALID, "image/webp", None

    return (
        False,
        ImageValidationStatus.CORRUPT_OR_UNSUPPORTED,
        "",
        "Unsupported or corrupt image content. Only valid JPEG, PNG, and WebP binary formats are accepted."
    )


def resolve_image_path(raw_path: str) -> Optional[Path]:
    """
    Robust cross-platform path resolution.
    Handles Windows backslashes, Unix paths, relative URLs (/uploads/...), and project root relative paths.
    Never assumes image exists in the current working directory.
    """
    if not raw_path or not raw_path.strip():
        return None

    cleaned_path = raw_path.strip().replace("\\", "/")
    filename = Path(cleaned_path).name

    # Determine potential discovery anchors
    current_file_dir = Path(__file__).resolve().parent  # app/services
    ai_service_root = current_file_dir.parent.parent    # ai-service
    project_root = ai_service_root.parent               # sem5Project
    backend_uploads = project_root / "backend" / "uploads"
    cwd = Path.cwd().resolve()

    candidates = [
        Path(cleaned_path),                                             # Direct path
        cwd / cleaned_path,                                             # Relative to cwd
        ai_service_root / cleaned_path,                                 # Relative to ai-service
        project_root / cleaned_path,                                    # Relative to project root
        project_root / "backend" / cleaned_path.lstrip("/"),            # Relative to backend/
        backend_uploads / filename,                                     # Filename in backend/uploads
        project_root / "uploads" / filename,                            # Filename in root uploads
    ]

    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if resolved.exists() and resolved.is_file() and resolved.stat().st_size > 0:
                return resolved
        except Exception:
            continue

    return None


def load_and_validate_image(
    image_base64: Optional[str] = None,
    image_path: Optional[str] = None
) -> ImageInspectionResult:
    """
    Unified entry point for loading and validating image data from either Base64 or disk path.
    Guarantees that corrupt or missing images never silently enter the vision pipeline.
    """
    # 1. Prioritize Base64 payload if provided
    if image_base64 and image_base64.strip():
        raw_b64 = image_base64.strip()
        # Strip Data URI prefix if present (e.g. 'data:image/jpeg;base64,....')
        if "," in raw_b64 and "base64" in raw_b64[:60].lower():
            raw_b64 = raw_b64.split(",", 1)[1]

        try:
            decoded_bytes = base64.b64decode(raw_b64, validate=True)
            is_valid, status, mime, err = inspect_image_bytes(decoded_bytes)
            if is_valid:
                return ImageInspectionResult(
                    image_bytes=decoded_bytes,
                    mime_type=mime,
                    status=status,
                    source_description=f"base64 ({len(decoded_bytes)} bytes, {mime})"
                )
            else:
                return ImageInspectionResult(
                    image_bytes=None,
                    mime_type="",
                    status=status,
                    error_message=err,
                    source_description="base64 (corrupt or invalid)"
                )
        except Exception as e:
            logger.warning("[ImageProcessor] Base64 decoding failed: %s", str(e))
            return ImageInspectionResult(
                image_bytes=None,
                mime_type="",
                status=ImageValidationStatus.CORRUPT_OR_UNSUPPORTED,
                error_message=f"Failed to decode Base64 payload: {str(e)}",
                source_description="base64 (decode failure)"
            )

    # 2. Resolve image from file path if provided
    if image_path and image_path.strip():
        resolved_path = resolve_image_path(image_path)
        if resolved_path:
            try:
                file_bytes = resolved_path.read_bytes()
                is_valid, status, mime, err = inspect_image_bytes(file_bytes)
                if is_valid:
                    return ImageInspectionResult(
                        image_bytes=file_bytes,
                        mime_type=mime,
                        status=status,
                        source_description=f"file '{resolved_path.name}' ({len(file_bytes)} bytes, {mime})"
                    )
                else:
                    return ImageInspectionResult(
                        image_bytes=None,
                        mime_type="",
                        status=status,
                        error_message=err,
                        source_description=f"file '{resolved_path.name}' (content invalid)"
                    )
            except Exception as e:
                logger.warning("[ImageProcessor] Error reading resolved path '%s': %s", resolved_path, str(e))
                return ImageInspectionResult(
                    image_bytes=None,
                    mime_type="",
                    status=ImageValidationStatus.CORRUPT_OR_UNSUPPORTED,
                    error_message=f"Error reading image file: {str(e)}",
                    source_description=f"file '{image_path}'"
                )
        else:
            return ImageInspectionResult(
                image_bytes=None,
                mime_type="",
                status=ImageValidationStatus.MISSING,
                error_message=f"Image file path '{image_path}' could not be found or resolved on server.",
                source_description=f"file '{image_path}' (unresolved)"
            )

    # 3. Neither Base64 nor Path provided
    return ImageInspectionResult(
        image_bytes=None,
        mime_type="",
        status=ImageValidationStatus.MISSING,
        error_message="No image provided; text-only complaint submission.",
        source_description="none"
    )
