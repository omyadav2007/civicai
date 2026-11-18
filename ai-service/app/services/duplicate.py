"""
Duplicate Complaint Detection Service
Sprint 2: Identifies geographically and semantically nearby duplicate complaints using
Haversine spherical distance calculation and TF-IDF Cosine Similarity.
"""

import math
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return R * c

class DuplicateDetector:
    def __init__(self, default_radius_meters: float = 500.0, text_sim_threshold: float = 0.30):
        self.is_loaded = True
        self.default_radius_meters = default_radius_meters
        self.text_sim_threshold = text_sim_threshold

    def find_duplicates(
        self,
        target_complaint: Dict[str, Any],
        candidate_complaints: List[Dict[str, Any]],
        radius_meters: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Compares target complaint against candidate complaints within geographic radius
        and calculates semantic text similarity via TF-IDF.
        """
        if not candidate_complaints:
            return []

        search_radius = radius_meters if radius_meters is not None else self.default_radius_meters
        target_lat = target_complaint.get("latitude")
        target_lon = target_complaint.get("longitude")
        target_cat = target_complaint.get("category")
        target_id = target_complaint.get("id")
        target_text = f"{target_complaint.get('title', '')} {target_complaint.get('description', '')}".strip()

        # Step 1: Pre-filter candidates by distance (if coordinates are provided)
        candidates_with_distance = []
        for cand in candidate_complaints:
            cand_id = cand.get("id")
            if cand_id == target_id:
                continue

            cand_lat = cand.get("latitude")
            cand_lon = cand.get("longitude")
            
            distance: Optional[float] = None
            is_within_radius = True

            if target_lat is not None and target_lon is not None and cand_lat is not None and cand_lon is not None:
                try:
                    distance = round(haversine_distance(float(target_lat), float(target_lon), float(cand_lat), float(cand_lon)), 1)
                    if distance > search_radius:
                        is_within_radius = False
                except Exception:
                    distance = None

            if is_within_radius:
                cand_text = f"{cand.get('title', '')} {cand.get('description', '')}".strip()
                candidates_with_distance.append({
                    "data": cand,
                    "distance_meters": distance,
                    "cand_text": cand_text
                })

        if not candidates_with_distance:
            return []

        # Step 2: Compute TF-IDF Cosine Similarity
        corpus = [target_text] + [c["cand_text"] for c in candidates_with_distance]
        
        try:
            vectorizer = TfidfVectorizer(stop_words='english', min_df=1, ngram_range=(1, 2))
            tfidf_matrix = vectorizer.fit_transform(corpus)
            cos_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        except Exception:
            # Fallback simple Jaccard similarity if TF-IDF fails on small input
            cos_similarities = []
            target_words = set(target_text.lower().split())
            for c in candidates_with_distance:
                cand_words = set(c["cand_text"].lower().split())
                inter = len(target_words.intersection(cand_words))
                union = len(target_words.union(cand_words)) or 1
                cos_similarities.append(inter / union)

        # Step 3: Combine distance, category match, and text similarity
        duplicates = []
        for idx, item in enumerate(candidates_with_distance):
            cand = item["data"]
            dist = item["distance_meters"]
            text_sim = float(cos_similarities[idx])
            cat_match = (cand.get("category") == target_cat)

            # Match Score formula:
            # Text similarity weight (50%) + Category match (25%) + Proximity weight (25%)
            proximity_score = 0.0
            if dist is not None:
                proximity_score = max(0.0, 1.0 - (dist / search_radius))
            else:
                proximity_score = 0.5  # Neutral if GPS coordinates not provided

            overall_match_score = (text_sim * 0.50) + ((1.0 if cat_match else 0.0) * 0.25) + (proximity_score * 0.25)

            # Threshold check:
            # Either high overall score OR (very close distance + matching category) OR high text similarity
            is_duplicate = (
                overall_match_score >= 0.45 or
                (dist is not None and dist <= 150.0 and cat_match) or
                text_sim >= 0.60
            )

            if is_duplicate:
                reasons = []
                if cat_match:
                    reasons.append(f"Identical category '{target_cat}'")
                if dist is not None:
                    reasons.append(f"{dist:.0f}m away (within {search_radius:.0f}m zone)")
                if text_sim > 0.25:
                    reasons.append(f"{int(text_sim * 100)}% text similarity")

                duplicates.append({
                    "complaint_id": cand.get("id"),
                    "title": cand.get("title"),
                    "category": cand.get("category"),
                    "status": cand.get("status"),
                    "distance_meters": dist,
                    "text_similarity": round(text_sim, 3),
                    "overall_match_score": round(overall_match_score, 3),
                    "match_reason": " & ".join(reasons) if reasons else "High contextual similarity"
                })

        # Sort duplicates by overall match score descending
        duplicates.sort(key=lambda d: d["overall_match_score"], reverse=True)
        return duplicates[:5]
