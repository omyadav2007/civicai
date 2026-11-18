from fastapi import APIRouter
from datetime import datetime, timezone
from app.services.gemini_vision import gemini_vision_service

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    gemini_status = (
        f"online (Google GenAI - {gemini_vision_service.model_name})"
        if gemini_vision_service.is_available()
        else "standby (Awaiting GEMINI_API_KEY; local NLP fallback active)"
    )

    return {
        "status": "ok",
        "service": "CivicAI AI Intelligence Service",
        "version": "1.0.0-sprint3",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sprint": "Sprint 3 Operational: Gemini Vision + Automatic Department Routing",
        "models_status": {
            "gemini_vision": gemini_status,
            "department_router": "online (Deterministic Always-Assign Routing Engine)",
            "category_classifier": "online (NLP TF-IDF Keyword Density)",
            "severity_estimator": "online (Multi-factor Risk Engine)",
            "duplicate_detector": "online (Haversine + TF-IDF Cosine Similarity)",
            "priority_scorer": "online (Explainable 4-Factor Weighted Formula)",
        }
    }
