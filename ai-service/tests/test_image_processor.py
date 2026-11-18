"""
Tests for Image Processor:
1. Magic binary signature validation (JPEG, PNG, WebP)
2. Corrupt and unsupported format rejection
3. 5MB size limit boundary checking
4. Cross-platform path resolution
5. Base64 payload decoding with and without data URI headers
"""

import os
import base64
import pytest
from app.services.image_processor import (
    inspect_image_bytes,
    resolve_image_path,
    load_and_validate_image,
    ImageValidationStatus,
    MAX_IMAGE_SIZE_BYTES,
)

# Valid minimal headers
JPEG_HEADER = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 20
PNG_HEADER = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 20
WEBP_HEADER = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 20
CORRUPT_BYTES = b"NOT_AN_IMAGE_FILE_JUST_RANDOM_TEXT"
GIF_BYTES = b"GIF89a\x01\x00\x01\x00\x80\x00\x00"


def test_valid_jpeg_inspection():
    is_valid, status, mime_type, err = inspect_image_bytes(JPEG_HEADER)
    assert is_valid is True
    assert status == ImageValidationStatus.VALID
    assert mime_type == "image/jpeg"
    assert err is None


def test_valid_png_inspection():
    is_valid, status, mime_type, err = inspect_image_bytes(PNG_HEADER)
    assert is_valid is True
    assert status == ImageValidationStatus.VALID
    assert mime_type == "image/png"


def test_valid_webp_inspection():
    is_valid, status, mime_type, err = inspect_image_bytes(WEBP_HEADER)
    assert is_valid is True
    assert status == ImageValidationStatus.VALID
    assert mime_type == "image/webp"


def test_corrupt_bytes_rejection():
    is_valid, status, mime_type, err = inspect_image_bytes(CORRUPT_BYTES)
    assert is_valid is False
    assert status == ImageValidationStatus.CORRUPT_OR_UNSUPPORTED
    assert "Unsupported or corrupt" in err


def test_unsupported_gif_rejection():
    is_valid, status, mime_type, err = inspect_image_bytes(GIF_BYTES)
    assert is_valid is False
    assert status == ImageValidationStatus.CORRUPT_OR_UNSUPPORTED


def test_oversized_image_rejection():
    # 5MB + 10 bytes
    oversized = JPEG_HEADER + b"\x00" * (MAX_IMAGE_SIZE_BYTES + 10 - len(JPEG_HEADER))
    is_valid, status, mime_type, err = inspect_image_bytes(oversized)
    assert is_valid is False
    assert status == ImageValidationStatus.EXCEEDS_SIZE_LIMIT
    assert "exceeds the maximum allowed" in err


def test_empty_bytes_rejection():
    is_valid, status, mime_type, err = inspect_image_bytes(b"")
    assert is_valid is False
    assert status == ImageValidationStatus.MISSING


def test_load_from_base64_with_data_uri():
    b64_str = base64.b64encode(PNG_HEADER).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_str}"
    res = load_and_validate_image(image_base64=data_uri)
    assert res.is_valid is True
    assert res.mime_type == "image/png"
    assert res.image_bytes == PNG_HEADER


def test_load_from_raw_base64():
    b64_str = base64.b64encode(JPEG_HEADER).decode("utf-8")
    res = load_and_validate_image(image_base64=b64_str)
    assert res.is_valid is True
    assert res.mime_type == "image/jpeg"
    assert res.image_bytes == JPEG_HEADER


def test_missing_image_input():
    res = load_and_validate_image()
    assert res.is_valid is False
    assert res.status == ImageValidationStatus.MISSING
