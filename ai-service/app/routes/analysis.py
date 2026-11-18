import os
import base64
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.services.classifier import IssueClassifier
from app.services.severity import SeverityEstimator
from app.services.duplicate import DuplicateDetector
from app.services.priority import PriorityScorer
from app.services.gemini_vision import gemini_vision_service, GeminiVisionAnalysisResult
from app.services.department_router import department_router
from app.services.image_processor import load_and_validate_image, ImageValidationStatus

logger = logging.getLogger("civicai.routes.analysis")

router = APIRouter(prefix="/api/v1", tags=["CivicAI Intelligence"])

classifier = IssueClassifier()
severity_estimator = SeverityEstimator()
duplicate_detector = DuplicateDetector()
priority_scorer = PriorityScorer()

# --- Request Models ---

class ClassifyRequest(BaseModel):
    title: str = Field(..., min_length=2, description="Complaint title")
    description: str = Field(..., min_length=5, description="Complaint description")
    image_path: Optional[str] = Field(None, description="Optional path to uploaded image")

class SeverityRequest(BaseModel):
    category: str = Field(..., description="Complaint category")
    title: Optional[str] = Field("", description="Complaint title")
    description: str = Field(..., min_length=5, description="Complaint description")
    image_path: Optional[str] = None

class CandidateComplaint(BaseModel):
    id: str
    title: str
    description: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    createdAt: Optional[str] = None

class DuplicateRequest(BaseModel):
    target: CandidateComplaint
    candidates: List[CandidateComplaint] = Field(default_factory=list)
    radius_meters: Optional[float] = 500.0

class PriorityRequest(BaseModel):
    severity: str
    category: str
    duplicate_count: Optional[int] = 0
    created_at: Optional[str] = None

class VisionAnalyzeRequest(BaseModel):
    title: str
    description: str
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    image_mime: Optional[str] = "image/jpeg"

class RouteDepartmentRequest(BaseModel):
    category: str
    confidence: float = 0.8
    source: Optional[str] = "GEMINI"
    gemini_reason: Optional[str] = None
    uncertainty_reason: Optional[str] = None
    is_fallback: Optional[bool] = False

class FullAnalyzeRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: Optional[str] = None
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    image_mime: Optional[str] = "image/jpeg"
    candidates: Optional[List[CandidateComplaint]] = Field(default_factory=list)


def _load_image_bytes(image_base64: Optional[str], image_path: Optional[str]) -> Optional[bytes]:
    """Backward-compatible helper that delegates to load_and_validate_image."""
    res = load_and_validate_image(image_base64, image_path)
    return res.image_bytes if res.is_valid else None


# --- Routes ---

@router.post("/classify")
def classify_complaint(req: ClassifyRequest):
    try:
        return classifier.predict_category(req.title, req.description, req.image_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification error: {str(e)}"
        )

@router.post("/severity")
def estimate_severity(req: SeverityRequest):
    try:
        return severity_estimator.estimate_severity(
            category=req.category,
            description=req.description,
            title=req.title,
            image_path=req.image_path
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Severity estimation error: {str(e)}"
        )

@router.post("/duplicates")
def detect_duplicates(req: DuplicateRequest):
    try:
        target_dict = req.target.model_dump()
        candidates_dict = [c.model_dump() for c in req.candidates]
        duplicates = duplicate_detector.find_duplicates(
            target_complaint=target_dict,
            candidate_complaints=candidates_dict,
            radius_meters=req.radius_meters
        )
        return {
            "target_id": req.target.id,
            "duplicate_candidates_found": len(duplicates),
            "duplicates": duplicates
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Duplicate detection error: {str(e)}"
        )

@router.post("/priority")
def calculate_priority(req: PriorityRequest):
    try:
        return priority_scorer.calculate_priority(
            severity=req.severity,
            category=req.category,
            duplicate_count=req.duplicate_count or 0,
            created_at=req.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Priority scoring error: {str(e)}"
        )

@router.post("/route-department")
def route_department(req: RouteDepartmentRequest):
    """Deterministic municipal department assignment based on verified category & confidence."""
    try:
        return department_router.route_department(
            category=req.category,
            confidence=req.confidence,
            source=req.source or "GEMINI",
            gemini_reason=req.gemini_reason,
            uncertainty_reason=req.uncertainty_reason,
            is_fallback=bool(req.is_fallback)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Department routing error: {str(e)}"
        )

@router.post("/vision")
def analyze_vision(req: VisionAnalyzeRequest):
    """Direct multimodal inspection using Gemini Vision with structured JSON validation."""
    image_res = load_and_validate_image(req.image_base64, req.image_path)
    if not image_res.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image validation failed: {image_res.error_message}"
        )

    if not gemini_vision_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini Vision service not active or API key not configured."
        )

    result = gemini_vision_service.analyze_image(
        image_bytes=image_res.image_bytes,
        mime_type=image_res.mime_type,
        title=req.title,
        description=req.description
    )

    if not result:
        err_info = gemini_vision_service.last_error_info
        detail_msg = err_info.summary_message if err_info else "Gemini Vision inspection failed to return valid schema result."
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini Vision call failed: {detail_msg}"
        )

    dump = result.model_dump()
    dump["provider"] = "gemini"
    dump["method"] = "gemini-vision"
    dump["processing_status"] = "GEMINI_COMPLETED"
    dump["image_status"] = image_res.status.value
    return dump


@router.post("/analyze")
def full_analysis(req: FullAnalyzeRequest):
    """
    Unified Primary Gemini Vision & Secondary Local Fallback Pipeline:
    1. Inspect and validate image (Base64 / Path / Magic numbers / 5MB limit).
    2. Primary: Google Gemini Vision multimodal analysis (if valid image and Gemini available).
    3. Secondary: Local NLP and rule-based classification fallback if Gemini fails, times out, or has no photo.
    4. Multi-factor severity estimation.
    5. Haversine + TF-IDF duplicate detection.
    6. Explainable priority index calculation.
    7. Deterministic ALWAYS-ASSIGN municipal department routing.
    """
    try:
        image_res = load_and_validate_image(req.image_base64, req.image_path)
        gemini_result: Optional[GeminiVisionAnalysisResult] = None
        fallback_reason: Optional[str] = None
        provider_error: Optional[str] = None

        # PRIMARY: Attempt Gemini Vision when image is valid and service is available
        if image_res.is_valid and gemini_vision_service.is_available():
            gemini_result = gemini_vision_service.analyze_image(
                image_bytes=image_res.image_bytes,
                mime_type=image_res.mime_type,
                title=req.title,
                description=req.description
            )
            if not gemini_result:
                err_info = gemini_vision_service.last_error_info
                provider_error = err_info.category.value if err_info else "GEMINI_CALL_FAILED"
                fallback_reason = f"Gemini Vision unavailable ({err_info.summary_message if err_info else 'API fault'}); engaged local fallback."
        elif not image_res.is_valid:
            if image_res.status == ImageValidationStatus.MISSING:
                fallback_reason = "No photograph attached; text-only complaint processed via local NLP engine."
            else:
                fallback_reason = f"Image validation failed ({image_res.error_message}); processed via text-only rules."
        else:
            fallback_reason = "Gemini Vision service not active or unconfigured; local rule-based pipeline active."

        # Baseline local NLP classification (always computed for cross-checking)
        local_classification = classifier.predict_category(
            req.title,
            req.description,
            req.image_path if image_res.is_valid else None
        )

        if gemini_result:
            # --- GEMINI VISION SUCCESS PATH ---
            raw_category = gemini_result.category.value
            canonical_category = department_router.to_canonical_category(raw_category)
            confidence = gemini_result.confidence
            used_model = gemini_result.model_used or gemini_vision_service.model_name
            category_explanation = f"Google Gemini Vision ({used_model}) verified {raw_category}: {gemini_result.visual_description}"
            visual_description = gemini_result.visual_description
            visual_evidence = gemini_result.evidence
            ai_provider = "gemini"
            ai_method = "gemini-vision"
            ai_model = used_model
            is_fallback = False
            processing_status = "GEMINI_COMPLETED"
            uncertainty_reason = gemini_result.uncertainty_reason

            # Cross-check disagreement
            disagreement = (local_classification["predicted_category"] != canonical_category)
            requires_human_review = gemini_result.requires_human_review or (confidence < 0.85) or disagreement

            # Severity: Combine visual severity evidence with text factors
            severity_result = severity_estimator.estimate_severity(
                category=canonical_category,
                description=f"{req.description}. Visual evidence: {', '.join(visual_evidence)}",
                title=req.title,
                image_path=req.image_path if image_res.is_valid else None
            )

            # If Gemini flagged HIGH or CRITICAL, elevate severity score
            if gemini_result.severity.value in ("HIGH", "CRITICAL") and severity_result["severity_score"] < 60:
                severity_result["factors"].append(f"Gemini Vision observed high visual defect intensity: '{gemini_result.severity_reason}' (+15 pts)")
                severity_result["severity_score"] = min(100.0, severity_result["severity_score"] + 15.0)
                if severity_result["severity_score"] >= 60:
                    severity_result["severity"] = "HIGH"

        else:
            # --- LOCAL NLP & HEURISTIC FALLBACK PATH ---
            raw_category = req.category or local_classification["predicted_category"]
            canonical_category = department_router.to_canonical_category(raw_category)
            confidence = local_classification["confidence"]
            category_explanation = local_classification["explanation"]

            if image_res.is_valid:
                visual_description = "Photograph cataloged; processed via local civic defect pattern matching."
            elif image_res.status == ImageValidationStatus.MISSING:
                visual_description = "No photograph attached; evaluated via citizen description."
            else:
                visual_description = f"Photograph could not be processed ({image_res.error_message}); evaluated via citizen description."

            visual_evidence = local_classification.get("key_indicators", [])
            ai_provider = "rule-fallback"
            ai_method = "civicai-nlp-rules-v2"
            ai_model = "civicai-nlp-rules-v2"
            is_fallback = True
            processing_status = "FALLBACK_COMPLETED"
            uncertainty_reason = fallback_reason
            disagreement = False
            requires_human_review = (
                local_classification.get("requires_human_review", False)
                or (confidence < 0.60)
                or (image_res.status != ImageValidationStatus.MISSING and not image_res.is_valid)
            )

            severity_result = severity_estimator.estimate_severity(
                category=canonical_category,
                description=req.description,
                title=req.title,
                image_path=req.image_path if image_res.is_valid else None
            )

        # 3. Duplicate Detection (Haversine + TF-IDF)
        target_dict = {
            "id": "target",
            "title": req.title,
            "description": req.description,
            "category": canonical_category,
            "latitude": req.latitude,
            "longitude": req.longitude
        }
        candidates_dict = [c.model_dump() for c in (req.candidates or [])]
        duplicates = duplicate_detector.find_duplicates(
            target_complaint=target_dict,
            candidate_complaints=candidates_dict
        )

        # 4. Priority Scoring
        priority_result = priority_scorer.calculate_priority(
            severity=severity_result["severity"],
            category=canonical_category,
            duplicate_count=len(duplicates),
            created_at=req.created_at
        )

        # 5. Deterministic Department Routing (Always Assign Policy)
        routing_result = department_router.route_department(
            category=canonical_category,
            confidence=confidence,
            source="GEMINI" if not is_fallback else "LOCAL_FALLBACK",
            gemini_reason=gemini_result.severity_reason if gemini_result else None,
            uncertainty_reason=uncertainty_reason,
            is_fallback=is_fallback
        )

        final_requires_human_review = (
            requires_human_review or
            routing_result["requires_human_review"] or
            severity_result.get("requires_human_review", False)
        )

        return {
            "classification": {
                "predicted_category": canonical_category,
                "raw_detected_issue": gemini_result.detected_issue.value if gemini_result else canonical_category,
                "confidence": round(float(confidence), 2),
                "explanation": category_explanation,
                "method": ai_method,
                "provider": ai_provider,
                "model_name": ai_model,
                "processing_status": processing_status,
                "fallback_reason": fallback_reason if is_fallback else None,
                "provider_error": provider_error,
                "image_status": image_res.status.value,
                "visual_description": visual_description,
                "visual_evidence": visual_evidence,
                "detected_objects": gemini_result.detected_objects if gemini_result else [],
                "suggested_action": gemini_result.suggested_action if gemini_result else None,
                "local_comparison": local_classification["predicted_category"],
                "has_disagreement": disagreement,
            },
            "severity": severity_result,
            "duplicates": duplicates,
            "priority": priority_result,
            "department_assignment": routing_result,
            "requires_human_review": final_requires_human_review,
            "provider": ai_provider,
            "method": ai_method,
            "processing_status": processing_status,
            "fallback_reason": fallback_reason if is_fallback else None,
            "status": "success"
        }

    except Exception as e:
        logger.error("[AnalysisRoute] Unified pipeline exception: %s", str(e), exc_info=True)
        # Even on catastrophic failure, provide resilient fallback assignment
        fallback_cat = req.category or "OTHER"
        emergency_routing = department_router.route_department(
            category=fallback_cat,
            confidence=0.5,
            source="LOCAL_FALLBACK",
            uncertainty_reason=f"Pipeline exception recovery: {str(e)}",
            is_fallback=True
        )
        return {
            "classification": {
                "predicted_category": fallback_cat,
                "raw_detected_issue": fallback_cat,
                "confidence": 0.5,
                "explanation": "Resilient default assignment following pipeline recovery.",
                "provider": "rule-fallback",
                "method": "emergency-safe-default",
                "model_name": "emergency-safe-default",
                "processing_status": "FALLBACK_COMPLETED",
                "fallback_reason": f"Pipeline exception: {str(e)}",
                "image_status": "ERROR",
                "visual_description": "Pending visual inspection.",
                "visual_evidence": [],
            },
            "severity": {
                "severity": "MEDIUM",
                "severity_score": 35.0,
                "factors": ["Standard initial triage score"],
                "explanation": "Standard initial triage severity.",
                "requires_human_review": True
            },
            "duplicates": [],
            "priority": {
                "priority": "MEDIUM",
                "priority_score": 35.0,
                "factors": ["Standard queue triage"],
                "explanation": "Standard priority index."
            },
            "department_assignment": emergency_routing,
            "requires_human_review": True,
            "provider": "rule-fallback",
            "method": "emergency-safe-default",
            "processing_status": "FALLBACK_COMPLETED",
            "fallback_reason": f"Pipeline exception: {str(e)}",
            "status": "partial_fallback",
            "error_detail": str(e)
        }
