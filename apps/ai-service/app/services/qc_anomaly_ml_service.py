"""
QC Anomaly Detection — Azure ML Artifact Inference
LabCermat Sprint 7

Loads the sklearn Pipeline artifact trained on Azure ML and runs inference
in-process, bypassing the need for a Managed Online Endpoint.

Mode returned: "azure_ml_artifact"
Fallback mode: "fallback_rule_based" (if artifact missing or inference error)

Artifact location is configured via env var AZURE_ML_MODEL_DIR.
Download artifacts from Azure ML registry with:
    az ml model download --name qc-anomaly-detector --version 1 \
      --download-path ./ml-model-download \
      --resource-group rg-labcermat-ml-eastasia \
      --workspace-name mlw-labcermat
Then set:
    AZURE_ML_MODEL_DIR=./ml-model-download/qc-anomaly-detector/1
"""

from __future__ import annotations

import json
import os
import pickle
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from app.core.logging import logger
from app.models.ai_models import QcAnomalyRequest, QcStatus

# ---------------------------------------------------------------------------
# Feature extraction — must match ml/train/train.py FEATURE_COLS exactly
# ---------------------------------------------------------------------------

_FEATURE_COLS = [
    "control_value",
    "lower_limit",
    "upper_limit",
    "mean_limit",
    "range_limit",
    "deviation_from_mean",
    "deviation_pct",
    "in_range",
    "hist_1",
    "hist_2",
    "hist_3",
    "hist_delta_1",
    "hist_delta_2",
    "hist_delta_3",
    "trend_sign",
    "history_count",
]

_MODEL_VERSION = "qc-anomaly-detector:1"

# Workflow decision-support text — no medical diagnosis
_REASON = {
    "stabil":           "Nilai QC terlihat stabil berdasarkan model Azure ML.",
    "perlu_perhatian":  "Nilai QC menunjukkan ketidaknormalan, perlu perhatian operasional.",
    "potensi_drift":    "Model Azure ML mendeteksi potensi drift pada data QC, pertimbangkan kalibrasi alat.",
}

_SUGGESTION = {
    "stabil":           "Tidak diperlukan tindakan segera. Lanjutkan pemantauan rutin.",
    "perlu_perhatian":  "Periksa kondisi alat dan nilai kontrol. Ulangi pengukuran jika perlu.",
    "potensi_drift":    "Lakukan pengecekan kalibrasi alat. Konsultasikan dengan supervisor.",
}

# ---------------------------------------------------------------------------
# Lazy-loaded model state (loaded once, thread-safe)
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_model = None           # sklearn Pipeline
_label_mapping = None   # {"0": "stabil", "1": "perlu_perhatian", "2": "potensi_drift"}
_load_error: Optional[str] = None   # set if artifact loading fails


def _resolve_model_dir() -> Optional[Path]:
    from app.core.config import settings
    env_dir = settings.azure_ml_model_dir.strip()
    if not env_dir:
        return None
    p = Path(env_dir)
    return p if p.is_dir() else None


def _load_artifacts() -> None:
    """Load model.pkl and label_mapping.json from AZURE_ML_MODEL_DIR.
    Called once — result cached in module globals.
    """
    global _model, _label_mapping, _load_error

    model_dir = _resolve_model_dir()
    if model_dir is None:
        _load_error = "AZURE_ML_MODEL_DIR not set or directory does not exist"
        logger.warning("azure_ml_artifact: %s", _load_error)
        return

    try:
        with open(model_dir / "model.pkl", "rb") as f:
            _model = pickle.load(f)
        with open(model_dir / "label_mapping.json") as f:
            _label_mapping = json.load(f)
        logger.info(
            "azure_ml_artifact: model loaded from %s | labels=%s",
            model_dir,
            list(_label_mapping.values()),
        )
    except Exception as exc:
        _load_error = str(exc)
        _model = None
        _label_mapping = None
        logger.warning("azure_ml_artifact: failed to load artifacts — %s", exc)


def _ensure_loaded() -> bool:
    """Ensure artifacts are loaded exactly once. Returns True if ready."""
    global _model, _label_mapping, _load_error
    with _lock:
        if _model is not None:
            return True
        if _load_error is not None:
            return False  # already tried and failed
        _load_artifacts()
        return _model is not None


# ---------------------------------------------------------------------------
# Feature vector builder
# ---------------------------------------------------------------------------

def _build_feature_vector(req: QcAnomalyRequest) -> list[float]:
    """Extract the 16 model features from a QcAnomalyRequest."""
    lo = float(req.lower_limit)
    hi = float(req.upper_limit)
    v  = float(req.control_value)

    mean_lim  = (lo + hi) / 2.0
    range_lim = hi - lo
    dev       = v - mean_lim
    dev_pct   = dev / range_lim if range_lim != 0 else 0.0
    in_range  = 1 if lo <= v <= hi else 0

    # Extract up to 3 historical values (newest first from the list)
    hist_vals: list[float] = []
    for entry in req.history:
        raw = entry.get("value") or entry.get("control_value")
        if raw is None:
            continue
        try:
            hist_vals.append(float(raw))
        except (ValueError, TypeError):
            continue
        if len(hist_vals) == 3:
            break

    history_count = len(hist_vals)
    # Pad to always 3 slots (0.0 when unavailable — model trained this way)
    while len(hist_vals) < 3:
        hist_vals.append(0.0)

    h1, h2, h3 = hist_vals[0], hist_vals[1], hist_vals[2]
    d1 = v  - h1 if history_count >= 1 else 0.0
    d2 = h1 - h2 if history_count >= 2 else 0.0
    d3 = h2 - h3 if history_count >= 3 else 0.0

    # trend_sign: check full series monotonicity (oldest → newest → current)
    if history_count == 3:
        series = [h3, h2, h1, v]
    elif history_count == 2:
        series = [h2, h1, v]
    elif history_count == 1:
        series = [h1, v]
    else:
        series = [v]

    if len(series) >= 2:
        rising  = all(series[i] < series[i + 1] for i in range(len(series) - 1))
        falling = all(series[i] > series[i + 1] for i in range(len(series) - 1))
        trend_sign = 1 if rising else (-1 if falling else 0)
    else:
        trend_sign = 0

    return [
        v, lo, hi, mean_lim, range_lim, dev, dev_pct,
        in_range,
        h1, h2, h3,
        d1, d2, d3,
        trend_sign, history_count,
    ]


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class MlAnomalyResult:
    status: QcStatus
    reason: str
    suggestion: Optional[str]
    mode: str
    confidence: Optional[float]
    probabilities: Optional[dict]
    model_version: Optional[str]
    fallback_reason: Optional[str]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect(req: QcAnomalyRequest) -> MlAnomalyResult:
    """Run inference using the Azure ML trained artifact.

    Returns mode="azure_ml_artifact" on success.
    Returns mode="fallback_rule_based" with fallback_reason if artifact
    unavailable or inference fails.
    """
    if not _ensure_loaded():
        reason_text = _load_error or "artifact not available"
        logger.warning("azure_ml_artifact fallback: %s", reason_text)
        return _rule_based_fallback(req, reason_text)

    try:
        import numpy as np

        X = np.array([_build_feature_vector(req)], dtype=np.float32)
        y_pred   = _model.predict(X)
        y_proba  = _model.predict_proba(X)

        pred_int    = int(y_pred[0])
        proba_row   = y_proba[0].tolist()
        label_key   = str(pred_int)
        status_str  = _label_mapping.get(label_key, "stabil")
        confidence  = round(float(proba_row[pred_int]), 4)

        # Build all-class probability dict
        probabilities = {
            _label_mapping.get(str(j), str(j)): round(float(p), 4)
            for j, p in enumerate(proba_row)
        }

        status = QcStatus(status_str)
        return MlAnomalyResult(
            status=status,
            reason=_REASON.get(status_str, ""),
            suggestion=_SUGGESTION.get(status_str),
            mode="azure_ml_artifact",
            confidence=confidence,
            probabilities=probabilities,
            model_version=_MODEL_VERSION,
            fallback_reason=None,
        )

    except Exception as exc:
        logger.warning("azure_ml_artifact inference error — falling back: %s", exc)
        return _rule_based_fallback(req, str(exc))


def _rule_based_fallback(req: QcAnomalyRequest, reason: str) -> MlAnomalyResult:
    """Thin wrapper: delegate to rule-based service, annotate with fallback fields."""
    from app.services import qc_anomaly_service
    rb = qc_anomaly_service.detect(req)
    return MlAnomalyResult(
        status=rb.status,
        reason=rb.reason,
        suggestion=rb.suggestion,
        mode="fallback_rule_based",
        confidence=None,
        probabilities=None,
        model_version=None,
        fallback_reason=f"azure_ml_artifact_unavailable: {reason}",
    )
