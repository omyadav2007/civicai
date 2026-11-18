# CivicAI — Complete API Documentation (Sprint 1, Sprint 2 & Sprint 3)

## Base URLs
- **Backend Express REST API**: `http://localhost:5000`
- **FastAPI AI Intelligence Service**: `http://localhost:8001` (Port 8001 configured for dedicated microservice)

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new citizen account | Public |
| `POST` | `/api/auth/login` | Login and receive HTTP-only JWT cookie + Bearer token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & role | Authenticated |
| `POST` | `/api/auth/logout` | Terminate session and clear cookie | Authenticated |
| `PATCH` | `/api/auth/profile` | Update display name | Authenticated |

---

## 2. Citizen Complaint Endpoints (`/api/complaints`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/complaints` | Submit complaint with photo & GPS (Triggers AI pipeline) | Citizen |
| `GET` | `/api/complaints/my` | List citizen's own complaints with KPI counts | Citizen |
| `GET` | `/api/complaints` | Filter and search complaints | Authenticated |
| `GET` | `/api/complaints/:id` | Get complaint details and images (Ownership verified) | Owner / Admin |
| `GET` | `/api/complaints/:id/history` | Audit status timeline | Owner / Admin |

---

## 3. Municipal Administrator Endpoints (`/api/admin`)
*Strictly restricted to users with `ADMIN` role. Citizens receive `403 Forbidden`.*

### 3.1 Get Dashboard Telemetry & KPI Cards
- **Endpoint**: `GET /api/admin/dashboard`
- **Access**: Admin only
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "kpi": {
        "total": 7,
        "submitted": 3,
        "inProgress": 3,
        "resolved": 1,
        "rejected": 0,
        "highPriority": 2,
        "duplicateCandidates": 2
      },
      "distributions": {
        "status": [...],
        "category": [...],
        "priority": [...],
        "department": [...]
      },
      "recentComplaints": [...]
    }
  }
  ```

### 3.2 List All Complaints with Multi-Filter & Search
- **Endpoint**: `GET /api/admin/complaints`
- **Access**: Admin only
- **Query Parameters**:
  - `status`: `SUBMITTED` | `IN_PROGRESS` | `RESOLVED` | `REJECTED`
  - `category`: `POTHOLE` | `ROAD_DAMAGE` | `GARBAGE` | `WATER_LEAKAGE` | `DRAINAGE` | `STREETLIGHT` | `OTHER`
  - `severity`: `LOW` | `MEDIUM` | `HIGH` | `PENDING`
  - `priority`: `LOW` | `MEDIUM` | `HIGH`
  - `department`: `ROAD_MAINTENANCE` | `SANITATION` | `WATER_SUPPLY` | `DRAINAGE` | `ELECTRICITY` | `PUBLIC_WORKS` | `UNASSIGNED`
  - `search`: search term in title, description, address, or citizen name
  - `sortBy`: `createdAt` | `priority` | `severity` | `status`
  - `sortOrder`: `asc` | `desc`
  - `page`: integer (default 1)
  - `limit`: integer (default 15)

### 3.3 Get Single Complaint Dossier with AI Telemetry & Duplicates
- **Endpoint**: `GET /api/admin/complaints/:id`
- **Access**: Admin only
- **Response**: Full complaint with citizen profile, images, audit status history (with actor details), internal notes, AI analysis, and duplicate candidate previews.

### 3.4 Update Incident Lifecycle Status
- **Endpoint**: `PATCH /api/admin/complaints/:id/status`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS",
    "notes": "Field repair crew dispatched with asphalt patch truck."
  }
  ```
- **Behavior**: Updates complaint status and records a `ComplaintStatusHistory` audit entry in a database transaction with the admin's user ID.

### 3.5 Assign Department
- **Endpoint**: `PATCH /api/admin/complaints/:id/assign`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "department": "ROAD_MAINTENANCE",
    "notes": "Forwarded to North Zone highway division."
  }
  ```

### 3.6 Record Administrative Internal Note
- **Endpoint**: `POST /api/admin/complaints/:id/notes`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "note": "Citizen called municipal helpline confirming repair crew arrived on site."
  }
  ```

### 3.7 Trigger or Re-Run AI Intelligence Pipeline
- **Endpoint**: `POST /api/admin/complaints/:id/trigger-ai`
- **Access**: Admin only
- **Behavior**: Re-evaluates complaint against latest database entries via FastAPI, updating category confidence, severity, duplicates, and priority score.

### 3.8 Admin Correction of AI Prediction
- **Endpoint**: `PATCH /api/admin/complaints/:id/ai-correction`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "category": "WATER_LEAKAGE",
    "severity": "HIGH",
    "notes": "Photo evidence confirms underground water pipe fractured rather than surface rain water."
  }
  ```

### 3.9 Municipal Analytics & SLA
- **Endpoint**: `GET /api/admin/analytics`
- **Access**: Admin only
- **Response**: Average resolution turnaround in hours, completion rate %, and monthly volume trends.

### 3.10 AI Intelligence Insights & Audit Logs
- **Endpoint**: `GET /api/admin/ai-insights`
- **Access**: Admin only
- **Response**: Total complaints analyzed, category prediction distribution, severity distribution, duplicate clusters list, low-confidence review queue, and audited human corrections.

---

## 4. FastAPI AI Intelligence Service Endpoints (`/api/v1`)

### 4.1 Complaint Classification
- **Endpoint**: `POST http://localhost:8000/api/v1/classify`
- **Request**:
  ```json
  {
    "title": "Deep dangerous pothole",
    "description": "Tire blew out on sector 4 tarmac near bus stand",
    "image_path": null
  }
  ```
- **Response**:
  ```json
  {
    "predicted_category": "POTHOLE",
    "confidence": 0.85,
    "probabilities": { "POTHOLE": 0.85, "ROAD_DAMAGE": 0.08, ... },
    "method": "NLP Keyword-Weighted TF Distribution (Sprint 2 Baseline)",
    "key_indicators": ["pothole", "deep", "skid", "tire damage"],
    "explanation": "Classified as POTHOLE based on key terms: 'pothole, deep, tire damage'"
  }
  ```

### 4.2 Severity Estimation
- **Endpoint**: `POST http://localhost:8000/api/v1/severity`
- **Request**:
  ```json
  {
    "category": "POTHOLE",
    "title": "Hazardous road pit",
    "description": "Deep 1.5 foot hole in middle of high speed lane near school"
  }
  ```
- **Response**:
  ```json
  {
    "severity": "HIGH",
    "severity_score": 85.0,
    "certainty": 0.80,
    "factors": [
      "Base hazard score for category 'POTHOLE' (+25 pts)",
      "Critical hazard indicators detected: 'deep, hazardous' (+24 pts)",
      "Located near high-density public zone: school (+15 pts)",
      "Explicit physical measurement noted (+10 pts)"
    ],
    "explanation": "High severity: Significant safety risk to citizens or critical infrastructure disruption.",
    "requires_human_review": false
  }
  ```

### 4.3 Duplicate Candidate Detection
- **Endpoint**: `POST http://localhost:8000/api/v1/duplicates`
- **Request**:
  ```json
  {
    "target": {
      "id": "c1",
      "title": "Pothole on Main Road",
      "description": "Deep hole near sector 4 bus stand",
      "category": "POTHOLE",
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "candidates": [
      {
        "id": "c2",
        "title": "Road pothole near bus stop",
        "description": "Big cavity causing bike skids near bus stand",
        "category": "POTHOLE",
        "latitude": 28.6141,
        "longitude": 77.2092
      }
    ],
    "radius_meters": 500.0
  }
  ```
- **Response**:
  ```json
  {
    "target_id": "c1",
    "duplicate_candidates_found": 1,
    "duplicates": [
      {
        "complaint_id": "c2",
        "distance_meters": 29.6,
        "text_similarity": 0.42,
        "overall_match_score": 0.68,
        "match_reason": "Identical category 'POTHOLE' & 30m away & 42% text similarity"
      }
    ]
  }
  ```

### 4.4 Explainable Priority Scoring
- **Endpoint**: `POST http://localhost:8000/api/v1/priority`
- **Request**:
  ```json
  {
    "severity": "HIGH",
    "category": "POTHOLE",
    "duplicate_count": 2,
    "created_at": "2026-10-30T10:00:00Z"
  }
  ```
- **Response**:
  ```json
  {
    "priority": "HIGH",
    "priority_score": 85.0,
    "breakdown": {
      "severity_points": 40.0,
      "duplicate_cluster_points": 16.0,
      "unresolved_age_points": 14.0,
      "category_criticality_points": 15.0
    },
    "factors": [
      "High severity safety hazard (+40 pts)",
      "2 similar nearby citizen report(s) (+16 pts)",
      "Unresolved for >3 days (+14 pts)",
      "Critical public infrastructure category 'POTHOLE' (+15 pts)"
    ],
    "explanation": "High Priority: Urgent municipal intervention recommended."
  }
  ```

### 4.5 Full Unified Multimodal Pipeline
- **Endpoint**: `POST http://localhost:8001/api/v1/analyze`
- **Description**: Executes Gemini Vision multimodal classification, NLP verification, multi-factor severity estimation, Haversine duplicate clustering, explainable priority scoring, and deterministic municipal department routing under the Always-Assign policy.
- **Request Body**:
  ```json
  {
    "complaint": {
      "id": "c101",
      "title": "Deep crater pothole on sector road",
      "description": "Hazardous road cavity measuring 1.5ft across",
      "category": "POTHOLE",
      "latitude": 28.5355,
      "longitude": 77.3910,
      "created_at": "2026-11-03T10:00:00Z"
    },
    "nearby_complaints": [],
    "image_base64": "/9j/4AAQSkZJRgABAQEASABIAAD...",
    "image_mime_type": "image/jpeg"
  }
  ```
- **Response**:
  ```json
  {
    "predicted_category": "POTHOLE",
    "category_confidence": 0.94,
    "severity": "HIGH",
    "severity_score": 0.85,
    "priority": "HIGH",
    "priority_score": 75.0,
    "assigned_department": "ROAD_MAINTENANCE",
    "assignment_method": "AI_AUTO",
    "processing_status": "COMPLETED",
    "requires_human_review": false,
    "visual_description": "Deep asphalt cavity in the vehicular lane posing imminent tire blowout and skid danger.",
    "visual_evidence": [
      "Pronounced asphalt surface rupture",
      "Exposed sub-base aggregate",
      "Active traffic corridor adjacent to hazard"
    ],
    "explanation": "High severity pothole verified via Gemini Vision; routed automatically to Road Maintenance.",
    "provider": "google-genai",
    "model_name": "gemini-2.5-flash"
  }
  ```

---

## 5. Gemini Vision & Municipal Routing Microservice Endpoints (Sprint 3)

### 5.1 Standalone Gemini Vision Analysis
- **Endpoint**: `POST http://localhost:8001/api/v1/vision`
- **Description**: Sends uploaded civic image to Gemini 2.5 Flash for visual hazard inspection.
- **Request Body**:
  ```json
  {
    "image_base64": "<base64_encoded_jpeg_or_png_or_webp>",
    "mime_type": "image/jpeg",
    "context_hint": "Deep pothole near market"
  }
  ```
- **Response**:
  ```json
  {
    "detected_category": "POTHOLE",
    "confidence": 0.95,
    "visual_description": "Large road crater with fractured asphalt edges.",
    "observed_evidence": ["Cracked bitumen", "Exposed roadway gravel"],
    "suggested_severity": "HIGH",
    "is_civic_issue": true,
    "uncertainty_notes": null
  }
  ```

### 5.2 Deterministic Municipal Department Routing
- **Endpoint**: `POST http://localhost:8001/api/v1/route-department`
- **Description**: Implements the canonical municipal assignment matrix and the mandatory "ALWAYS ASSIGN" policy.
- **Routing Matrix**:
  | Category | Assigned Department |
  |---|---|
  | `POTHOLE`, `ROAD_DAMAGE` | `ROAD_MAINTENANCE` |
  | `GARBAGE` | `SANITATION` |
  | `WATER_LEAKAGE` | `WATER_SUPPLY` |
  | `DRAINAGE` | `DRAINAGE` |
  | `STREETLIGHT` | `ELECTRICITY` |
  | `OTHER` | `PUBLIC_WORKS` |

- **Request Body**:
  ```json
  {
    "category": "POTHOLE",
    "ai_confidence": 0.92,
    "is_fallback": false
  }
  ```
- **Response**:
  ```json
  {
    "assigned_department": "ROAD_MAINTENANCE",
    "assignment_method": "AI_AUTO",
    "requires_human_review": false,
    "reason": "High-confidence (92.0%) AI classification as POTHOLE routed to ROAD_MAINTENANCE"
  }
  ```

### 5.3 Microservice Health & Vision Diagnostics
- **Endpoint**: `GET http://localhost:8001/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "civicai-ai-service",
    "version": "3.0.0",
    "sprint": 3,
    "gemini_vision_configured": true,
    "gemini_model": "gemini-2.5-flash",
    "gemini_sdk": "google-genai",
    "routing_policy": "ALWAYS_ASSIGN"
  }
  ```
