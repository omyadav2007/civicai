# CivicAI — AI-Powered Civic Issue Reporting and Management System
**B.Tech CSE Semester 5 Capstone Project**  
*Sprint 1: Foundation + Citizen Portal | Sprint 2: Admin Dashboard + AI Pipeline | Sprint 3: Gemini Vision AI + Automatic Municipal Routing*

---

## 🏛️ Project Overview

**CivicAI** is an AI-assisted civic grievance reporting and municipal management platform. Citizens report local infrastructure hazards—such as potholes, overflowing garbage dumpsters, drinking water pipeline bursts, drainage blockages, and non-functional streetlights—while municipal administrators triage, assign departments, audit status lifecycles, and leverage AI duplicate clustering.

Sprint 3 introduces **Google Gemini 2.5 Flash Multimodal Vision** analysis via the official `google-genai` SDK and an **Automatic Municipal Department Routing Pipeline** governed by a strict **"ALWAYS ASSIGN"** policy.

### Key Capabilities

1. **Multimodal Citizen Incident Submission (`/complaints/new`)**:
   - Frictionless incident reporting with photo evidence upload (5MB max).
   - **Binary Magic Number Verification** for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`RIFF...WEBP`) preventing spoofed files.
   - **Synchronous Gemini Vision Triage**: Immediately displays detected civic hazard, model confidence percentage, estimated severity, assigned department, and observable visual evidence.
   - GPS coordinate geotagging with OpenStreetMap Nominatim reverse geocoding.

2. **Always-Assign Municipal Department Router**:
   - Every complaint is guaranteed a department assignment immediately upon creation—no unassigned complaints.
   - **Deterministic Mapping Matrix**:
     - `POTHOLE`, `ROAD_DAMAGE` ➔ `ROAD_MAINTENANCE`
     - `GARBAGE` ➔ `SANITATION`
     - `WATER_LEAKAGE` ➔ `WATER_SUPPLY`
     - `DRAINAGE` ➔ `DRAINAGE`
     - `STREETLIGHT` ➔ `ELECTRICITY`
     - `OTHER` / Unclear ➔ `PUBLIC_WORKS`
   - **Routing Cases & Review Flags**:
     - Case A (Gemini conf ≥ 85%): `AI_AUTO`, no human review needed.
     - Case B (Gemini conf < 85%): `AI_AUTO`, flagged for human review.
     - Case C (Category `OTHER`): Routed to `PUBLIC_WORKS`, flagged for human review.
     - Cases D/E/F (Gemini timeout, rate limit, invalid key, or network fault): `RULE_FALLBACK`, `FALLBACK_COMPLETED`, routed deterministically via rule-based category, flagged for review.

3. **Citizen Triage Transparency (`/complaints/[id]`)**:
   - Citizen-facing **AI Municipal Routing & Triage** card displaying department assignment, model confidence, routing rationale, and observable physical evidence without exposing confidential admin internal notes.
   - Status audit timeline tracking verification progress.

4. **Municipal Admin Command Center (`/admin/*`)**:
   - **Admin Dashboard (`/admin/dashboard`)**: Dedicated Sprint 3 **Automatic Municipal Routing & Triage Telemetry** KPI bar (`Auto-Assigned (AI)`, `Fallback Assigned`, `Flagged for Review`, `Processing Failures`).
   - **Complaint Dossier (`/admin/complaints/[id]`)**: Multimodal visual intelligence panel with provider/model badges (`google-genai / gemini-2.5-flash`), visual evidence list, and uncertainty notes.
   - **Manual Department Override**: Administrators can re-assign departments with mandatory audit logging (`AssignmentMethod.MANUAL`), recording officer identity and timestamp.
   - **AI Correction Modal**: Admins can submit feedback correcting predicted category, severity, and department for model telemetry.

5. **AI Complaint Intelligence Pipeline (`/admin/insights`)**:
   - **Haversine Duplicate Detection**: Spherical GPS distance and TF-IDF Cosine Similarity detecting duplicate reports within 500m.
   - **Multi-Factor Severity & Priority Scoring**: 0-100 explainable score factoring severity (40 pts), duplicate clusters (25 pts), age (20 pts), and category criticality (15 pts).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express.js, TypeScript, Prisma ORM, JWT, bcryptjs, Multer |
| **Database** | PostgreSQL 18 with additive schema migrations |
| **AI Intelligence Service** | Python 3.12+, FastAPI, Uvicorn, Google GenAI SDK (`google-genai` 2.34.0), Scikit-learn, NumPy, Pydantic |
| **Computer Vision** | Google Gemini 2.5 Flash (`gemini-2.5-flash`) via `google-genai` official SDK |
| **Geolocation & Maps** | Browser Geolocation API + OpenStreetMap Nominatim |

---

## 📂 Project Structure

```
sem5Project/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Landing Page
│   │   ├── login/page.tsx              # Auth Login (Role-aware routing)
│   │   ├── register/page.tsx           # Citizen Registration
│   │   ├── dashboard/page.tsx          # Citizen Dashboard
│   │   ├── complaints/new/page.tsx     # Citizen Report Submission (Multimodal AI summary)
│   │   ├── complaints/[id]/page.tsx    # Citizen Tracking & AI Routing Card
│   │   ├── profile/page.tsx            # Citizen Profile Settings
│   │   └── admin/
│   │       ├── layout.tsx              # Admin Shell with RBAC Guard & Sidebar
│   │       ├── dashboard/page.tsx      # Admin Dashboard (KPIs, Sprint 3 Routing Bar)
│   │       ├── complaints/page.tsx     # Full Complaint Management & Multi-Filters
│   │       ├── complaints/[id]/page.tsx# Admin Dossier (Multimodal AI, Manual Override)
│   │       ├── insights/page.tsx       # AI Model Telemetry & Audit Logs
│   │       └── analytics/page.tsx      # SLA Turnaround & Monthly Volume Trends
│   ├── components/                     # AdminSidebar, AdminGuard, Navbar, Badges, Timeline
│   ├── lib/                            # api.ts, auth-context.tsx, utils.ts
│   └── types/                          # Domain models & TypeScript interfaces
│
├── backend/
│   ├── src/
│   │   ├── controllers/                # admin.controller.ts, complaint.controller.ts, auth.controller.ts
│   │   ├── middleware/                 # auth.middleware.ts, image-validation.middleware.ts, error.middleware.ts
│   │   ├── routes/                     # admin.routes.ts, complaint.routes.ts, auth.routes.ts, health.routes.ts
│   │   ├── services/                   # ai.service.ts (Base64 bridge), department.service.ts
│   │   ├── validators/                 # admin.validator.ts, complaint.validator.ts, auth.validator.ts
│   │   ├── scripts/                    # test-api.ts (Sprint 1-3 test suite)
│   │   └── index.ts                    # Express bootstrap & route mounting
│   ├── prisma/                         # schema.prisma (additive Sprint 3 models)
│   └── uploads/                        # Validated image storage directory
│
├── ai-service/
│   ├── app/
│   │   ├── routes/                     # analysis.py (/api/v1/*), health.py (/health)
│   │   ├── services/                   # gemini_vision.py, department_router.py, classifier.py, severity.py, duplicate.py, priority.py
│   │   └── main.py                     # FastAPI bootstrap
│   ├── tests/                          # test_sprint3_ai.py (15 automated test scenarios)
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                               # api-documentation.md
├── README.md
└── .gitignore
```

---

## 🚀 Service Ports & URLs

| Service | Port / URL | Health Check / OpenAPI |
|---|---|---|
| **Citizen & Admin Web App** | `http://localhost:3000` | Front-end Portal |
| **Backend REST API** | `http://localhost:5000` | `http://localhost:5000/health` |
| **AI Intelligence Microservice** | `http://localhost:8001` | `http://localhost:8001/health` |
| **Interactive AI Swagger Docs** | `http://localhost:8001/docs` | OpenAPI UI |

---

## 🔑 Demo Evaluation Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Municipal Admin Officer** | `admin@civicai.org` | `DemoPassword123!` | Full Admin Command Center (`/admin/*`) |
| **Citizen Account** | `citizen@civicai.org` | `DemoPassword123!` | Citizen Portal (`/dashboard`, `/complaints/new`) |

> *Both accounts have one-click quick-fill buttons on the login page (`/login`) for fast demonstration during evaluations.*

---

## ⚙️ Configuring Google Gemini API Key

To enable live Google Gemini 2.5 Flash image inspection:

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. Open `ai-service/.env` (or copy from `ai-service/.env.example`):
   ```ini
   PORT=8001
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   GEMINI_TIMEOUT_SECONDS=30
   ```
3. If no key is set or the key is invalid, the system automatically engages the **Resilient Rule-Based Fallback Engine** (`RULE_FALLBACK`, `FALLBACK_COMPLETED`), ensuring uninterrupted complaint creation and zero downtime.

---

## 💡 How to Start All 3 Services

### 1. Start AI Intelligence Service (Port 8001)
```powershell
cd ai-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### 2. Start Backend Express API (Port 5000)
```powershell
cd backend
npm run dev
```

### 3. Start Next.js Frontend (Port 3000)
```powershell
cd frontend
npm run dev
```

---

## 🧪 Automated Testing & Verification

### 1. AI Service & Gemini Routing Unit & Scenario Tests (15 Tests)
```powershell
cd ai-service
python -m pytest tests/test_sprint3_ai.py -v
```
**Scenarios Verified:**
- Clear Pothole (`POTHOLE` ➔ `ROAD_MAINTENANCE`, `AI_AUTO`, review=false)
- Overflowing Garbage (`GARBAGE` ➔ `SANITATION`, `AI_AUTO`, review=false)
- Water Leakage (`WATER_LEAKAGE` ➔ `WATER_SUPPLY`, `AI_AUTO`, review=false)
- Clogged Drainage (`DRAINAGE` ➔ `DRAINAGE`, `AI_AUTO`, review=false)
- Damaged Streetlight (`STREETLIGHT` ➔ `ELECTRICITY`, `AI_AUTO`, review=false)
- Road Damage / Cracking (`ROAD_DAMAGE` ➔ `ROAD_MAINTENANCE`, `AI_AUTO`, review=false)
- Unrelated Image (`OTHER` ➔ `PUBLIC_WORKS`, review=true)
- Blurry / Low-Confidence Image (confidence < 0.85, review=true)
- Invalid JSON recovery
- API Timeout fallback
- Rate Limit fallback
- Missing / Placeholder API key fallback
- Category `OTHER` always assigned to `PUBLIC_WORKS`
- Invalid department override rejection
- Absolute Always-Assign verification (never null)

### 2. Full End-to-End System Integration Tests (37 Tests)
```powershell
cd backend
npx tsx src/scripts/test-api.ts
```
**Verified Features:**
- Unauthenticated requests rejected (`401`)
- Citizen RBAC protection on admin routes (`403`)
- Admin dashboard telemetry & Sprint 3 KPIs
- Default listing without status filter (all complaints visible)
- Duplicate status transition prevention (`409 Conflict`)
- Accurate SLA turnaround calculation (excludes unresolved)
- Image magic number binary validation (JPEG/PNG/WebP)
- Deterministic department routing via `POST /api/complaints`
- Admin manual department override with audit tracking
- Admin AI prediction feedback submission
- Database integrity: 4 users, 7 existing complaints preserved intact

---

## 🔒 Security & Data Integrity

- **Binary Magic Number Inspection**: Verifies image headers at the byte level before saving to disk.
- **No Hardcoded Secrets**: Gemini API keys are loaded strictly from environment variables on the backend AI microservice and never leaked to the client.
- **Safe Additive Database Changes**: Used `prisma db push` with additive non-breaking fields and enums (`AssignmentMethod`, `AiProcessingStatus`). No database resets or drops occurred.
- **Role-Based Access Control**: All administrative endpoints are guarded by JWT verification and database role checks.
