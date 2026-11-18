"""
CivicAI Gemini Vision Reliability & Transient Fault Handling Test Suite
Validates:
1. 503 Service Unavailable transient retry & recovery
2. 503 Exhausted retries with clean local fallback engagement
3. 429 Rate Limit / ResourceExhausted adhering to Retry-After header
4. 401 Unauthorized (invalid API key) fast abort without retries
5. 403 Forbidden (permission denied) fast abort without retries
6. 404 Not Found (invalid model name) fast abort without retries
7. Exponential backoff progression and random jitter bounds
8. Sensitive API key and base64 data sanitization in error logs
9. End-to-end full analysis pipeline fallback integration during 503
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from google.genai import errors
from app.main import app
from app.services.gemini_vision import (
    GeminiVisionService,
    GeminiVisionAnalysisResult,
    GeminiErrorCategory,
    classify_gemini_error,
    compute_backoff_delay,
    sanitize_error_message,
    extract_retry_after,
    extract_status_code,
)


@pytest.fixture
def mock_success_response():
    resp = MagicMock()
    resp.text = json.dumps({
        "detected_issue": "POTHOLE",
        "category": "POTHOLE",
        "confidence": 0.95,
        "severity": "HIGH",
        "visual_description": "Deep asphalt cavity in vehicular lane.",
        "evidence": ["Fractured asphalt edges", "Exposed roadway base"],
        "severity_reason": "High vehicular tire damage and accident risk.",
        "recommended_department": "ROAD_MAINTENANCE",
        "requires_human_review": False,
        "uncertainty_reason": None,
    })
    return resp


# ---------------------------------------------------------------------------
# 1. TRANSIENT ERROR RECOVERY & RETRY LOGIC (503 & 429)
# ---------------------------------------------------------------------------

def test_503_transient_recovery(mock_success_response):
    """
    Requirement 1 & 8: Verify that a transient 503 Service Unavailable error
    is retried with backoff and successfully recovers on attempt 2.
    """
    sleep_calls = []
    service = GeminiVisionService(
        max_attempts=3,
        base_delay_seconds=1.0,
        enable_jitter=False,
        sleep_fn=lambda s: sleep_calls.append(s)
    )

    # 503 error on attempt 1, success on attempt 2
    err_503 = errors.ServerError(503, {
        "error": {
            "code": 503,
            "message": "The model is overloaded. Please try again later.",
            "status": "UNAVAILABLE"
        }
    })

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [err_503, mock_success_response]
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Pothole", "Deep road hole")

    # Verification:
    assert result is not None
    assert result.category.value == "POTHOLE"
    assert result.confidence == 0.95
    assert mock_client.models.generate_content.call_count == 2
    assert len(sleep_calls) == 1
    assert sleep_calls[0] == 1.0  # Attempt 1 backoff (non-jittered base = 1.0)


def test_503_exhausted_retries_engages_fallback():
    """
    Requirement 2, 5 & 9: Verify that when 503 errors persist across all max attempts,
    retries are exhausted, Gemini is NOT claimed to have succeeded, and None is returned.
    """
    sleep_calls = []
    service = GeminiVisionService(
        max_attempts=3,
        base_delay_seconds=1.0,
        enable_jitter=False,
        sleep_fn=lambda s: sleep_calls.append(s)
    )

    err_503 = errors.ServerError(503, {
        "error": {
            "code": 503,
            "message": "The model is overloaded. Please try again later.",
            "status": "UNAVAILABLE"
        }
    })

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = err_503
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Pothole", "Deep road hole")

    # Verification:
    assert result is None  # Requirement 9: Never claim success when failed
    assert mock_client.models.generate_content.call_count == 3  # Tried all 3 attempts
    assert len(sleep_calls) == 2  # Slept after attempt 1 and attempt 2
    assert sleep_calls[0] == 1.0  # Attempt 1 backoff: 1.0 * 2^0
    assert sleep_calls[1] == 2.0  # Attempt 2 backoff: 1.0 * 2^1


def test_429_rate_limit_with_retry_after_header(mock_success_response):
    """
    Requirement 3 & 8: Verify that 429 ResourceExhausted respects the API's
    Retry-After header when provided in response headers.
    """
    sleep_calls = []
    service = GeminiVisionService(
        max_attempts=3,
        base_delay_seconds=1.0,
        enable_jitter=False,
        sleep_fn=lambda s: sleep_calls.append(s)
    )

    mock_http_resp = MagicMock()
    mock_http_resp.headers = {"Retry-After": "4.5"}

    err_429 = errors.ClientError(
        429,
        {"error": {"code": 429, "message": "Resource has been exhausted.", "status": "RESOURCE_EXHAUSTED"}},
        response=mock_http_resp
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [err_429, mock_success_response]
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Pothole", "Deep road hole")

    # Verification:
    assert result is not None
    assert result.category.value == "POTHOLE"
    assert mock_client.models.generate_content.call_count == 2
    assert len(sleep_calls) == 1
    # Strictly respected 4.5s from Retry-After header
    assert sleep_calls[0] == 4.5


# ---------------------------------------------------------------------------
# 2. PERMANENT ERROR FAST-ABORT (401, 403, 404)
# ---------------------------------------------------------------------------

def test_401_invalid_api_key_aborts_immediately():
    """
    Requirement 4 & 8: Permanent error 401 Unauthorized (invalid API key)
    must abort retries immediately without sleeping or looping.
    """
    sleep_calls = []
    service = GeminiVisionService(
        max_attempts=3,
        sleep_fn=lambda s: sleep_calls.append(s)
    )

    err_401 = errors.ClientError(401, {
        "error": {
            "code": 401,
            "message": "API key not valid. Please pass a valid API key.",
            "status": "UNAUTHENTICATED"
        }
    })

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = err_401
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Title", "Desc")

    # Verification:
    assert result is None
    assert mock_client.models.generate_content.call_count == 1  # Aborted after 1st attempt!
    assert len(sleep_calls) == 0  # No backoff delay attempted


def test_403_forbidden_aborts_immediately():
    """
    Requirement 4 & 8: Permanent error 403 Forbidden (permission denied)
    must abort retries immediately without sleeping.
    """
    sleep_calls = []
    service = GeminiVisionService(
        max_attempts=3,
        sleep_fn=lambda s: sleep_calls.append(s)
    )

    err_403 = errors.ClientError(403, {
        "error": {
            "code": 403,
            "message": "Method doesn't allow unregistered callers.",
            "status": "PERMISSION_DENIED"
        }
    })

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = err_403
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Title", "Desc")

    assert result is None
    assert mock_client.models.generate_content.call_count == 1
    assert len(sleep_calls) == 0


def test_404_invalid_model_aborts_immediately():
    """
    Requirement 4 & 8: Permanent error 404 Not Found (e.g. invalid model name)
    must abort retries immediately without sleeping.
    """
    sleep_calls = []
    service = GeminiVisionService(
        max_attempts=3,
        sleep_fn=lambda s: sleep_calls.append(s)
    )

    err_404 = errors.ClientError(404, {
        "error": {
            "code": 404,
            "message": "models/non-existent-model is not found.",
            "status": "NOT_FOUND"
        }
    })

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = err_404
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Title", "Desc")

    assert result is None
    assert mock_client.models.generate_content.call_count == 1
    assert len(sleep_calls) == 0


# ---------------------------------------------------------------------------
# 3. EXPONENTIAL BACKOFF, JITTER, & SENSITIVE LOG SANITIZATION
# ---------------------------------------------------------------------------

def test_exponential_backoff_and_jitter_progression():
    """
    Requirement 1: Test exponential delay formula: base * 2^(attempt - 1)
    and verify that random jitter produces non-identical bounded delays.
    """
    # Non-jittered tests:
    d1 = compute_backoff_delay(attempt=1, base_delay=1.0, max_delay=10.0, jitter=False)
    d2 = compute_backoff_delay(attempt=2, base_delay=1.0, max_delay=10.0, jitter=False)
    d3 = compute_backoff_delay(attempt=3, base_delay=1.0, max_delay=10.0, jitter=False)
    d4 = compute_backoff_delay(attempt=4, base_delay=1.0, max_delay=5.0, jitter=False)

    assert d1 == 1.0
    assert d2 == 2.0
    assert d3 == 4.0
    assert d4 == 5.0  # Capped at max_delay

    # Jittered tests:
    samples = [compute_backoff_delay(attempt=2, base_delay=1.0, max_delay=10.0, jitter=True) for _ in range(10)]
    for val in samples:
        # base=2.0, jitter in [0.1, 1.0] -> range [2.1, 3.0]
        assert 2.0 <= val <= 3.5
    # Confirm variation from random jitter (not all identical)
    assert len(set(samples)) > 1


def test_sensitive_data_sanitization():
    """
    Requirement 6: Verify API keys and image payloads are completely redacted from log messages.
    """
    raw_message = (
        "Call to https://generativelanguage.googleapis.com with key=AIzaSyD3moK3y123456789012345678901234567 "
        "and data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD... failed."
    )
    sanitized = sanitize_error_message(raw_message)

    assert "AIzaSy" not in sanitized
    assert "[REDACTED_API_KEY]" in sanitized
    assert "/9j/4AAQSkZJRg" not in sanitized
    assert "[REDACTED_IMAGE_DATA]" in sanitized


# ---------------------------------------------------------------------------
# 4. END-TO-END FALLBACK INTEGRATION UNDER 503 FAULT
# ---------------------------------------------------------------------------

def test_end_to_end_analyze_with_gemini_503_fallback():
    """
    Requirement 5, 7, 8 & 9: Test that when Gemini Vision experiences persistent 503
    errors during POST /api/v1/analyze, the system cleanly and immediately falls back
    to local NLP + deterministic department assignment with RULE_FALLBACK.
    """
    client = TestClient(app)

    err_503 = errors.ServerError(503, {
        "error": {
            "code": 503,
            "message": "The model is overloaded.",
            "status": "UNAVAILABLE"
        }
    })

    # Mock Gemini client to throw 503
    mock_genai_client = MagicMock()
    mock_genai_client.models.generate_content.side_effect = err_503

    with patch("app.services.gemini_vision.gemini_vision_service.client", mock_genai_client), \
         patch("app.services.gemini_vision.gemini_vision_service.sleep_fn", lambda s: None):

        payload = {
            "title": "Severe pothole on sector 12 main carriageway",
            "description": "Deep asphalt cavity causing major vehicular traffic hazard",
            "category": "POTHOLE",
            "latitude": 28.5355,
            "longitude": 77.3910,
            "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }

        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200

        data = response.json()

        # Classification fallback assertions:
        assert data["classification"]["provider"] == "rule-fallback"
        assert data["classification"]["method"] == "civicai-nlp-rules-v2"
        assert data["classification"]["predicted_category"] == "POTHOLE"

        # Department routing fallback assertions (Always-Assign policy preserved):
        dept_info = data["department_assignment"]
        assert dept_info["department"] == "ROAD_MAINTENANCE"
        assert dept_info["assignment_method"] == "RULE_FALLBACK"
        assert dept_info["processing_status"] == "FALLBACK_COMPLETED"
        assert dept_info["routing_case"] == "CASE_D_FALLBACK"
