"""
Explainable Priority Scoring Service
Sprint 2: Computes a transparent 0-100 priority score factoring in severity,
duplicate complaint clustering, age of unresolved issue, and category criticality.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

class PriorityScorer:
    def __init__(self):
        self.is_loaded = True

    def calculate_priority(
        self,
        severity: str,
        category: str,
        duplicate_count: int = 0,
        created_at: Optional[str] = None,
        is_high_traffic_zone: bool = False
    ) -> Dict[str, Any]:
        """
        Computes explainable 0-100 priority score.
        Formula:
          Priority Score = Severity Component (max 40)
                         + Duplicate Cluster Component (max 25)
                         + Unresolved Age Component (max 20)
                         + Category Criticality Component (max 15)
        """
        factors: List[str] = []
        breakdown: Dict[str, float] = {}

        # 1. Severity Component (max 40 pts)
        sev_upper = severity.upper()
        if sev_upper == "HIGH":
            sev_pts = 40.0
            factors.append("High severity safety hazard (+40 pts)")
        elif sev_upper == "MEDIUM":
            sev_pts = 25.0
            factors.append("Medium severity operational hazard (+25 pts)")
        elif sev_upper == "LOW":
            sev_pts = 10.0
            factors.append("Low severity minor maintenance (+10 pts)")
        else:
            sev_pts = 15.0
            factors.append("Pending severity baseline (+15 pts)")
        breakdown["severity_points"] = sev_pts

        # 2. Duplicate Cluster Component (max 25 pts)
        # Multiple citizens reporting indicates growing community impact
        if duplicate_count > 0:
            dup_pts = min(float(duplicate_count * 8.0), 25.0)
            factors.append(f"{duplicate_count} similar nearby citizen report(s) (+{dup_pts:.0f} pts)")
        else:
            dup_pts = 0.0
            factors.append("Single report / no duplicate cluster (0 pts)")
        breakdown["duplicate_cluster_points"] = dup_pts

        # 3. Unresolved Age Component (max 20 pts)
        age_pts = 0.0
        if created_at:
            try:
                # Parse created_at ISO timestamp
                if created_at.endswith("Z"):
                    created_at = created_at[:-1] + "+00:00"
                dt = datetime.fromisoformat(created_at)
                now = datetime.now(timezone.utc) if dt.tzinfo else datetime.utcnow()
                delta_days = (now - dt).total_seconds() / (24 * 3600)

                if delta_days >= 7.0:
                    age_pts = 20.0
                    factors.append(f"Unresolved for >7 days ({delta_days:.1f} days active) (+20 pts)")
                elif delta_days >= 3.0:
                    age_pts = 14.0
                    factors.append(f"Unresolved for >3 days ({delta_days:.1f} days active) (+14 pts)")
                elif delta_days >= 1.0:
                    age_pts = 8.0
                    factors.append(f"Unresolved for >24 hours ({delta_days:.1f} days active) (+8 pts)")
                else:
                    age_pts = 3.0
                    factors.append(f"Recently submitted ({delta_days * 24:.1f} hours active) (+3 pts)")
            except Exception:
                age_pts = 5.0
                factors.append("Timestamp parsing fallback (+5 pts)")
        else:
            age_pts = 5.0
            factors.append("Initial submission stage (+5 pts)")
        breakdown["unresolved_age_points"] = age_pts

        # 4. Category Criticality Component (max 15 pts)
        cat_upper = category.upper()
        if cat_upper in ["WATER_LEAKAGE", "POTHOLE"]:
            cat_pts = 15.0
            factors.append(f"Critical public infrastructure category '{cat_upper}' (+15 pts)")
        elif cat_upper in ["DRAINAGE", "STREETLIGHT"]:
            cat_pts = 10.0
            factors.append(f"Municipal utility category '{cat_upper}' (+10 pts)")
        elif cat_upper in ["ROAD_DAMAGE", "GARBAGE"]:
            cat_pts = 8.0
            factors.append(f"Civic maintenance category '{cat_upper}' (+8 pts)")
        else:
            cat_pts = 5.0
            factors.append(f"Standard category '{cat_upper}' (+5 pts)")
        breakdown["category_criticality_points"] = cat_pts

        # Total Calculation
        total_score = min(max(sev_pts + dup_pts + age_pts + cat_pts, 0.0), 100.0)

        # Priority Level thresholds
        if total_score >= 65.0:
            priority = "HIGH"
            explanation = "High Priority: Urgent municipal intervention recommended."
        elif total_score >= 38.0:
            priority = "MEDIUM"
            explanation = "Medium Priority: Standard municipal queue dispatch."
        else:
            priority = "LOW"
            explanation = "Low Priority: Scheduled routine maintenance."

        return {
            "priority": priority,
            "priority_score": round(total_score, 1),
            "breakdown": breakdown,
            "factors": factors,
            "explanation": explanation
        }
