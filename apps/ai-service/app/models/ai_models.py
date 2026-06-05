from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================
# ENUMS
# ============================================================

class SamplePriority(str, Enum):
    rutin = "rutin"
    urgent = "urgent"
    cito = "cito"


class SampleStatus(str, Enum):
    menunggu_pemeriksaan = "menunggu_pemeriksaan"
    dalam_proses = "dalam_proses"
    menunggu_review = "menunggu_review"
    tervalidasi = "tervalidasi"
    minta_cek_ulang = "minta_cek_ulang"
    dibatalkan = "dibatalkan"


class FlagStatus(str, Enum):
    normal = "normal"
    perlu_perhatian = "perlu_perhatian"
    perlu_review_supervisor = "perlu_review_supervisor"


class QcStatus(str, Enum):
    stabil = "stabil"
    perlu_perhatian = "perlu_perhatian"
    # potensi_drift hanya ada di output AI (ai_analysis_logs.responseData)
    # tidak disimpan ke tabel qc_records
    potensi_drift = "potensi_drift"


# ============================================================
# SAMPLE PRIORITIZATION
# ============================================================

class SampleItem(BaseModel):
    id: UUID
    sample_type: str
    requested_test: str
    priority: SamplePriority
    received_at: datetime
    status: SampleStatus


class SamplePrioritizationRequest(BaseModel):
    samples: list[SampleItem] = Field(..., min_length=1)


class RankedSample(BaseModel):
    id: UUID
    rank: int
    score: float
    reason: str
    estimated_duration_minutes: Optional[int] = None


class SamplePrioritizationResponse(BaseModel):
    ranked_samples: list[RankedSample]
    mode: str
    processed_at: str


# ============================================================
# RESULT REVIEW
# ============================================================

class ResultItem(BaseModel):
    parameter_name: str
    value: Any  # bisa string atau float; service yang parse
    unit: Optional[str] = None
    reference_min: Optional[Any] = None
    reference_max: Optional[Any] = None


class ResultReviewRequest(BaseModel):
    sample_id: UUID
    results: list[ResultItem] = Field(..., min_length=1)


class ResultReviewResponse(BaseModel):
    sample_id: UUID
    flag_status: FlagStatus
    reason: str
    recommendation: Optional[str] = None
    mode: str
    processed_at: str


# ============================================================
# QC ANOMALY DETECTION
# ============================================================

class QcAnomalyRequest(BaseModel):
    instrument_id: UUID
    control_type: str
    control_value: float
    unit: str
    lower_limit: float
    upper_limit: float
    # Setiap entry berisi minimal {"value": float, "recorded_at": str}
    history: list[dict[str, Any]] = Field(default_factory=list)


class QcAnomalyResponse(BaseModel):
    # status bisa "stabil" | "perlu_perhatian" | "potensi_drift"
    # "potensi_drift" hanya ada di response AI dan ai_analysis_logs.response_data
    # tidak digunakan sebagai status di tabel qc_records
    status: QcStatus
    reason: str
    suggestion: Optional[str] = None
    mode: str
    processed_at: str
    # Azure ML artifact fields (None saat mode=rule_based)
    confidence: Optional[float] = None
    probabilities: Optional[dict[str, float]] = None
    model_version: Optional[str] = None
    fallback_reason: Optional[str] = None


# ============================================================
# SOP ASSISTANT (Sprint 8)
# ============================================================

class SopQuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)
    document_id: Optional[str] = None


class SopSource(BaseModel):
    document_id: str
    title: str
    section: Optional[str] = None
    source_page: Optional[int] = None
    chunk_index: int
    score: Optional[float] = None
    snippet: str


class SopQuestionResponse(BaseModel):
    answer: str
    sources: list[SopSource]
    mode: str
    safety_note: str
    fallback_reason: Optional[str] = None
    processed_at: str


# ============================================================
# SUPERVISOR SUMMARY
# ============================================================

class SupervisorSummaryRequest(BaseModel):
    laboratory_id: UUID
    shift_start: datetime
    shift_end: datetime
    # Field tambahan Sprint 6 — diisi backend sebelum memanggil AI
    total_samples: int = 0
    validated_count: int = 0
    recheck_count: int = 0
    qc_issues_count: int = 0
    analis_list: list[str] = Field(default_factory=list)


class SupervisorSummaryResponse(BaseModel):
    summary: str
    stats: dict[str, Any]
    focus_recommendations: list[str]
    mode: str
    processed_at: str
