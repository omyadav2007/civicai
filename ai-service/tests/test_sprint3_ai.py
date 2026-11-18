"""
CivicAI Sprint 3 AI Intelligence Automated Test Suite
Tests Gemini Vision integration, Pydantic response validation, error recovery,
and deterministic municipal department routing under mocked and fallback conditions.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

from app.services.gemini_vision import (
    GeminiVisionService,
    GeminiVisionAnalysisResult,
    CivicCategoryEnum,
    CivicSeverityEnum,
)
from app.services.department_router import (
    DepartmentRouter,
    DepartmentEnum,
    AssignmentMethodEnum,
    AiProcessingStatusEnum,
)
from app.services.classifier import IssueClassifier
from app.services.severity import SeverityEstimator


@pytest.fixture
def department_router():
    return DepartmentRouter()


@pytest.fixture
def dummy_image_bytes():
    # 1x1 dummy PNG bytes
    return b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'


# --------------------------------------------------------------------------
# 1. MOCKED GEMINI VISION VISUAL DEFECT INSPECTIONS (SCENARIOS 1 - 7)
# --------------------------------------------------------------------------

def test_scenario_1_clear_pothole_image(department_router):
    """Scenario 1: Clear pothole image with high confidence."""
    raw = {
        "detected_issue": "POTHOLE",
        "category": "POTHOLE",
        "confidence": 0.94,
        "severity": "HIGH",
        "visual_description": "Large deep cavity on the main asphalt carriageway.",
        "evidence": ["Cracked asphalt boundary", "Deep depression exposing sub-base layer"],
        "severity_reason": "Severe depth creating significant tire blowout risk for vehicles.",
        "recommended_department": "ROAD_MAINTENANCE",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    assert result.category == CivicCategoryEnum.POTHOLE
    assert result.confidence == 0.94

    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "ROAD_MAINTENANCE"
    assert routing["assignment_method"] == "AI_AUTO"
    assert routing["requires_human_review"] is False
    assert routing["routing_case"] == "CASE_A_HIGH_CONFIDENCE"


def test_scenario_2_garbage_accumulation_image(department_router):
    """Scenario 2: Garbage accumulation photograph."""
    raw = {
        "detected_issue": "GARBAGE",
        "category": "GARBAGE",
        "confidence": 0.91,
        "severity": "MEDIUM",
        "visual_description": "Overflowing public dumpster with uncollected waste piles on pavement.",
        "evidence": ["Full green municipal bin", "Scattered plastic and organic waste"],
        "severity_reason": "Sanitation risk and localized obstruction of pedestrian footpath.",
        "recommended_department": "SANITATION",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "SANITATION"
    assert routing["assignment_method"] == "AI_AUTO"


def test_scenario_3_water_leakage_image(department_router):
    """Scenario 3: Potable water leakage photograph."""
    raw = {
        "detected_issue": "WATER_LEAKAGE",
        "category": "WATER_LEAKAGE",
        "confidence": 0.89,
        "severity": "HIGH",
        "visual_description": "Underground potable supply line fractured with potable water gushing onto the road.",
        "evidence": ["Water stream erupting from broken pavement", "Clean water pooling"],
        "severity_reason": "Continuous potable resource loss and road foundation erosion.",
        "recommended_department": "WATER_SUPPLY",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "WATER_SUPPLY"
    assert routing["assignment_method"] == "AI_AUTO"


def test_scenario_4_blocked_drainage_image(department_router):
    """Scenario 4: Blocked drainage photograph."""
    raw = {
        "detected_issue": "DRAINAGE",
        "category": "DRAINAGE",
        "confidence": 0.88,
        "severity": "MEDIUM",
        "visual_description": "Stormwater culvert choked with plastic silt and stagnant black water.",
        "evidence": ["Concrete drain mouth choked with debris", "Dark stagnant water"],
        "severity_reason": "Monsoon overflow hazard and vector breeding risk.",
        "recommended_department": "DRAINAGE",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "DRAINAGE"
    assert routing["assignment_method"] == "AI_AUTO"


def test_scenario_5_broken_streetlight_image(department_router):
    """Scenario 5: Broken streetlight photograph."""
    raw = {
        "detected_issue": "STREETLIGHT",
        "category": "STREETLIGHT",
        "confidence": 0.95,
        "severity": "LOW",
        "visual_description": "Metal street lighting pole with shattered luminaire fixture.",
        "evidence": ["Bent lamp post arm", "Broken glass fixture"],
        "severity_reason": "Nighttime pedestrian visibility reduction.",
        "recommended_department": "ELECTRICITY",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "ELECTRICITY"
    assert routing["assignment_method"] == "AI_AUTO"


def test_scenario_6_road_damage_image(department_router):
    """Scenario 6: Road surface structural damage."""
    raw = {
        "detected_issue": "ROAD_DAMAGE",
        "category": "ROAD_DAMAGE",
        "confidence": 0.87,
        "severity": "MEDIUM",
        "visual_description": "Extensive crocodile cracking and lane subsidence on arterial road.",
        "evidence": ["Fissured asphalt surface", "Uneven road gradient"],
        "severity_reason": "Progressive structural degradation of asphalt pavement.",
        "recommended_department": "ROAD_MAINTENANCE",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "ROAD_MAINTENANCE"
    assert routing["assignment_method"] == "AI_AUTO"


def test_scenario_7_unrelated_image(department_router):
    """Scenario 7: Unrelated photograph (e.g. pet or domestic photo)."""
    raw = {
        "detected_issue": "OTHER",
        "category": "OTHER",
        "confidence": 0.92,
        "severity": "LOW",
        "visual_description": "Photograph depicts an indoor domestic pet with no observable municipal defect.",
        "evidence": ["Indoor domestic setting", "Absence of civic infrastructure"],
        "severity_reason": "No public safety or municipal infrastructure hazard detected.",
        "recommended_department": "PUBLIC_WORKS",
        "requires_human_review": True,
        "uncertainty_reason": "Image lacks recognizable civic infrastructure defects.",
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(result.category.value, result.confidence, source="GEMINI")
    assert routing["department"] == "PUBLIC_WORKS"
    assert routing["requires_human_review"] is True
    assert routing["routing_case"] == "CASE_C_OTHER"


# --------------------------------------------------------------------------
# 2. EDGE CASES & ERROR RECOVERY (SCENARIOS 8 - 14)
# --------------------------------------------------------------------------

def test_scenario_8_blurry_image(department_router):
    """Scenario 8: Blurry / degraded photograph."""
    raw = {
        "detected_issue": "POTHOLE",
        "category": "POTHOLE",
        "confidence": 0.48,
        "severity": "LOW",
        "visual_description": "Out-of-focus image showing dark patch, possibly a road surface defect.",
        "evidence": ["Blurry dark contour"],
        "severity_reason": "Uncertain defect severity due to camera motion blur.",
        "recommended_department": "ROAD_MAINTENANCE",
        "requires_human_review": True,
        "uncertainty_reason": "Motion blur and low contrast prevent definitive classification.",
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    routing = department_router.route_department(
        result.category.value,
        result.confidence,
        source="GEMINI",
        uncertainty_reason=result.uncertainty_reason
    )
    # Always assigns department even when blurry, but flags for review
    assert routing["department"] == "ROAD_MAINTENANCE"
    assert routing["requires_human_review"] is True
    assert routing["routing_case"] == "CASE_B_MODERATE_CONFIDENCE"


def test_scenario_9_invalid_gemini_json_handling():
    """Scenario 9: Model returns invalid or malformed JSON."""
    service = GeminiVisionService()
    # Mock client generate_content returning unparseable text
    mock_resp = MagicMock()
    mock_resp.text = "NOT_A_JSON_STRING { broken: true"

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_resp
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Title", "Desc")
    assert result is None  # Service handles error gracefully and returns None for fallback


def test_scenario_10_gemini_timeout():
    """Scenario 10: Gemini API network timeout."""
    service = GeminiVisionService(sleep_fn=lambda s: None)
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = TimeoutError("Request timed out after 30s")
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Title", "Desc")
    assert result is None


def test_scenario_11_gemini_rate_limit():
    """Scenario 11: Gemini API rate limit / 429 quota exhaustion."""
    service = GeminiVisionService(sleep_fn=lambda s: None)
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception("429 ResourceExhausted: Quota exceeded")
    service.client = mock_client

    result = service.analyze_image(b"dummy", "image/jpeg", "Title", "Desc")
    assert result is None


def test_scenario_12_missing_api_key():
    """Scenario 12: Gemini API key is missing or unconfigured."""
    with patch.dict("os.environ", {"GEMINI_API_KEY": "YOUR_GEMINI_API_KEY"}):
        service = GeminiVisionService()
        assert service.is_available() is False
        assert service.analyze_image(b"dummy", "image/jpeg", "T", "D") is None


def test_scenario_13_low_confidence_boundary(department_router):
    """Scenario 13: Category confidence below 0.85 threshold (Case B)."""
    routing = department_router.route_department("POTHOLE", 0.68, source="GEMINI")
    assert routing["department"] == "ROAD_MAINTENANCE"
    assert routing["assignment_method"] == "AI_AUTO"
    assert routing["requires_human_review"] is True
    assert routing["routing_case"] == "CASE_B_MODERATE_CONFIDENCE"


def test_scenario_14_invalid_department_recommendation_overridden(department_router):
    """Scenario 14: Department name override check."""
    # Canonical mapping strictly overrides arbitrary strings
    assert department_router.get_department_for_category("POTHOLE") == "ROAD_MAINTENANCE"
    assert department_router.get_department_for_category("INVALID_CAT") == "PUBLIC_WORKS"
    assert department_router.get_department_for_category("OTHER") == "PUBLIC_WORKS"


# --------------------------------------------------------------------------
# 3. ROUTING POLICY: ALWAYS ASSIGN TO VALID DEPARTMENTS
# --------------------------------------------------------------------------

def test_always_assign_policy_all_categories(department_router):
    """Tests that every category maps to a valid non-null Prisma Department."""
    valid_depts = {
        "ROAD_MAINTENANCE",
        "SANITATION",
        "WATER_SUPPLY",
        "DRAINAGE",
        "ELECTRICITY",
        "PUBLIC_WORKS",
    }
    test_categories = [
        "POTHOLE", "ROAD_DAMAGE", "GARBAGE", "WATER_LEAKAGE",
        "DRAINAGE", "STREETLIGHT", "OTHER", "UNKNOWN_DEFECT"
    ]

    for cat in test_categories:
        routing = department_router.route_department(cat, 0.90)
        assert routing["department"] in valid_depts
        assert routing["department"] is not None
        assert routing["department"] != ""
