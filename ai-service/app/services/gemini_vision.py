"""
Gemini Vision AI Analysis Service
Sprint 3: Multimodal image understanding for civic issue detection, visual evidence extraction,
and structured classification using Google's official GenAI SDK (google-genai).
Enhanced Reliability: Exponential backoff with random jitter, Retry-After header support,
and permanent error fast-abort.
"""

import os
import re
import json
import time
import random
import logging
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables are loaded
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    load_dotenv()

from enum import Enum
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from pydantic import BaseModel, Field, ValidationError

from google import genai
from google.genai import types

logger = logging.getLogger("civicai.gemini_vision")


# Validated CivicAI Categories (including fine-grained municipal sub-defects & waste management)
class CivicCategoryEnum(str, Enum):
    POTHOLE = "POTHOLE"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    GARBAGE = "GARBAGE"
    OVERFLOWING_DUSTBIN = "OVERFLOWING_DUSTBIN"
    ILLEGAL_GARBAGE_DUMPING = "ILLEGAL_GARBAGE_DUMPING"
    UNCOLLECTED_GARBAGE = "UNCOLLECTED_GARBAGE"
    GARBAGE_BLOCKING_DRAIN = "GARBAGE_BLOCKING_DRAIN"
    OPEN_GARBAGE_DUMP = "OPEN_GARBAGE_DUMP"
    MISSED_GARBAGE_COLLECTION = "MISSED_GARBAGE_COLLECTION"
    GENERAL_WASTE_MANAGEMENT = "GENERAL_WASTE_MANAGEMENT"
    WATER_LEAKAGE = "WATER_LEAKAGE"
    DRAINAGE = "DRAINAGE"
    SEWAGE = "SEWAGE"
    STREETLIGHT = "STREETLIGHT"
    ELECTRICAL_HAZARD = "ELECTRICAL_HAZARD"
    TRAFFIC_SIGNAL = "TRAFFIC_SIGNAL"
    PUBLIC_SAFETY = "PUBLIC_SAFETY"
    OTHER = "OTHER"


# Validated Severity Levels
class CivicSeverityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# Structured Error Categories for Logging & Metrics
class GeminiErrorCategory(str, Enum):
    UNAVAILABLE_503 = "HTTP_503_UNAVAILABLE"
    RATE_LIMIT_429 = "HTTP_429_RATE_LIMIT"
    SERVER_ERROR_5XX = "HTTP_5XX_SERVER_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    UNAUTHORIZED_401 = "HTTP_401_UNAUTHORIZED"
    FORBIDDEN_403 = "HTTP_403_FORBIDDEN"
    NOT_FOUND_404 = "HTTP_404_NOT_FOUND"
    INVALID_ARGUMENT_400 = "HTTP_400_INVALID_ARGUMENT"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    EMPTY_RESPONSE = "EMPTY_RESPONSE"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


@dataclass
class ClassifiedGeminiError:
    category: GeminiErrorCategory
    status_code: Optional[int]
    is_retryable: bool
    retry_after: Optional[float]
    summary_message: str


def sanitize_error_message(msg: str) -> str:
    """Removes API keys, authorization tokens, or sensitive base64 payloads from log messages."""
    if not msg:
        return ""
    # Redact Google API key pattern
    cleaned = re.sub(r'AIza[0-9A-Za-z\-_]{35}', '[REDACTED_API_KEY]', msg)
    # Redact generic api_key / secret key arguments
    cleaned = re.sub(r'(api[_-]?key[\'\"]?\s*[:=]\s*[\'\"]?)[^\s&,\'\"]+', r'\1[REDACTED]', cleaned, flags=re.IGNORECASE)
    # Redact base64 image prefixes
    cleaned = re.sub(r'data:image/[a-zA-Z0-9.+_-]+;base64,[A-Za-z0-9+/=]+', '[REDACTED_IMAGE_DATA]', cleaned)
    if len(cleaned) > 200:
        cleaned = cleaned[:200] + "... [truncated]"
    return cleaned


def extract_status_code(err: Exception) -> Optional[int]:
    """Extracts numeric HTTP status code from exception objects or representations."""
    code = getattr(err, "code", None)
    if isinstance(code, int):
        return code
    code = getattr(err, "status_code", None)
    if isinstance(code, int):
        return code
    resp = getattr(err, "response", None)
    if resp is not None and hasattr(resp, "status_code"):
        return resp.status_code

    # Regex search in error message as fallback
    msg = str(err)
    m = re.search(r'\b(400|401|403|404|429|500|502|503|504)\b', msg)
    if m:
        try:
            return int(m.group(1))
        except (ValueError, TypeError):
            pass
    return None


def extract_retry_after(err: Exception) -> Optional[float]:
    """Extracts Retry-After delay (in seconds) from headers or structured Google RPC details."""
    # 1. From response headers if present
    resp = getattr(err, "response", None)
    if resp is not None and hasattr(resp, "headers"):
        headers = resp.headers
        val = None
        if hasattr(headers, "get"):
            val = headers.get("retry-after") or headers.get("Retry-After")
        if val is not None:
            try:
                return max(0.0, float(val))
            except (ValueError, TypeError):
                try:
                    import email.utils
                    from datetime import datetime, timezone
                    dt = email.utils.parsedate_to_datetime(val)
                    if dt:
                        diff = (dt - datetime.now(timezone.utc)).total_seconds()
                        return max(0.0, diff)
                except Exception:
                    pass

    # 2. From details dict (e.g. Google RPC RetryInfo)
    details = getattr(err, "details", None)
    if isinstance(details, dict):
        err_obj = details.get("error", details)
        if isinstance(err_obj, dict):
            for d in err_obj.get("details", []):
                if isinstance(d, dict) and "retryDelay" in d:
                    delay_s = str(d["retryDelay"]).rstrip("s")
                    try:
                        return max(0.0, float(delay_s))
                    except (ValueError, TypeError):
                        pass

    # 3. Check error string for "retry after X s"
    msg = str(err)
    m = re.search(r'retry\s+(?:in|after)\s+([0-9]+(?:\.[0-9]+)?)\s*s', msg, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except (ValueError, TypeError):
            pass

    return None


def classify_gemini_error(err: Exception) -> ClassifiedGeminiError:
    """Classifies an error into a category, determines retryability, and parses Retry-After."""
    status_code = extract_status_code(err)
    retry_after = extract_retry_after(err)
    summary = sanitize_error_message(str(err))
    msg_upper = str(err).upper()

    # 1. Permanent / Non-Retryable Errors
    if status_code == 401 or "401" in msg_upper or "UNAUTHENTICATED" in msg_upper or "API KEY NOT VALID" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.UNAUTHORIZED_401,
            status_code=401,
            is_retryable=False,
            retry_after=None,
            summary_message=summary
        )

    if status_code == 403 or "403" in msg_upper or "PERMISSION_DENIED" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.FORBIDDEN_403,
            status_code=403,
            is_retryable=False,
            retry_after=None,
            summary_message=summary
        )

    if status_code == 404 or "404" in msg_upper or "NOT_FOUND" in msg_upper or "MODEL NOT FOUND" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.NOT_FOUND_404,
            status_code=404,
            is_retryable=False,
            retry_after=None,
            summary_message=summary
        )

    if status_code == 400 or "400" in msg_upper or "INVALID_ARGUMENT" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.INVALID_ARGUMENT_400,
            status_code=400,
            is_retryable=False,
            retry_after=None,
            summary_message=summary
        )

    if isinstance(err, ValidationError):
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.VALIDATION_ERROR,
            status_code=None,
            is_retryable=False,
            retry_after=None,
            summary_message=summary
        )

    # 2. Transient / Retryable Errors
    if status_code == 503 or "503" in msg_upper or "UNAVAILABLE" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.UNAVAILABLE_503,
            status_code=503,
            is_retryable=True,
            retry_after=retry_after,
            summary_message=summary
        )

    if status_code == 429 or "429" in msg_upper or "RESOURCE_EXHAUSTED" in msg_upper or "QUOTA" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.RATE_LIMIT_429,
            status_code=429,
            is_retryable=True,
            retry_after=retry_after,
            summary_message=summary
        )

    if (status_code and 500 <= status_code < 600) or any(s in msg_upper for s in ("500", "502", "504", "INTERNAL SERVER", "BAD GATEWAY", "GATEWAY TIMEOUT")):
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.SERVER_ERROR_5XX,
            status_code=status_code or 500,
            is_retryable=True,
            retry_after=retry_after,
            summary_message=summary
        )

    if isinstance(err, (TimeoutError,)) or "TIMEOUT" in msg_upper or "TIMED OUT" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.TIMEOUT_ERROR,
            status_code=None,
            is_retryable=True,
            retry_after=None,
            summary_message=summary
        )

    if isinstance(err, (ConnectionError, BrokenPipeError)) or "NETWORK" in msg_upper or "CONNECTION" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.NETWORK_ERROR,
            status_code=None,
            is_retryable=True,
            retry_after=None,
            summary_message=summary
        )

    if "EMPTY RESPONSE" in msg_upper:
        return ClassifiedGeminiError(
            category=GeminiErrorCategory.EMPTY_RESPONSE,
            status_code=None,
            is_retryable=True,
            retry_after=None,
            summary_message=summary
        )

    # Fallback to unknown non-retryable
    return ClassifiedGeminiError(
        category=GeminiErrorCategory.UNKNOWN_ERROR,
        status_code=status_code,
        is_retryable=False,
        retry_after=None,
        summary_message=summary
    )


def compute_backoff_delay(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    jitter: bool = True,
    retry_after: Optional[float] = None
) -> float:
    """
    Calculates exponential backoff with random jitter.
    Strictly prioritizes the API Retry-After header when present.
    """
    if retry_after is not None and retry_after > 0:
        return min(max(retry_after, 0.1), max_delay)

    # Exponential formula: base * 2^(attempt - 1)
    exponential = base_delay * (2 ** (attempt - 1))
    capped = min(exponential, max_delay)

    if jitter:
        # Random jitter between 0.1 and 0.5 * capped
        jitter_val = random.uniform(0.1, 0.5 * capped)
        delay = min(capped + jitter_val, max_delay)
    else:
        delay = capped

    return max(0.1, round(delay, 3))


class GeminiVisionAnalysisResult(BaseModel):
    detected_issue: CivicCategoryEnum = Field(
        ...,
        description="The primary civic issue detected in the photograph (e.g. OVERFLOWING_DUSTBIN, ILLEGAL_GARBAGE_DUMPING, GARBAGE_BLOCKING_DRAIN, POTHOLE, etc.)"
    )
    category: CivicCategoryEnum = Field(
        ...,
        description="The matching CivicAI municipal category"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0 based on visual clarity and distinct defect markers"
    )
    severity: CivicSeverityEnum = Field(
        ...,
        description="Visual severity level: LOW, MEDIUM, or HIGH"
    )
    visual_description: str = Field(
        ...,
        description="Clear, objective description of the observable defect in the photograph"
    )
    evidence: List[str] = Field(
        default_factory=list,
        description="Specific observable visual features present in the image (e.g. cracked asphalt, dark cavity, overflowing waste)"
    )
    detected_objects: List[str] = Field(
        default_factory=list,
        description="Visible physical items or waste materials identified (e.g. plastic bottles, packaging, overflowing bin, organic refuse, storm drain)"
    )
    suggested_action: Optional[str] = Field(
        default=None,
        description="Recommended operational municipal action (e.g. dispatch sanitation compactor, clear drain blockage, replace broken bin)"
    )
    severity_reason: str = Field(
        ...,
        description="Objective physical justification for the assigned severity level based only on observable hazards"
    )
    recommended_department: str = Field(
        ...,
        description="Recommended municipal department for operational resolution"
    )
    requires_human_review: bool = Field(
        default=False,
        description="True if the photograph is blurry, ambiguous, low confidence, or boundary conditions exist"
    )
    uncertainty_reason: Optional[str] = Field(
        default=None,
        description="Reason for uncertainty if confidence < 0.85 or image is unclear"
    )
    model_used: Optional[str] = Field(
        default=None,
        description="Exact Gemini Vision model identifier that produced this analysis"
    )


class GeminiVisionService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        max_attempts: Optional[int] = None,
        base_delay_seconds: Optional[float] = None,
        max_delay_seconds: Optional[float] = None,
        enable_jitter: Optional[bool] = None,
        sleep_fn: Optional[Callable[[float], None]] = None,
    ):
        self.api_key = (api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")).strip()
        self.model_name = (model_name if model_name is not None else os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")).strip()
        self.enabled = os.getenv("GEMINI_ENABLED", "true").lower() in ("true", "1", "yes")
        self.timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
        self.fallback_models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"]
        self.last_error_info: Optional[ClassifiedGeminiError] = None

        # Configurable attempts: 3-4 attempts (default 3)
        raw_attempts = max_attempts if max_attempts is not None else os.getenv("GEMINI_MAX_ATTEMPTS", os.getenv("GEMINI_MAX_RETRIES", "3"))
        try:
            self.max_attempts = max(2, min(4, int(raw_attempts)))
        except (ValueError, TypeError):
            self.max_attempts = 3

        self.base_delay_seconds = float(base_delay_seconds if base_delay_seconds is not None else os.getenv("GEMINI_BASE_DELAY_SECONDS", "1.0"))
        self.max_delay_seconds = float(max_delay_seconds if max_delay_seconds is not None else os.getenv("GEMINI_MAX_DELAY_SECONDS", "10.0"))
        self.enable_jitter = enable_jitter if enable_jitter is not None else (os.getenv("GEMINI_JITTER", "true").lower() in ("true", "1", "yes"))

        # Injectable sleeper for fast unit tests without wall-clock blocking
        self.sleep_fn: Callable[[float], None] = sleep_fn if sleep_fn is not None else time.sleep

        self.client: Optional[genai.Client] = None
        self._init_client()

    def _init_client(self):
        # Guard against empty, descriptive or dummy placeholders
        is_placeholder = (
            not self.api_key or
            self.api_key.startswith("YOUR_") or
            "API_KEY" in self.api_key or
            "testing" in self.api_key.lower() or
            "i will" in self.api_key.lower() or
            "placeholder" in self.api_key.lower() or
            len(self.api_key) < 20
        )
        if self.enabled and not is_placeholder:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("[GeminiVision] Initialized official Google GenAI client with model: %s", self.model_name)
            except Exception as e:
                logger.warning("[GeminiVision] Failed to initialize GenAI client: %s", str(e))
                self.client = None
        else:
            self.client = None
            if not self.enabled:
                logger.info("[GeminiVision] Gemini Vision disabled by configuration.")
            else:
                logger.info("[GeminiVision] No active Gemini API key configured. Local NLP and rule-based pipeline active.")

    def is_available(self) -> bool:
        """Returns True if the client is configured and ready for live multimodal calls."""
        return self.client is not None

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        title: str,
        description: str
    ) -> Optional[GeminiVisionAnalysisResult]:
        """
        Submits image and complaint context to Gemini Vision and validates the structured response.
        Implements exponential backoff with jitter, respects Retry-After, and fast-aborts permanent errors.
        Returns a typed GeminiVisionAnalysisResult or None if unavailable or failing.
        """
        if not self.is_available() or not self.client:
            return None

        prompt = (
            "You are CivicAI Vision, an expert civic infrastructure inspection and triage intelligence system.\n"
            "Analyze the provided photograph along with citizen complaint title and description.\n\n"
            f"Citizen Complaint Title: {title}\n"
            f"Citizen Description: {description}\n\n"
            "INSTRUCTIONS:\n"
            "1. Inspect the photograph carefully to identify the primary observable civic defect.\n"
            "2. Map the defect strictly to one of these verified categories:\n"
            "   --- GARBAGE & WASTE MANAGEMENT ---\n"
            "   - OVERFLOWING_DUSTBIN: Municipal waste bin, dumpster, or trash receptacle overflowing with refuse spilling onto the ground/pavement.\n"
            "   - ILLEGAL_GARBAGE_DUMPING: Unauthorized dumping of commercial, construction, or household trash on roadsides, empty plots, or public spaces.\n"
            "   - UNCOLLECTED_GARBAGE: Accumulation of bagged or loose household/commercial garbage left uncollected in front of premises or streets.\n"
            "   - GARBAGE_BLOCKING_DRAIN: Solid waste, plastic packaging, or debris clogging a stormwater drain, gutter grate, or drainage channel causing blockage or flood risk.\n"
            "   - OPEN_GARBAGE_DUMP: Large uncontrolled open waste ground or massive waste heap generating severe foul odor, vector breeding, and public health hazards.\n"
            "   - MISSED_GARBAGE_COLLECTION: Scheduled curbside bins or designated collection points visibly skipped and unserviced by sanitation trucks.\n"
            "   - GENERAL_WASTE_MANAGEMENT: Scattered roadside litter, plastic debris, or general cleanliness issues requiring municipal street sweeping.\n"
            "   - GARBAGE: General waste accumulation (fallback waste category).\n"
            "   --- OTHER CIVIC INFRASTRUCTURE ---\n"
            "   - POTHOLE: Distinct cavity, crater, or tire-hazard hole in vehicular asphalt/road.\n"
            "   - ROAD_DAMAGE: General bitumen cracking, pavement subsidence, curb destruction, erosion.\n"
            "   - WATER_LEAKAGE: Potable supply pipeline bursts, high-pressure clean water pooling.\n"
            "   - DRAINAGE: Clogged stormwater grates, blocked street culverts, road waterlogging.\n"
            "   - SEWAGE: Wastewater drain backflow, foul black sludge, septic overflow.\n"
            "   - STREETLIGHT: Damaged/broken light fixture, pole damage, dark nocturnal lamp.\n"
            "   - ELECTRICAL_HAZARD: Exposed live wiring, hanging power cables, sparking junction box.\n"
            "   - TRAFFIC_SIGNAL: Broken, malfunctioning, or unpowered vehicular/pedestrian traffic lights.\n"
            "   - PUBLIC_SAFETY: Open hazardous manholes, collapsed safety barriers, imminent collapse.\n"
            "   - OTHER: Unclear, indoor, irrelevant, or non-civic photos lacking visible municipal defects.\n"
            "3. Assess visual severity strictly based on observable hazards:\n"
            "   - CRITICAL: Life-threatening condition (open deep manhole, live wire, or garbage completely choking major storm canal during flood risk).\n"
            "   - HIGH: Deep tire-blowout pothole, active flooding, massive open garbage dump, garbage blocking drainage, toxic/medical waste.\n"
            "   - MEDIUM: Moderate road depression, overflowing waste bin, uncollected curbside bags, localized water leak.\n"
            "   - LOW: Minor surface blemish, small scattered litter, non-critical aesthetic issue.\n"
            "4. Base confidence strictly on image clarity and unambiguous visual proof. If ambiguous or blurry, set requires_human_review=True.\n"
            "5. Extract 2-5 specific observable visual features into evidence, and list identified objects/waste types in detected_objects.\n"
            "6. Output must strictly conform to the JSON schema."
        )

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        )

        last_error_info: Optional[ClassifiedGeminiError] = None

        for attempt in range(1, self.max_attempts + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[image_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=GeminiVisionAnalysisResult,
                        temperature=0.1,
                    ),
                )

                if not response or not response.text:
                    raise ValueError(f"Empty response received from Gemini Vision model '{self.model_name}'.")

                # Parse and validate with Pydantic
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed_dict = json.loads(raw_text.strip())
                validated_result = GeminiVisionAnalysisResult.model_validate(parsed_dict)
                validated_result.model_used = self.model_name
                self.last_error_info = None

                logger.info(
                    "[GeminiVision] Analysis succeeded on attempt %d/%d (model=%s, category=%s, confidence=%.2f)",
                    attempt,
                    self.max_attempts,
                    self.model_name,
                    validated_result.category.value,
                    validated_result.confidence
                )
                return validated_result

            except Exception as e:
                classified = classify_gemini_error(e)
                last_error_info = classified
                self.last_error_info = classified

                if not classified.is_retryable:
                    logger.warning(
                        "[GeminiVision] Attempt %d/%d encountered PERMANENT error [%s] (status=%s). Retries aborted immediately. Reason: %s",
                        attempt,
                        self.max_attempts,
                        classified.category.value,
                        classified.status_code,
                        classified.summary_message
                    )
                    break

                if attempt < self.max_attempts:
                    delay = compute_backoff_delay(
                        attempt=attempt,
                        base_delay=self.base_delay_seconds,
                        max_delay=self.max_delay_seconds,
                        jitter=self.enable_jitter,
                        retry_after=classified.retry_after
                    )
                    reason_str = f"Retry-After header ({classified.retry_after}s)" if classified.retry_after else "exponential backoff with jitter"
                    logger.warning(
                        "[GeminiVision] Attempt %d/%d on model '%s' encountered TRANSIENT error [%s] (status=%s). Retrying in %.2fs via %s...",
                        attempt,
                        self.max_attempts,
                        self.model_name,
                        classified.category.value,
                        classified.status_code,
                        delay,
                        reason_str
                    )
                    self.sleep_fn(delay)
                else:
                    logger.warning(
                        "[GeminiVision] Attempt %d/%d on model '%s' encountered TRANSIENT error [%s] (status=%s). Max attempts reached.",
                        attempt,
                        self.max_attempts,
                        self.model_name,
                        classified.category.value,
                        classified.status_code
                    )

        # Fall back cleanly to local pipeline, never claim success
        logger.error(
            "[GeminiVision] Vision analysis failed after retries (category: %s). Engaging local NLP fallback.",
            last_error_info.category.value if last_error_info else "UNKNOWN"
        )
        return None


# Global singleton instance
gemini_vision_service = GeminiVisionService()
