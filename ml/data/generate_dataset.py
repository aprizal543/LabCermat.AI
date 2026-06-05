"""
Synthetic QC Anomaly Dataset Generator — LabCermat Sprint 7

Generates a labelled CSV dataset for training the QC Anomaly Detection model.
Labels:
  0 = stabil           (~60%)  value in range, no monotonic trend
  1 = perlu_perhatian  (~30%)  value out of range, no full monotonic trend
  2 = potensi_drift    (~10%)  full monotonic trend >=4 points (value may be in range)

Usage:
  python generate_dataset.py                        # 10 000 rows -> ml/data/qc_synthetic.csv
  python generate_dataset.py --rows 100             # smoke test
  python generate_dataset.py --rows 100 --output /tmp/smoke.csv
  python generate_dataset.py --rows 10000 --random-state 99
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parameter profiles — realistic QC ranges for common lab tests
# ---------------------------------------------------------------------------

PARAM_PROFILES = [
    # (name,        mean,   std,   lower, upper)
    ("Hemoglobin",  13.0,   1.5,   11.0,  16.5),
    ("Leukosit",    7500,   1500,  4000,  11000),
    ("Trombosit",   250000, 50000, 150000, 400000),
    ("Ureum",       25.0,   6.0,   10.0,  50.0),
    ("Kreatinin",   0.95,   0.20,  0.60,  1.30),
]

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
LABEL_MAP = {0: "stabil", 1: "perlu_perhatian", 2: "potensi_drift"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pick_param(rng: np.random.Generator) -> tuple:
    """Return (mean, std, lower, upper) for a random parameter profile."""
    idx = rng.integers(0, len(PARAM_PROFILES))
    _, mean, std, lower, upper = PARAM_PROFILES[idx]
    # Small per-instance jitter on the limits (±3 %) to add realism
    jitter = rng.uniform(-0.03, 0.03)
    lower_j = lower * (1 + jitter)
    upper_j = upper * (1 + jitter)
    # Ensure lower < upper after jitter
    if lower_j >= upper_j:
        lower_j, upper_j = lower, upper
    return mean, std, lower_j, upper_j


def _noise(rng: np.random.Generator, scale: float) -> float:
    """Additive Gaussian noise."""
    return float(rng.normal(0, scale))


def _clamp_history_count(rng: np.random.Generator) -> int:
    """
    Returns 0, 1, 2, or 3 with distribution:
      0 → 20 %   (new instrument / first readings)
      1 → 20 %
      2 → 20 %
      3 → 40 %   (most records have full history)
    """
    return int(rng.choice([0, 1, 2, 3], p=[0.20, 0.20, 0.20, 0.40]))


def _monotonic_trend(values: list[float]) -> int:
    """
    Returns 1 if strictly increasing, -1 if strictly decreasing, 0 otherwise.
    Requires at least 2 values.
    """
    if len(values) < 2:
        return 0
    diffs = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    if all(d > 0 for d in diffs):
        return 1
    if all(d < 0 for d in diffs):
        return -1
    return 0


def _derive_features(cv: float, lo: float, hi: float,
                     h1: float, h2: float, h3: float,
                     hcount: int) -> dict:
    """Compute all derived features from raw inputs."""
    mean_lim = (lo + hi) / 2.0
    range_lim = hi - lo
    dev = cv - mean_lim
    dev_pct = dev / range_lim if range_lim != 0 else 0.0
    in_rng = 1 if lo <= cv <= hi else 0

    # Build the series in chronological order: oldest → newest
    # history_count tells how many hist values are real (non-zero placeholder)
    if hcount == 0:
        series = [cv]
    elif hcount == 1:
        series = [h1, cv]
    elif hcount == 2:
        series = [h2, h1, cv]
    else:
        series = [h3, h2, h1, cv]

    trend = _monotonic_trend(series)

    d1 = cv - h1 if hcount >= 1 else 0.0
    d2 = h1 - h2 if hcount >= 2 else 0.0
    d3 = h2 - h3 if hcount >= 3 else 0.0

    return {
        "control_value":      round(cv, 4),
        "lower_limit":        round(lo, 4),
        "upper_limit":        round(hi, 4),
        "mean_limit":         round(mean_lim, 4),
        "range_limit":        round(range_lim, 4),
        "deviation_from_mean": round(dev, 4),
        "deviation_pct":      round(dev_pct, 4),
        "in_range":           in_rng,
        "hist_1":             round(h1, 4),
        "hist_2":             round(h2, 4),
        "hist_3":             round(h3, 4),
        "hist_delta_1":       round(d1, 4),
        "hist_delta_2":       round(d2, 4),
        "hist_delta_3":       round(d3, 4),
        "trend_sign":         trend,
        "history_count":      hcount,
    }


# ---------------------------------------------------------------------------
# Per-label generators
# ---------------------------------------------------------------------------

def _gen_stabil(rng: np.random.Generator) -> dict:
    """
    Label 0 — stabil.
    Rule: control_value in [lower, upper].
           If hcount >= 3, series must NOT be fully monotonic.
    """
    mean, std, lo, hi = _pick_param(rng)
    noise_scale = std * 0.04

    # Draw a value safely inside the range
    margin = (hi - lo) * 0.05
    cv = float(np.clip(
        rng.normal(mean, std * 0.5) + _noise(rng, noise_scale),
        lo + margin,
        hi - margin,
    ))

    hcount = _clamp_history_count(rng)

    # Generate history values also inside the range, but NOT a full monotonic series
    # Strategy: draw independently from the same in-range distribution
    def _in_range_val() -> float:
        return float(np.clip(
            rng.normal(mean, std * 0.5) + _noise(rng, noise_scale),
            lo + margin,
            hi - margin,
        ))

    for _ in range(20):  # retry loop to guarantee non-monotonic if hcount == 3
        h1 = _in_range_val() if hcount >= 1 else 0.0
        h2 = _in_range_val() if hcount >= 2 else 0.0
        h3 = _in_range_val() if hcount >= 3 else 0.0

        feats = _derive_features(cv, lo, hi, h1, h2, h3, hcount)
        if hcount < 3 or feats["trend_sign"] == 0:
            break
    # If all retries still monotonic (very rare), force by swapping h1 and h3
    if hcount == 3 and feats["trend_sign"] != 0:
        h1, h3 = h3, h1
        feats = _derive_features(cv, lo, hi, h1, h2, h3, hcount)

    feats[LABEL_COL] = 0
    return feats


def _gen_perlu_perhatian(rng: np.random.Generator) -> dict:
    """
    Label 1 — perlu_perhatian.
    Rule: control_value strictly OUTSIDE [lower, upper].
           Series is NOT fully monotonic (at least one reversal).
    """
    mean, std, lo, hi = _pick_param(rng)
    noise_scale = std * 0.04
    margin = (hi - lo) * 0.05

    # Draw an out-of-range value: either below lower or above upper
    if rng.random() < 0.5:
        # Below lower
        cv = float(lo - abs(rng.normal(0, std * 0.3)) - margin + _noise(rng, noise_scale))
    else:
        # Above upper
        cv = float(hi + abs(rng.normal(0, std * 0.3)) + margin + _noise(rng, noise_scale))

    hcount = _clamp_history_count(rng)

    def _mixed_val() -> float:
        # History values may be in or out of range — mix for realism
        if rng.random() < 0.6:
            return float(np.clip(
                rng.normal(mean, std * 0.5) + _noise(rng, noise_scale),
                lo - std * 0.5,
                hi + std * 0.5,
            ))
        else:
            # Randomly out of range
            if rng.random() < 0.5:
                return float(lo - abs(rng.normal(0, std * 0.2)))
            return float(hi + abs(rng.normal(0, std * 0.2)))

    for _ in range(20):
        h1 = _mixed_val() if hcount >= 1 else 0.0
        h2 = _mixed_val() if hcount >= 2 else 0.0
        h3 = _mixed_val() if hcount >= 3 else 0.0

        feats = _derive_features(cv, lo, hi, h1, h2, h3, hcount)
        # perlu_perhatian must NOT have a full monotonic trend
        if hcount < 3 or feats["trend_sign"] == 0:
            break
    # Force break of monotonicity if still monotonic
    if hcount == 3 and feats["trend_sign"] != 0:
        h2 = h1 + _noise(rng, std * 0.1) * (-1 if feats["trend_sign"] == 1 else 1)
        feats = _derive_features(cv, lo, hi, h1, h2, h3, hcount)

    feats[LABEL_COL] = 1
    return feats


def _gen_potensi_drift(rng: np.random.Generator) -> dict:
    """
    Label 2 — potensi_drift.
    Rule: ALL 4 points (h3, h2, h1, cv) form a strictly monotonic series.
           50 % ascending, 50 % descending.
           Value may stay in range (early drift) or exit range (advanced drift).
    """
    mean, std, lo, hi = _pick_param(rng)
    noise_scale = std * 0.015  # small noise — must preserve monotonicity

    # Starting point: near mean, inside range
    start = float(np.clip(rng.normal(mean, std * 0.3), lo * 1.05, hi * 0.95))

    # Step size: small enough that 4 steps stay plausible
    step = float(abs(rng.normal(std * 0.04, std * 0.015)) + noise_scale)
    direction = 1 if rng.random() < 0.5 else -1

    # Build series: h3, h2, h1, cv  (ascending or descending by step)
    h3 = start
    h2 = h3 + direction * step + _noise(rng, noise_scale * 0.3)
    h1 = h2 + direction * step + _noise(rng, noise_scale * 0.3)
    cv = h1 + direction * step + _noise(rng, noise_scale * 0.3)

    # Guarantee strict monotonicity after noise (clamp h values)
    if direction == 1:
        h2 = max(h2, h3 + 1e-6)
        h1 = max(h1, h2 + 1e-6)
        cv = max(cv, h1 + 1e-6)
    else:
        h2 = min(h2, h3 - 1e-6)
        h1 = min(h1, h2 - 1e-6)
        cv = min(cv, h1 - 1e-6)

    hcount = 3  # potensi_drift always has full history

    feats = _derive_features(cv, lo, hi, h1, h2, h3, hcount)
    feats[LABEL_COL] = 2
    return feats


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate(n_rows: int, random_state: int) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    # Target counts per label
    n_stabil = round(n_rows * 0.60)
    n_perhatian = round(n_rows * 0.30)
    n_drift = n_rows - n_stabil - n_perhatian  # remainder → potensi_drift (~10%)

    generators = (
        [_gen_stabil] * n_stabil
        + [_gen_perlu_perhatian] * n_perhatian
        + [_gen_potensi_drift] * n_drift
    )

    # Shuffle so labels are not sequential in the CSV
    rng.shuffle(generators)

    rows = [gen(rng) for gen in generators]
    df = pd.DataFrame(rows, columns=FEATURE_COLS + [LABEL_COL])
    return df


# ---------------------------------------------------------------------------
# Validation report
# ---------------------------------------------------------------------------

def validate(df: pd.DataFrame) -> None:
    print("\n" + "=" * 50)
    print("Dataset Validation Report")
    print("=" * 50)

    print(f"\nTotal rows  : {len(df):,}")
    print(f"Total cols  : {len(df.columns)}")

    print("\nLabel distribution:")
    counts = df[LABEL_COL].value_counts().sort_index()
    for lbl, cnt in counts.items():
        name = LABEL_MAP.get(int(lbl), "unknown")
        pct = cnt / len(df) * 100
        print(f"  {lbl} ({name:20s}): {cnt:6,}  ({pct:.1f} %)")

    missing = df.isnull().sum().sum()
    print(f"\nMissing values: {missing}")
    if missing > 0:
        print("  WARNING — unexpected NaN values detected!")
        sys.exit(1)

    # Sanity: trend_sign for potensi_drift should always be ±1
    drift_rows = df[df[LABEL_COL] == 2]
    non_monotonic_drift = (drift_rows["trend_sign"] == 0).sum()
    if non_monotonic_drift > 0:
        print(f"\n  WARNING — {non_monotonic_drift} potensi_drift rows have trend_sign=0")
        sys.exit(1)

    # Sanity: stabil rows should all be in_range
    stabil_rows = df[df[LABEL_COL] == 0]
    out_of_range_stabil = (stabil_rows["in_range"] == 0).sum()
    if out_of_range_stabil > 0:
        print(f"\n  WARNING — {out_of_range_stabil} stabil rows have in_range=0")
        sys.exit(1)

    # Sanity: perlu_perhatian rows should all be out of range
    perhatian_rows = df[df[LABEL_COL] == 1]
    in_range_perhatian = (perhatian_rows["in_range"] == 1).sum()
    if in_range_perhatian > 0:
        print(f"\n  WARNING — {in_range_perhatian} perlu_perhatian rows have in_range=1")
        sys.exit(1)

    print("\nFeature stats (sample):")
    print(df[["control_value", "deviation_pct", "trend_sign", "history_count"]].describe().round(3).to_string())

    print("\nFirst 5 rows:")
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 120)
    print(df.head().to_string(index=False))

    print("\nAll checks passed.")
    print("=" * 50 + "\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    default_output = str(Path(__file__).parent / "qc_synthetic.csv")
    parser = argparse.ArgumentParser(
        description="Generate synthetic QC anomaly dataset for LabCermat Sprint 7."
    )
    parser.add_argument(
        "--rows", type=int, default=10_000,
        help="Number of rows to generate (default: 10000)",
    )
    parser.add_argument(
        "--output", type=str, default=default_output,
        help=f"Output CSV path (default: {default_output})",
    )
    parser.add_argument(
        "--random-state", type=int, default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    print(f"Generating {args.rows:,} rows  (random_state={args.random_state}) ...")
    df = generate(n_rows=args.rows, random_state=args.random_state)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"Saved: {out_path}")

    validate(df)


if __name__ == "__main__":
    main()
