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
    value: float
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None


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
    history: list[dict[str, Any]] = Field(default_factory=list)


class QcAnomalyResponse(BaseModel):
    status: QcStatus
    reason: str
    suggestion: Optional[str] = None
    mode: str
    processed_at: str


# ============================================================
# SUPERVISOR SUMMARY
# ============================================================

class SupervisorSummaryRequest(BaseModel):
    laboratory_id: UUID
    shift_start: datetime
    shift_end: datetime


class SupervisorSummaryResponse(BaseModel):
    summary: str
    stats: dict[str, Any]
    focus_recommendations: list[str]
    mode: str
    processed_at: str
