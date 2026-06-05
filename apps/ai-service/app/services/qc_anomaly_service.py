from __future__ import annotations

from app.models.ai_models import QcAnomalyRequest, QcStatus

# Westgard T4: 4 titik berurutan bergerak searah → potensi drift
_TREND_MIN_POINTS = 4


def _detect_trend(history_values: list[float], current_value: float) -> bool:
    """Kembalikan True jika SEMUA titik dalam window (history + current) bergerak satu arah.

    Butuh minimal _TREND_MIN_POINTS titik total. Seluruh history harus konsisten
    searah — satu titik yang berbalik arah sudah cukup untuk membatalkan deteksi.
    """
    series = history_values + [current_value]
    if len(series) < _TREND_MIN_POINTS:
        return False

    all_rising  = all(series[i] < series[i + 1] for i in range(len(series) - 1))
    all_falling = all(series[i] > series[i + 1] for i in range(len(series) - 1))
    return all_rising or all_falling


def _extract_history_values(history: list[dict]) -> list[float]:
    values: list[float] = []
    for entry in history:
        raw = entry.get("value") or entry.get("control_value")
        if raw is None:
            continue
        try:
            values.append(float(raw))
        except (ValueError, TypeError):
            continue
    return values


def detect(req: QcAnomalyRequest) -> AnomalyResult:
    lo = req.lower_limit
    hi = req.upper_limit
    v  = req.control_value

    in_range = lo <= v <= hi

    if in_range:
        # Masih dalam rentang — cek apakah ada tren menuju batas
        history_values = _extract_history_values(req.history)
        if _detect_trend(history_values, v):
            return AnomalyResult(
                status=QcStatus.potensi_drift,
                reason=(
                    f"Nilai kontrol ({v} {req.unit}) masih dalam rentang ({lo}–{hi}), "
                    f"namun terdapat tren {'naik' if history_values and history_values[-1] < v else 'turun'} "
                    f"konsisten pada {_TREND_MIN_POINTS} titik terakhir."
                ),
                suggestion="Pantau perkembangan nilai kontrol. Pertimbangkan kalibrasi preventif jika tren berlanjut.",
            )
        return AnomalyResult(
            status=QcStatus.stabil,
            reason=f"Nilai kontrol ({v} {req.unit}) dalam rentang yang diterima ({lo}–{hi}).",
            suggestion=None,
        )

    # Di luar rentang — cek apakah ada tren (drift yang sudah terjadi)
    history_values = _extract_history_values(req.history)
    if _detect_trend(history_values, v):
        direction = "naik" if history_values and history_values[-1] < v else "turun"
        return AnomalyResult(
            status=QcStatus.potensi_drift,
            reason=(
                f"Nilai kontrol ({v} {req.unit}) di luar rentang ({lo}–{hi}) "
                f"dengan tren {direction} konsisten pada {_TREND_MIN_POINTS} titik terakhir. "
                f"QC berpotensi drift."
            ),
            suggestion=(
                "Hentikan penggunaan alat untuk pemeriksaan pasien. "
                "Lakukan kalibrasi ulang dan catat hasil dalam log pemeliharaan."
            ),
        )

    # Di luar rentang tanpa tren jelas
    if v > hi:
        deviation = f"di atas batas atas ({hi})"
    else:
        deviation = f"di bawah batas bawah ({lo})"

    return AnomalyResult(
        status=QcStatus.perlu_perhatian,
        reason=f"Nilai kontrol ({v} {req.unit}) {deviation}.",
        suggestion="Kalibrasi ulang alat sebelum digunakan untuk pemeriksaan berikutnya.",
    )


class AnomalyResult:
    def __init__(self, status: QcStatus, reason: str, suggestion: str | None) -> None:
        self.status = status
        self.reason = reason
        self.suggestion = suggestion
