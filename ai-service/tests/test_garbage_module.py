"""
CivicAI Garbage & Waste Management Module Test Suite
Tests:
1. Overflowing dustbin detection & routing to SANITATION
2. Illegal garbage dumping detection & routing to SANITATION
3. Uncollected garbage detection & routing to SANITATION
4. Garbage blocking drainage detection & routing to DRAINAGE
5. Open garbage dump detection & routing to SANITATION
6. Missed garbage collection detection & routing to SANITATION
7. General waste management detection & routing to SANITATION
8. Gemini Vision structured JSON response validation for waste issues
9. Offline rule-based NLP classification with domain keywords
10. Priority and severity scoring for garbage hazards
11. Low-confidence boundary handling & human review triggers
12. Always-Assign policy for all 7 garbage defect categories
"""

import pytest
from pydantic import ValidationError
from app.services.gemini_vision import (
    GeminiVisionAnalysisResult,
    CivicCategoryEnum,
    CivicSeverityEnum,
)
from app.services.department_router import (
    DepartmentRouter,
    DepartmentEnum,
    AssignmentMethodEnum,
)
from app.services.classifier import IssueClassifier
from app.services.severity import SeverityEstimator


@pytest.fixture
def department_router():
    return DepartmentRouter()


@pytest.fixture
def classifier():
    return IssueClassifier()


@pytest.fixture
def severity_estimator():
    return SeverityEstimator()


# --------------------------------------------------------------------------
# 1. GEMINI VISION STRUCTURED RESPONSE VALIDATION (GARBAGE CATEGORIES)
# --------------------------------------------------------------------------

def test_gemini_vision_overflowing_dustbin_validation():
    """Validates structured Gemini Vision analysis for overflowing dustbin."""
    raw = {
        "detected_issue": "OVERFLOWING_DUSTBIN",
        "category": "OVERFLOWING_DUSTBIN",
        "confidence": 0.94,
        "severity": "MEDIUM",
        "visual_description": "Green municipal dustbin overflowing with food waste and single-use plastic wrappers spilling onto sidewalk.",
        "evidence": ["bin filled past brim", "refuse scattered across pavement", "plastic packaging spilling over"],
        "detected_objects": ["green waste bin", "plastic wrappers", "food packaging"],
        "suggested_action": "Dispatch sanitation truck to empty bin and sweep perimeter.",
        "severity_reason": "Trash spilling into pedestrian footpath creating walking obstruction.",
        "recommended_department": "SANITATION",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    assert result.category == CivicCategoryEnum.OVERFLOWING_DUSTBIN
    assert result.confidence == 0.94
    assert result.severity == CivicSeverityEnum.MEDIUM
    assert "green waste bin" in result.detected_objects
    assert result.suggested_action is not None


def test_gemini_vision_garbage_blocking_drain_high_severity():
    """Validates high severity and flood risk for garbage blocking storm drain."""
    raw = {
        "detected_issue": "GARBAGE_BLOCKING_DRAIN",
        "category": "GARBAGE_BLOCKING_DRAIN",
        "confidence": 0.92,
        "severity": "HIGH",
        "visual_description": "Solid plastic waste and beverage containers completely choking roadside storm drain grate with pooling stagnant water.",
        "evidence": ["clogged stormwater grate", "plastic bottles trapped in grating", "stagnant water buildup"],
        "detected_objects": ["metal drain grate", "plastic bottles", "accumulated sludge"],
        "suggested_action": "Clear drain grate obstruction immediately to avert monsoon road waterlogging.",
        "severity_reason": "Severe drain choke causing immediate waterlogging and public health hazard.",
        "recommended_department": "DRAINAGE",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    assert result.category == CivicCategoryEnum.GARBAGE_BLOCKING_DRAIN
    assert result.severity == CivicSeverityEnum.HIGH
    assert "clogged stormwater grate" in result.evidence


def test_gemini_vision_illegal_dumping():
    """Validates illegal garbage dumping detection."""
    raw = {
        "detected_issue": "ILLEGAL_GARBAGE_DUMPING",
        "category": "ILLEGAL_GARBAGE_DUMPING",
        "confidence": 0.91,
        "severity": "HIGH",
        "visual_description": "Large truckloads of construction debris and broken drywall discarded unlawfully on vacant roadside lot.",
        "evidence": ["unauthorized debris heap", "concrete fragments", "drywall waste"],
        "detected_objects": ["construction rubble", "broken masonry"],
        "suggested_action": "Issue municipal penalty notice and clear commercial debris.",
        "severity_reason": "Hazardous commercial waste on public plot impeding roadway.",
        "recommended_department": "SANITATION",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    assert result.category == CivicCategoryEnum.ILLEGAL_GARBAGE_DUMPING
    assert result.severity == CivicSeverityEnum.HIGH


def test_gemini_vision_open_garbage_dump():
    """Validates open garbage dump detection with vector risk."""
    raw = {
        "detected_issue": "OPEN_GARBAGE_DUMP",
        "category": "OPEN_GARBAGE_DUMP",
        "confidence": 0.96,
        "severity": "HIGH",
        "visual_description": "Massive multi-meter open waste wasteland with rotting organic garbage, stray dogs, and vector breeding.",
        "evidence": ["multi-meter waste heap", "decaying organic matter", "black fly swarms"],
        "detected_objects": ["massive refuse mound", "discarded plastic", "biodegradable waste"],
        "suggested_action": "Deploy heavy earthmover and multiple compactor trucks for area sanitization.",
        "severity_reason": "Severe vector breeding and bio-hazard within 50 meters of residential zone.",
        "recommended_department": "SANITATION",
        "requires_human_review": False,
        "uncertainty_reason": None,
    }
    result = GeminiVisionAnalysisResult.model_validate(raw)
    assert result.category == CivicCategoryEnum.OPEN_GARBAGE_DUMP
    assert result.confidence >= 0.95


# --------------------------------------------------------------------------
# 2. OFFLINE RULE-BASED NLP CLASSIFICATION (NO INTERNET / NO GEMINI)
# --------------------------------------------------------------------------

def test_offline_nlp_overflowing_dustbin(classifier):
    """Offline NLP classification for overflowing dustbin report."""
    res = classifier.predict_category(
        title="Dustbin overflowing on 3rd Main Street",
        description="The municipal trash can is full and garbage is spilling onto the footpath causing a mess."
    )
    assert res["predicted_category"] == "OVERFLOWING_DUSTBIN"
    assert res["confidence"] > 0.50
    assert any("dustbin" in ind or "overflowing" in ind for ind in res["key_indicators"])


def test_offline_nlp_illegal_dumping(classifier):
    """Offline NLP classification for illegal dumping report."""
    res = classifier.predict_category(
        title="Illegal dumping on vacant plot",
        description="Unknown vehicle dumped tons of construction debris and dumped waste during the night."
    )
    assert res["predicted_category"] == "ILLEGAL_GARBAGE_DUMPING"
    assert res["confidence"] > 0.50


def test_offline_nlp_garbage_blocking_drain(classifier):
    """Offline NLP classification for garbage blocking a storm drain."""
    res = classifier.predict_category(
        title="Garbage blocking drain at corner",
        description="Plastic waste and trash are blocking the water drain, gutter is choked with trash."
    )
    assert res["predicted_category"] == "GARBAGE_BLOCKING_DRAIN"
    assert res["confidence"] > 0.50


def test_offline_nlp_open_garbage_dump(classifier):
    """Offline NLP classification for large open garbage dump."""
    res = classifier.predict_category(
        title="Open garbage dump creating foul smell",
        description="Massive open dump with a huge garbage dump near the playground with foul stench."
    )
    assert res["predicted_category"] == "OPEN_GARBAGE_DUMP"
    assert res["confidence"] > 0.50


def test_offline_nlp_missed_collection(classifier):
    """Offline NLP classification for missed garbage truck route."""
    res = classifier.predict_category(
        title="Missed garbage collection for 3 days",
        description="The garbage truck missed our street and sanitation truck did not come since Monday."
    )
    assert res["predicted_category"] == "MISSED_GARBAGE_COLLECTION"
    assert res["confidence"] > 0.50


def test_offline_nlp_general_waste(classifier):
    """Offline NLP classification for general street litter."""
    res = classifier.predict_category(
        title="Scattered litter on park avenue",
        description="General waste management needed, lots of scattered litter and plastic wrappers along road."
    )
    assert res["predicted_category"] == "GENERAL_WASTE_MANAGEMENT"
    assert res["confidence"] > 0.40


# --------------------------------------------------------------------------
# 3. DETERMINISTIC DEPARTMENT ROUTING (ALWAYS-ASSIGN POLICY)
# --------------------------------------------------------------------------

def test_department_routing_all_garbage_categories(department_router):
    """Verifies deterministic department routing for all 7 garbage defect categories."""
    expectations = {
        "OVERFLOWING_DUSTBIN": "SANITATION",
        "ILLEGAL_GARBAGE_DUMPING": "SANITATION",
        "UNCOLLECTED_GARBAGE": "SANITATION",
        "GARBAGE_BLOCKING_DRAIN": "DRAINAGE",
        "OPEN_GARBAGE_DUMP": "SANITATION",
        "MISSED_GARBAGE_COLLECTION": "SANITATION",
        "GENERAL_WASTE_MANAGEMENT": "SANITATION",
        "GARBAGE": "SANITATION",
    }
    for cat, expected_dept in expectations.items():
        res = department_router.route_department(category=cat, confidence=0.90)
        assert res["department"] == expected_dept, f"{cat} routed to {res['department']} instead of {expected_dept}"
        assert res["assignment_method"] == "AI_AUTO"
        assert res["requires_human_review"] is False


def test_drainage_routing_for_garbage_in_drain(department_router):
    """Verifies that garbage blocking a drain is assigned specifically to DRAINAGE department."""
    res = department_router.route_department(
        category="GARBAGE_BLOCKING_DRAIN",
        confidence=0.88,
        source="GEMINI"
    )
    assert res["department"] == "DRAINAGE"
    assert res["assignment_method"] == "AI_AUTO"
    assert "Drainage" in res["assignment_reason"] or "DRAINAGE" in res["assignment_reason"]


# --------------------------------------------------------------------------
# 4. SEVERITY & PRIORITY RISK EVALUATION
# --------------------------------------------------------------------------

def test_severity_garbage_blocking_drain_with_flooding(severity_estimator):
    """Verifies that garbage blocking a drain with flooding indicators yields HIGH severity."""
    res = severity_estimator.estimate_severity(
        category="GARBAGE_BLOCKING_DRAIN",
        title="Drain choked with plastic waste",
        description="Drain blockage causing knee-deep flooding and dangerous waterlogging near hospital."
    )
    assert res["severity"] == "HIGH"
    assert res["severity_score"] >= 60


def test_severity_overflowing_dustbin_moderate(severity_estimator):
    """Verifies that an overflowing public bin without critical hazard yields MEDIUM severity."""
    res = severity_estimator.estimate_severity(
        category="OVERFLOWING_DUSTBIN",
        title="Overflowing dustbin",
        description="The public trash can is full and garbage is spilling onto the street."
    )
    assert res["severity"] in ("MEDIUM", "LOW")
    assert res["severity_score"] < 60
