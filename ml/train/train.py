"""
QC Anomaly Detection — Training Script
LabCermat Sprint 7

Reads the synthetic QC dataset CSV, trains a Random Forest classifier
(+ Logistic Regression baseline), evaluates on a held-out test split,
and writes all artifacts to --output-dir.

Usage (local smoke test — 500-row subset):
    python train.py --data ../../ml/data/qc_synthetic.csv --output-dir ../../ml/outputs --smoke-test

Usage (Azure ML job — full dataset via mounted input):
    python train.py --data ${{inputs.dataset}} --output-dir ${{outputs.model_dir}}

Artifacts written:
    model.pkl            Random Forest pipeline (scaler + classifier)
    scaler.pkl           StandardScaler (standalone copy for score.py)
    feature_names.json   Ordered list of the 16 input features
    label_mapping.json   {0: "stabil", 1: "perlu_perhatian", 2: "potensi_drift"}
    metrics.json         All evaluation metrics
    confusion_matrix.json Confusion matrix as nested list
"""

import argparse
import json
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FEATURE_COLS = [
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

LABEL_COL = "label"

LABEL_MAPPING = {
    0: "stabil",
    1: "perlu_perhatian",
    2: "potensi_drift",
}

# Minimum targets — training job fails with exit code 1 if not met
MIN_ACCURACY = 0.85
MIN_MACRO_F1 = 0.80


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train QC Anomaly Detection model.")
    p.add_argument(
        "--data", required=True,
        help="Path to the CSV dataset (local file or Azure ML mounted input).",
    )
    p.add_argument(
        "--output-dir", default="outputs",
        help="Directory to write model artifacts (default: outputs/).",
    )
    p.add_argument(
        "--random-state", type=int, default=42,
        help="Random seed for reproducibility (default: 42).",
    )
    p.add_argument(
        "--smoke-test", action="store_true",
        help="If set, subsample 500 rows for a fast local syntax check.",
    )
    return p.parse_args()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_data(path: str, smoke_test: bool, random_state: int) -> pd.DataFrame:
    print(f"Loading dataset: {path}")
    df = pd.read_csv(path)
    print(f"  Rows loaded: {len(df):,}")

    missing = df.isnull().sum().sum()
    if missing > 0:
        raise ValueError(f"Dataset contains {missing} missing values — aborting.")

    for col in FEATURE_COLS + [LABEL_COL]:
        if col not in df.columns:
            raise ValueError(f"Required column missing from dataset: {col!r}")

    if smoke_test:
        df = df.sample(n=min(500, len(df)), random_state=random_state)
        print(f"  Smoke-test mode: using {len(df)} rows.")

    label_counts = df[LABEL_COL].value_counts().sort_index()
    print("  Label distribution:")
    for lbl, cnt in label_counts.items():
        print(f"    {lbl} ({LABEL_MAPPING.get(int(lbl), '?'):20s}): {cnt:6,}  ({cnt/len(df)*100:.1f}%)")

    return df


# ---------------------------------------------------------------------------
# Split
# ---------------------------------------------------------------------------

def split_data(df: pd.DataFrame, random_state: int) -> tuple:
    """Stratified 70 / 15 / 15 split."""
    X = df[FEATURE_COLS].values
    y = df[LABEL_COL].values

    X_train, X_tmp, y_train, y_tmp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=random_state
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=random_state
    )

    print(f"\nSplit sizes — train: {len(y_train):,}  val: {len(y_val):,}  test: {len(y_test):,}")
    return X_train, X_val, X_test, y_train, y_val, y_test


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_baseline(X_train, y_train, random_state: int) -> Pipeline:
    """Logistic Regression baseline — StandardScaler + LR."""
    print("\nTraining baseline (Logistic Regression) ...")
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=random_state,
        )),
    ])
    pipe.fit(X_train, y_train)
    return pipe


def train_main(X_train, y_train, random_state: int) -> Pipeline:
    """Random Forest — StandardScaler + RF with balanced class weights."""
    print("Training main model (Random Forest) ...")
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=100,
            min_samples_split=5,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        )),
    ])
    pipe.fit(X_train, y_train)
    return pipe


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate(pipe: Pipeline, X: np.ndarray, y: np.ndarray, split_name: str) -> dict:
    y_pred = pipe.predict(X)
    acc = float(accuracy_score(y, y_pred))
    macro_f1 = float(f1_score(y, y_pred, average="macro", zero_division=0))
    precision = precision_score(y, y_pred, average=None, zero_division=0).tolist()
    recall = recall_score(y, y_pred, average=None, zero_division=0).tolist()
    cm = confusion_matrix(y, y_pred).tolist()
    classes = sorted(set(y.tolist()))

    print(f"\n  [{split_name}]  accuracy={acc:.4f}  macro_f1={macro_f1:.4f}")
    print(classification_report(
        y, y_pred,
        target_names=[LABEL_MAPPING.get(c, str(c)) for c in classes],
        zero_division=0,
    ))

    return {
        "split": split_name,
        "accuracy": acc,
        "macro_f1": macro_f1,
        "precision_per_class": {LABEL_MAPPING.get(c, str(c)): v for c, v in zip(classes, precision)},
        "recall_per_class": {LABEL_MAPPING.get(c, str(c)): v for c, v in zip(classes, recall)},
        "confusion_matrix": cm,
        "classes": [LABEL_MAPPING.get(c, str(c)) for c in classes],
    }


# ---------------------------------------------------------------------------
# Artifact saving
# ---------------------------------------------------------------------------

def save_artifacts(
    pipe: Pipeline,
    metrics: dict,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    # Full pipeline (scaler + classifier)
    model_path = output_dir / "model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(pipe, f)
    print(f"\nSaved: {model_path}")

    # Standalone scaler (for score.py that may need it independently)
    scaler_path = output_dir / "scaler.pkl"
    with open(scaler_path, "wb") as f:
        pickle.dump(pipe.named_steps["scaler"], f)
    print(f"Saved: {scaler_path}")

    # Feature names — score.py uses this to validate input column order
    feat_path = output_dir / "feature_names.json"
    with open(feat_path, "w") as f:
        json.dump(FEATURE_COLS, f, indent=2)
    print(f"Saved: {feat_path}")

    # Label mapping
    lm_path = output_dir / "label_mapping.json"
    with open(lm_path, "w") as f:
        json.dump({str(k): v for k, v in LABEL_MAPPING.items()}, f, indent=2)
    print(f"Saved: {lm_path}")

    # Full metrics
    metrics_path = output_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved: {metrics_path}")

    # Confusion matrix (convenience copy)
    cm_path = output_dir / "confusion_matrix.json"
    cm_payload = {
        "classes": metrics["test"]["classes"],
        "matrix": metrics["test"]["confusion_matrix"],
    }
    with open(cm_path, "w") as f:
        json.dump(cm_payload, f, indent=2)
    print(f"Saved: {cm_path}")


# ---------------------------------------------------------------------------
# Threshold check
# ---------------------------------------------------------------------------

def check_thresholds(metrics: dict, smoke_test: bool) -> None:
    acc = metrics["test"]["accuracy"]
    f1 = metrics["test"]["macro_f1"]

    print("\n" + "=" * 50)
    print("Threshold Check (test split)")
    print("=" * 50)
    print(f"  accuracy  = {acc:.4f}  (min {MIN_ACCURACY})  {'PASS' if acc >= MIN_ACCURACY else 'FAIL'}")
    print(f"  macro_f1  = {f1:.4f}  (min {MIN_MACRO_F1})  {'PASS' if f1 >= MIN_MACRO_F1 else 'FAIL'}")

    if smoke_test:
        print("\n  Smoke-test mode: threshold failures are warnings only.")
        return

    if acc < MIN_ACCURACY or f1 < MIN_MACRO_F1:
        print("\n  ERROR: Model does not meet minimum quality thresholds.")
        print("  Review dataset, feature engineering, or hyperparameters.")
        sys.exit(1)

    print("\n  All thresholds passed.")
    print("=" * 50)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = _parse_args()
    output_dir = Path(args.output_dir)

    print("=" * 50)
    print("QC Anomaly Detection — Training")
    print(f"  random_state = {args.random_state}")
    print(f"  output_dir   = {output_dir}")
    print(f"  smoke_test   = {args.smoke_test}")
    print("=" * 50)

    df = load_data(args.data, args.smoke_test, args.random_state)
    X_train, X_val, X_test, y_train, y_val, y_test = split_data(df, args.random_state)

    # --- Baseline ---
    baseline = train_baseline(X_train, y_train, args.random_state)
    bl_val = evaluate(baseline, X_val, y_val, "baseline_val")
    bl_test = evaluate(baseline, X_test, y_test, "baseline_test")

    # --- Main model ---
    main_pipe = train_main(X_train, y_train, args.random_state)
    main_val = evaluate(main_pipe, X_val, y_val, "rf_val")
    main_test = evaluate(main_pipe, X_test, y_test, "rf_test")

    # Aggregate metrics for artifact
    metrics = {
        "model": "RandomForestClassifier",
        "baseline": "LogisticRegression",
        "random_state": args.random_state,
        "train_rows": int(len(y_train)),
        "val_rows": int(len(y_val)),
        "test_rows": int(len(y_test)),
        "smoke_test": args.smoke_test,
        "baseline_val": bl_val,
        "baseline_test": bl_test,
        "val": main_val,
        "test": main_test,
        "thresholds": {
            "min_accuracy": MIN_ACCURACY,
            "min_macro_f1": MIN_MACRO_F1,
        },
    }

    save_artifacts(main_pipe, metrics, output_dir)
    check_thresholds(metrics, args.smoke_test)

    print("\nTraining complete.")


if __name__ == "__main__":
    main()
