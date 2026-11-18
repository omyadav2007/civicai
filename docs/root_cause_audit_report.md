# CivicAI — Comprehensive AI Pipeline Audit & Root Cause Analysis
**Date**: November 18, 2026  
**Auditor**: Senior Full-Stack & Google Gemini AI Engineer  

---

### Executive Findings

An end-to-end technical audit was conducted across the **AI Intelligence Microservice (Python FastAPI / `google-genai` 2.34.0)**, the **Backend REST API (Node.js / Express / Prisma)**, and the **Frontend Web App (Next.js 14 / TypeScript)**.

#### Root Causes Identified:

1. **Why Gemini Was Not Being Used**:
   - `GEMINI_MODEL=gemini-2.5-flash` returned HTTP 404 NOT_FOUND from Google's API:
     `"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash"`.
   - When configured with `gemini-3.8-flash` or `gemini-3.5-flash`, Google's API returned HTTP 503 UNAVAILABLE due to cluster load-shedding during high demand.
   - When querying the official model-listing API (`client.models.list()`), **`gemini-3.5-flash-lite`** and **`gemini-flash-lite-latest`** were discovered to be **100% active, available, and responsive**. A live multimodal test analyzing a real 620 KB citizen photo succeeded with 0.98 confidence in 9.5s.
   - Because the configured model returned 404/503 across retry attempts, the service automatically defaulted to `RULE_FALLBACK`.

2. **Why the Application Returns `RULE_FALLBACK`**:
   - Whenever Gemini call returns `None` (model 404, 503, rate limit, timeout, or missing key), `app/routes/analysis.py` enters the fallback branch, marking `provider="rule-fallback"`, `method="civicai-nlp-rules-v2"`, and `assignment_method="RULE_FALLBACK"`.

3. **Why `image_path` and `image_base64` Contained Empty Values / Path Failures**:
   - For text-only complaints without photo attachments, `uploadedFiles` was empty, so `image_path` and `image_base64` were `undefined`.
   - In `_load_image_bytes()` in `analysis.py`, file path resolution only looked for relative paths matching `backend/uploads/<name>`. When PowerShell or test scripts passed `ai-service/new_pathhole.jpg` or paths with Windows backslashes (`\`), path resolution failed, returning `None`.
   - The system lacked explicit `image_status` metadata to distinguish between a missing image, an invalid/corrupt image, and a verified image.

4. **Why HTTP 200 is Returned Even When Gemini Fails**:
   - The municipal architecture implements an **Always-Assign and Resilient Fallback Policy**: if Gemini is down, the citizen's complaint submission must not crash with HTTP 500. Instead, local NLP triage is engaged.
   - However, the frontend had a display bug on line 167 of `frontend/app/complaints/new/page.tsx`:
     `const isGemini = aiAnalysis?.provider === 'gemini-vision' || complaint.assignmentMethod === 'AI_AUTO';`
     which falsely displayed "AI Vision Analysis Completed" even when the provider was `rule-fallback`.

5. **API Contracts & Communication**:
   - The backend communicates with `http://localhost:8001/api/v1/analyze` and transmits `image_base64`.
   - However, provider metadata (`provider`, `method`, `processing_status`, `fallback_reason`) needed standardization to ensure seamless propagation from Gemini $\rightarrow$ AI Service $\rightarrow$ Express $\rightarrow$ PostgreSQL $\rightarrow$ Frontend UI.

---

### Actionable Repair Plan

1. **Image Handling Architecture**:
   - Universal path resolver in `_load_image_bytes` (handles Windows `\`, Unix `/`, absolute paths, relative paths, and base64 with/without data URI headers).
   - Binary magic number validation (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `RIFF...WEBP`).
   - Clear distinction: `VALID_IMAGE` vs `TEXT_ONLY_NO_IMAGE` vs `INVALID_IMAGE_REJECTED`. Never claim a missing image was visually analyzed.

2. **Gemini Vision Service & Smart Model Fallback**:
   - Default to verified active model **`gemini-3.5-flash-lite`** (with configurable `GEMINI_MODEL`).
   - If the configured model hits 404 or 503, automatically fallback to `gemini-3.5-flash-lite` / `gemini-flash-lite-latest` before falling back to local NLP.
   - Structured JSON schema enforcing `GeminiVisionAnalysisResult`.
   - Support fine-grained civic categories (`POTHOLE`, `ROAD_DAMAGE`, `GARBAGE`, `WATER_LEAKAGE`, `DRAINAGE`, `STREETLIGHT`, `ELECTRICAL_HAZARD`, `SEWAGE`, `TRAFFIC_SIGNAL`, `PUBLIC_SAFETY`, `OTHER`).

3. **Standardized Provider Metadata**:
   - `provider`: `"gemini"` | `"rule-fallback"`
   - `method`: `"gemini-vision"` | `"civicai-nlp-rules-v2"`
   - `processing_status`: `"GEMINI_COMPLETED"` | `"FALLBACK_COMPLETED"` | `"FAILED"`
   - `fallback_reason`: explicit human-readable string when fallback is active, `null` when Gemini succeeds.

4. **Frontend UI Truth in Advertising**:
   - Fix `frontend/app/complaints/new/page.tsx`, `frontend/app/complaints/[id]/page.tsx`, and `frontend/app/admin/complaints/[id]/page.tsx` to strictly check `aiAnalysis.provider === 'gemini'`.
   - Never show Gemini Vision badges when `rule-fallback` processed the complaint. Display the exact provider and fallback reason.

5. **Automated Testing & Data Preservation**:
   - Verify all 4 users and 12 complaints in PostgreSQL remain 100% intact.
   - Run unit and live integration tests.
