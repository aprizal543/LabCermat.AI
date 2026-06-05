"""
QC Anomaly Detection — Scoring Script
LabCermat Sprint 7

Compatible with Azure ML Managed Online Endpoint.
Azure ML calls init() once at startup, then run() for every inference request.

Expected input JSON:
    {
      "input_data": {
        "columns": ["control_value", "lower_limit", ...],
        "data": [[12.8, 11.0, 13.0, ...]]
      }
    }

Output JSON (one object per row):
    [
      {
        "status": "stabil",
        "confidence": 0.95,
        "probabilities": {"stabil": 0.95, "perlu_perhatian": 0.04, "potensi_drift": 0.01},
        "mode": "azure_ml",
        "model_version": "qc-anomaly-detector:1",
        "reason": "...",
        "suggestion": "..."
      }
    ]

Local smoke test (from repo root, with venv active):
    python ml/score/score.py --test
"""

import json
import logging
import os
import pickle
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Globals — populated once in init()
# ---------------------------------------------------------------------------

_model = None          # full sklearn Pipeline (scaler + RF)
_feature_names = None  # list[str] — ordered feature columns
_label_mapping = None  # dict[str, str] — "0" -> "stabil", etc.
_model_version = "qc-anomaly-detector:1"

# ---------------------------------------------------------------------------
# Reason / suggestion text — workflow language only, no medical diagnosis
# ---------------------------------------------------------------------------

_REASON = {
    "stabil": "Nilai QC terlihat stabil berdasarkan model.",
    "perlu_perhatian": "Nilai QC menunjukkan ketidaknormalan — perlu perhatian operasional.",
    "potensi_drift": "Model mendeteksi potensi drift pada data QC — pertimbangkan kalibrasi alat.",
}

_SUGGESTION = {
    "stabil": "Tidak diperlukan tindakan segera. Lanjutkan pemantauan rutin.",
    "perlu_perhatian": "Periksa kondisi alat dan nilai kontrol. Ulangi pengukuran jika perlu.",
    "potensi_drift": "Lakukan pengecekan kalibrasi alat. Konsultasikan dengan supervisor.",
}


# ---------------------------------------------------------------------------
# Artifact loading
# ---------------------------------------------------------------------------

def _resolve_model_dir() -> Path:
    """
    Azure ML sets AZUREML_MODEL_DIR to the directory where model artifacts
    are mounted.  During local smoke test that env-var is absent, so we fall
    back to ml/outputs/smoke (populated by train.py --smoke-test).
    """
    env_dir = os.environ.get("AZUREML_MODEL_DIR")
    if env_dir:
        return Path(env_dir)

    # Local fallback: repo-root relative path for smoke testing
    here = Path(__file__).resolve().parent          # ml/score/
    repo_root = here.parent.parent                  # repo root
    fallback = repo_root / "ml" / "outputs" / "smoke"
    logger.warning(
        "AZUREML_MODEL_DIR not set — using local fallback: %s", fallback
    )
    return fallback


def init():
    """Called once by Azure ML when the endpoint starts."""
    global _model, _feature_names, _label_mapping

    model_dir = _resolve_model_dir()
    logger.info("Loading artifacts from: %s", model_dir)

    with open(model_dir / "model.pkl", "rb") as f:
        _model = pickle.load(f)

    with open(model_dir / "feature_names.json") as f:
        _feature_names = json.load(f)

    with open(model_dir / "label_mapping.json") as f:
        _label_mapping = json.load(f)

    logger.info(
        "Model loaded — features: %d, labels: %s",
        len(_feature_names),
        list(_label_mapping.values()),
    )


# ---------------------------------------------------------------------------
# Input validation & parsing
# ---------------------------------------------------------------------------

def _parse_input(raw_data: str) -> np.ndarray:
    """
    Accepts raw JSON string (as delivered by Azure ML) or a Python dict.
    Returns a 2-D float32 numpy array of shape (n_rows, n_features)
    with columns ordered according to feature_names.json.
    """
    if isinstance(raw_data, str):
        payload = json.loads(raw_data)
    else:
        payload = raw_data

    if "input_data" not in payload:
        raise ValueError("Payload must contain 'input_data' key.")

    input_data = payload["input_data"]

    if "columns" not in input_data:
        raise ValueError("'input_data' must contain 'columns'.")
    if "data" not in input_data:
        raise ValueError("'input_data' must contain 'data'.")

    columns = input_data["columns"]
    data = input_data["data"]

    if not data:
        raise ValueError("'data' must contain at least one row.")

    # Build a column-index map from the incoming payload
    col_index = {col: i for i, col in enumerate(columns)}

    # Verify all required features are present
    missing = [f for f in _feature_names if f not in col_index]
    if missing:
        raise ValueError(
            f"Missing required feature(s) in input: {missing}. "
            f"Required: {_feature_names}"
        )

    # Reorder columns to match feature_names.json regardless of payload order
    n_features = len(_feature_names)
    n_rows = len(data)
    X = np.zeros((n_rows, n_features), dtype=np.float32)
    for feat_idx, feat_name in enumerate(_feature_names):
        src_idx = col_index[feat_name]
        for row_idx, row in enumerate(data):
            X[row_idx, feat_idx] = float(row[src_idx])

    return X


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def run(raw_data):
    """Called by Azure ML for every inference request."""
    try:
        X = _parse_input(raw_data)
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        return json.dumps({"error": str(exc)})

    # Predict class and probability
    y_pred = _model.predict(X)
    y_proba = _model.predict_proba(X)  # shape (n_rows, n_classes)

    # RF classes are sorted integers [0, 1, 2] — matches label_mapping keys
    results = []
    for i, (pred, proba) in enumerate(zip(y_pred, y_proba)):
        label_key = str(int(pred))
        status = _label_mapping.get(label_key, "unknown")
        confidence = float(proba[int(pred)])

        # Build probabilities dict keyed by human label
        probabilities = {
            _label_mapping.get(str(j), str(j)): float(p)
            for j, p in enumerate(proba)
        }

        results.append({
            "status": status,
            "confidence": round(confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in probabilities.items()},
            "mode": "azure_ml",
            "model_version": _model_version,
            "reason": _REASON.get(status, ""),
            "suggestion": _SUGGESTION.get(status, ""),
        })

    return json.dumps(results)


# ---------------------------------------------------------------------------
# Local smoke test
# ---------------------------------------------------------------------------

def _make_sample_payload(label_hint: str = "stabil") -> dict:
    """Return a minimal valid payload for local testing."""
    # Values correspond roughly to a Hemoglobin QC record (lower=11, upper=13)
    payloads = {
        "stabil": {
            "control_value": 12.2, "lower_limit": 11.0, "upper_limit": 13.0,
            "mean_limit": 12.0, "range_limit": 2.0,
            "deviation_from_mean": 0.2, "deviation_pct": 0.10,
            "in_range": 1,
            "hist_1": 12.0, "hist_2": 11.9, "hist_3": 12.1,
            "hist_delta_1": 0.2, "hist_delta_2": 0.1, "hist_delta_3": -0.2,
            "trend_sign": 0, "history_count": 3,
        },
        "perlu_perhatian": {
            "control_value": 14.2, "lower_limit": 11.0, "upper_limit": 13.0,
            "mean_limit": 12.0, "range_limit": 2.0,
            "deviation_from_mean": 2.2, "deviation_pct": 1.10,
            "in_range": 0,
            "hist_1": 13.5, "hist_2": 12.1, "hist_3": 11.8,
            "hist_delta_1": 0.7, "hist_delta_2": 1.4, "hist_delta_3": 0.3,
            "trend_sign": 0, "history_count": 3,
        },
        "potensi_drift": {
            "control_value": 12.9, "lower_limit": 11.0, "upper_limit": 13.0,
            "mean_limit": 12.0, "range_limit": 2.0,
            "deviation_from_mean": 0.9, "deviation_pct": 0.45,
            "in_range": 1,
            "hist_1": 12.6, "hist_2": 12.3, "hist_3": 12.0,
            "hist_delta_1": 0.3, "hist_delta_2": 0.3, "hist_delta_3": 0.3,
            "trend_sign": 1, "history_count": 3,
        },
    }
    values = payloads[label_hint]
    feature_order = list(values.keys())
    return {
        "input_data": {
            "columns": feature_order,
            "data": [[values[c] for c in feature_order]],
        }
    }


def _smoke_test():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true")
    parser.add_argument(
        "--model-dir",
        help="Override model directory (default: AZUREML_MODEL_DIR or ml/outputs/smoke)",
    )
    args = parser.parse_args()

    if args.model_dir:
        os.environ["AZUREML_MODEL_DIR"] = args.model_dir

    print("Initialising model ...")
    init()
    print(f"  Features  : {len(_feature_names)}")
    print(f"  Labels    : {list(_label_mapping.values())}")
    print()

    for hint in ("stabil", "perlu_perhatian", "potensi_drift"):
        payload = _make_sample_payload(hint)
        raw = json.dumps(payload)
        result_json = run(raw)
        result = json.loads(result_json)

        print(f"--- Input hint: {hint} ---")
        print(f"  status      : {result[0]['status']}")
        print(f"  confidence  : {result[0]['confidence']}")
        print(f"  mode        : {result[0]['mode']}")
        print(f"  reason      : {result[0]['reason']}")
        print(f"  suggestion  : {result[0]['suggestion']}")
        print(f"  probs       : {result[0]['probabilities']}")
        print()

    print("Smoke test complete.")


if __name__ == "__main__":
    import sys
    if "--test" in sys.argv:
        _smoke_test()
    else:
        print("Run with --test for local smoke test.")
        print("Usage: python score.py --test [--model-dir <path>]")
