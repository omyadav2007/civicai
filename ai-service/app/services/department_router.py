"""
Automatic Municipal Department Routing Engine
Sprint 3: Deterministic municipal department assignment and audit classification engine.
Mandatory Policy: ALWAYS ASSIGN. Never leaves a valid complaint unassigned.
"""

from typing import Dict, Any, Optional
from enum import Enum

class DepartmentEnum(str, Enum):
    ROAD_MAINTENANCE = "ROAD_MAINTENANCE"
    SANITATION = "SANITATION"
    WATER_SUPPLY = "WATER_SUPPLY"
    DRAINAGE = "DRAINAGE"
    ELECTRICITY = "ELECTRICITY"
    PUBLIC_WORKS = "PUBLIC_WORKS"

class AssignmentMethodEnum(str, Enum):
    AI_AUTO = "AI_AUTO"
    RULE_FALLBACK = "RULE_FALLBACK"
    MANUAL = "MANUAL"

class AiProcessingStatusEnum(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FALLBACK_COMPLETED = "FALLBACK_COMPLETED"
    FAILED = "FAILED"

# Deterministic category to municipal department mapping
CATEGORY_DEPARTMENT_MAPPING: Dict[str, str] = {
    "POTHOLE": "ROAD_MAINTENANCE",
    "ROAD_DAMAGE": "ROAD_MAINTENANCE",
    "GARBAGE": "SANITATION",
    "OVERFLOWING_DUSTBIN": "SANITATION",
    "ILLEGAL_GARBAGE_DUMPING": "SANITATION",
    "UNCOLLECTED_GARBAGE": "SANITATION",
    "GARBAGE_BLOCKING_DRAIN": "DRAINAGE",
    "OPEN_GARBAGE_DUMP": "SANITATION",
    "MISSED_GARBAGE_COLLECTION": "SANITATION",
    "GENERAL_WASTE_MANAGEMENT": "SANITATION",
    "WATER_LEAKAGE": "WATER_SUPPLY",
    "DRAINAGE": "DRAINAGE",
    "SEWAGE": "DRAINAGE",
    "STREETLIGHT": "ELECTRICITY",
    "ELECTRICAL_HAZARD": "ELECTRICITY",
    "TRAFFIC_SIGNAL": "ELECTRICITY",
    "PUBLIC_SAFETY": "PUBLIC_WORKS",
    "OTHER": "PUBLIC_WORKS",
}

CANONICAL_PRISMA_CATEGORY: Dict[str, str] = {
    "POTHOLE": "POTHOLE",
    "ROAD_DAMAGE": "ROAD_DAMAGE",
    "GARBAGE": "GARBAGE",
    "OVERFLOWING_DUSTBIN": "OVERFLOWING_DUSTBIN",
    "ILLEGAL_GARBAGE_DUMPING": "ILLEGAL_GARBAGE_DUMPING",
    "UNCOLLECTED_GARBAGE": "UNCOLLECTED_GARBAGE",
    "GARBAGE_BLOCKING_DRAIN": "GARBAGE_BLOCKING_DRAIN",
    "OPEN_GARBAGE_DUMP": "OPEN_GARBAGE_DUMP",
    "MISSED_GARBAGE_COLLECTION": "MISSED_GARBAGE_COLLECTION",
    "GENERAL_WASTE_MANAGEMENT": "GENERAL_WASTE_MANAGEMENT",
    "WATER_LEAKAGE": "WATER_LEAKAGE",
    "DRAINAGE": "DRAINAGE",
    "SEWAGE": "DRAINAGE",
    "STREETLIGHT": "STREETLIGHT",
    "ELECTRICAL_HAZARD": "STREETLIGHT",
    "TRAFFIC_SIGNAL": "STREETLIGHT",
    "PUBLIC_SAFETY": "OTHER",
    "OTHER": "OTHER",
}

DEPARTMENT_TITLES: Dict[str, str] = {
    "ROAD_MAINTENANCE": "Road Maintenance & Infrastructure Department",
    "SANITATION": "Solid Waste Management & Sanitation Department",
    "WATER_SUPPLY": "Municipal Water Supply & Distribution Department",
    "DRAINAGE": "Stormwater & Sewerage Drainage Department",
    "ELECTRICITY": "Electrical & Street Lighting Department",
    "PUBLIC_WORKS": "Public Works & General Municipal Maintenance Department",
}

CONFIDENCE_AUTO_THRESHOLD = 0.85

class DepartmentRouter:
    def __init__(self):
        self.mapping = CATEGORY_DEPARTMENT_MAPPING
        self.department_titles = DEPARTMENT_TITLES

    def get_department_for_category(self, category: str) -> str:
        """Returns the canonical department for a given civic category (defaults to PUBLIC_WORKS)."""
        normalized_cat = (category or "").strip().upper()
        return self.mapping.get(normalized_cat, "PUBLIC_WORKS")

    def to_canonical_category(self, category: str) -> str:
        """Maps fine-grained civic issues (e.g. SEWAGE, ELECTRICAL_HAZARD) to canonical Prisma categories."""
        normalized_cat = (category or "").strip().upper()
        return CANONICAL_PRISMA_CATEGORY.get(normalized_cat, "OTHER")

    def route_department(
        self,
        category: str,
        confidence: float,
        source: str = "GEMINI",  # "GEMINI" | "LOCAL_FALLBACK" | "MANUAL"
        gemini_reason: Optional[str] = None,
        uncertainty_reason: Optional[str] = None,
        is_fallback: bool = False
    ) -> Dict[str, Any]:
        """
        Determines the appropriate department and auditable assignment metadata
        strictly following the CivicAI Sprint 3 Always-Assign routing policy.
        """
        normalized_cat = (category or "OTHER").strip().upper()
        if normalized_cat not in self.mapping:
            normalized_cat = "OTHER"

        assigned_dept = self.get_department_for_category(normalized_cat)
        dept_title = self.department_titles.get(assigned_dept, assigned_dept)

        # CASE C: Category is OTHER
        if normalized_cat == "OTHER":
            assignment_method = AssignmentMethodEnum.RULE_FALLBACK if is_fallback else AssignmentMethodEnum.AI_AUTO
            return {
                "department": assigned_dept,
                "department_title": dept_title,
                "assignment_method": assignment_method.value,
                "processing_status": AiProcessingStatusEnum.FALLBACK_COMPLETED.value if is_fallback else AiProcessingStatusEnum.COMPLETED.value,
                "requires_human_review": True,
                "assignment_reason": (
                    "Assigned to Public Works for general triage: issue classified as OTHER non-standard civic matter."
                ),
                "uncertainty_reason": uncertainty_reason or "Non-standard civic category requires human department verification.",
                "routing_case": "CASE_C_OTHER"
            }

        # CASE D / E / F: Fallback mechanism (Gemini unavailable, timed out, or response invalid)
        if is_fallback or source == "LOCAL_FALLBACK":
            requires_review = confidence < 0.60 or normalized_cat == "OTHER"
            return {
                "department": assigned_dept,
                "department_title": dept_title,
                "assignment_method": AssignmentMethodEnum.RULE_FALLBACK.value,
                "processing_status": AiProcessingStatusEnum.FALLBACK_COMPLETED.value,
                "requires_human_review": requires_review,
                "assignment_reason": (
                    f"Automatically routed to {dept_title} via CivicAI rule-based fallback classification engine."
                ),
                "uncertainty_reason": uncertainty_reason or ("Rule-based keyword fallback utilized." if requires_review else None),
                "routing_case": "CASE_D_FALLBACK"
            }

        # CASE A: Gemini Vision confidence >= 0.85
        if confidence >= CONFIDENCE_AUTO_THRESHOLD:
            reason = gemini_reason or f"Gemini Vision verified {normalized_cat} defect with high confidence ({int(confidence * 100)}%)."
            return {
                "department": assigned_dept,
                "department_title": dept_title,
                "assignment_method": AssignmentMethodEnum.AI_AUTO.value,
                "processing_status": AiProcessingStatusEnum.COMPLETED.value,
                "requires_human_review": False,
                "assignment_reason": f"Automatic AI dispatch to {dept_title}: {reason}",
                "uncertainty_reason": None,
                "routing_case": "CASE_A_HIGH_CONFIDENCE"
            }

        # CASE B: Gemini Vision confidence < 0.85
        reason = gemini_reason or f"Gemini Vision classified {normalized_cat} with moderate confidence ({int(confidence * 100)}%)."
        return {
            "department": assigned_dept,
            "department_title": dept_title,
            "assignment_method": AssignmentMethodEnum.AI_AUTO.value,
            "processing_status": AiProcessingStatusEnum.COMPLETED.value,
            "requires_human_review": True,
            "assignment_reason": f"Automatic AI dispatch to {dept_title}: {reason}",
            "uncertainty_reason": (
                uncertainty_reason or
                f"Model confidence ({int(confidence * 100)}%) is below the {int(CONFIDENCE_AUTO_THRESHOLD * 100)}% auto-verification threshold; flagged for administrative audit."
            ),
            "routing_case": "CASE_B_MODERATE_CONFIDENCE"
        }

department_router = DepartmentRouter()
