"""
Severity Estimation Service
Sprint 2: Multi-factor risk engine analyzing hazard vocabulary, category baseline risk,
traffic/pedestrian impact markers, and physical dimension indicators.
"""

import re
from typing import Dict, Any, List, Optional

HIGH_HAZARD_KEYWORDS = [
    "deep", "massive", "hazardous", "danger", "dangerous", "skid", "injury", "accident",
    "fell", "collapsed", "fire", "burst", "gushing", "flood", "flooding", "knee-deep",
    "waist-deep", "blocked", "traffic jam", "death", "severe", "life-threatening", "emergency",
    "sparking", "live wire", "open manhole", "pitch dark", "school", "hospital", "bus terminal",
    "biomedical", "toxic", "medical waste", "disease", "epidemic", "drain blockage", "choked drain",
    "drain choked", "contaminating water", "water contamination"
]

MEDIUM_HAZARD_KEYWORDS = [
    "moderate", "overflow", "stagnant", "stench", "foul odor", "uncollected", "crack",
    "subsidence", "waterlogging", "delay", "broken", "flickering", "debris", "inconvenience",
    "slippery", "multiple", "spread", "two-wheelers", "two wheeler", "pedestrians", "safety risk",
    "mosquito", "vectors", "stray dogs", "spilling", "scattered", "decaying", "rotten", "smelly",
    "unclean", "dustbin full", "litter"
]

CATEGORY_BASE_RISK = {
    "WATER_LEAKAGE": 25,              # Potable water erosion / flooding
    "POTHOLE": 25,                    # Vehicle accidents & tire blowout
    "GARBAGE_BLOCKING_DRAIN": 25,     # Immediate flood and health contamination hazard
    "DRAINAGE": 20,                   # Health hazard & monsoon blockage
    "OPEN_GARBAGE_DUMP": 20,          # High vector breeding & public sanitation hazard
    "ILLEGAL_GARBAGE_DUMPING": 18,    # Hazardous dumping on public ways
    "OVERFLOWING_DUSTBIN": 15,        # Public bin overflow onto pavements
    "UNCOLLECTED_GARBAGE": 15,        # Residential accumulation
    "STREETLIGHT": 15,                # Nighttime safety & visibility
    "ROAD_DAMAGE": 15,                # Vehicle wear & lane restriction
    "MISSED_GARBAGE_COLLECTION": 12,  # Sanitation service skip
    "GARBAGE": 12,                    # General waste accumulation
    "GENERAL_WASTE_MANAGEMENT": 10,   # Street sweepings and litter
    "OTHER": 10
}

class SeverityEstimator:
    def __init__(self):
        self.is_loaded = True

    def estimate_severity(
        self,
        category: str,
        description: str,
        title: Optional[str] = "",
        image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates severity level (LOW, MEDIUM, HIGH) based on multi-factor scoring.
        """
        text = f"{title} {description}".lower()
        score = CATEGORY_BASE_RISK.get(category.upper(), 15)
        factors: List[str] = [f"Base hazard score for category '{category}' (+{score} pts)"]

        # 1. High Hazard Keyword Scan
        high_matches = [w for w in HIGH_HAZARD_KEYWORDS if w in text]
        if high_matches:
            pts = min(len(high_matches) * 12, 45)
            score += pts
            factors.append(f"Critical hazard indicators detected: '{', '.join(high_matches[:4])}' (+{pts} pts)")

        # 2. Medium Hazard Keyword Scan
        med_matches = [w for w in MEDIUM_HAZARD_KEYWORDS if w in text and w not in high_matches]
        if med_matches:
            pts = min(len(med_matches) * 3, 10)
            score += pts
            factors.append(f"Moderate operational disruption markers: '{', '.join(med_matches[:3])}' (+{pts} pts)")

        # 3. High traffic / vulnerable location impact
        critical_public_zones = ["hospital", "school", "bus terminal", "highway", "railway station"]
        moderate_public_zones = ["main road", "junction", "intersection", "market", "bus stand"]

        detected_crit = [v for v in critical_public_zones if v in text]
        detected_mod = [v for v in moderate_public_zones if v in text and v not in detected_crit]

        if detected_crit:
            score += 15
            factors.append(f"Located near critical public facility: {', '.join(detected_crit)} (+15 pts)")
        elif detected_mod:
            score += 10
            factors.append(f"Located near arterial public route: {', '.join(detected_mod)} (+10 pts)")

        # 4. Dimension / Physical Extent check (e.g. 'feet', 'inches', 'meters', 'knee')
        if re.search(r'\b(\d+\s*(feet|foot|inch|inches|meter|meters|cm))\b', text) or "knee" in text:
            score += 10
            factors.append("Explicit physical measurement or deep cavity depth noted (+10 pts)")

        score = min(max(score, 10), 100)

        # Thresholds
        if score >= 60:
            severity = "HIGH"
            explanation = "High severity: Significant safety risk to citizens or critical infrastructure disruption."
        elif score >= 35:
            severity = "MEDIUM"
            explanation = "Medium severity: Moderate hazard causing public inconvenience or localized disruption."
        else:
            severity = "LOW"
            explanation = "Low severity: Minor issue without imminent danger to life, vehicles, or property."

        # Human review threshold (borderline risk zone or very brief description)
        requires_human_review = (50 <= score <= 65) or (len(text.split()) < 6)

        return {
            "severity": severity,
            "severity_score": round(float(score), 1),
            "certainty": round(min(0.5 + (len(high_matches) + len(med_matches)) * 0.1, 0.95), 2),
            "factors": factors,
            "explanation": explanation,
            "requires_human_review": requires_human_review
        }
