from __future__ import annotations

from app.models.ai_models import FlagStatus, ResultItem

# Outlier threshold: nilai dianggap ekstrem jika melampaui batas
# sejauh ini (sebagai faktor dari rentang referensi)
_EXTREME_FACTOR_HIGH = 2.0   # value > upper * 2 → ekstrem
_EXTREME_FACTOR_LOW  = 0.5   # value < lower * 0.5 → ekstrem (untuk nilai positif)


def _try_parse_float(raw: str | float | None) -> float | None:
    if raw is None:
        return None
    try:
        return float(raw)
    except (ValueError, TypeError):
        return None


def _is_extreme(value: float, ref_min: float | None, ref_max: float | None) -> bool:
    if ref_max is not None and value > ref_max * _EXTREME_FACTOR_HIGH:
        return True
    if ref_min is not None and ref_min > 0 and value < ref_min * _EXTREME_FACTOR_LOW:
        return True
    return False


def _out_of_range(value: float, ref_min: float | None, ref_max: float | None) -> bool:
    if ref_min is not None and value < ref_min:
        return True
    if ref_max is not None and value > ref_max:
        return True
    return False


def _describe_deviation(item: ResultItem, value: float, ref_min: float | None, ref_max: float | None) -> str:
    if ref_max is not None and value > ref_max:
        pct = ((value - ref_max) / ref_max * 100) if ref_max != 0 else 0
        return f"{item.parameter_name}: {value} {item.unit or ''} (di atas batas {ref_max}, +{pct:.0f}%)"
    if ref_min is not None and value < ref_min:
        pct = ((ref_min - value) / ref_min * 100) if ref_min != 0 else 0
        return f"{item.parameter_name}: {value} {item.unit or ''} (di bawah batas {ref_min}, -{pct:.0f}%)"
    return f"{item.parameter_name}: {value} {item.unit or ''}"


def review(results: list[ResultItem]) -> ReviewResult:
    out_of_range_items: list[str] = []
    extreme_items: list[str] = []
    skipped_non_numeric: list[str] = []

    for item in results:
        value = _try_parse_float(item.value)
        if value is None:
            # Nilai tidak bisa di-parse sebagai angka — catat sebagai observasi, jangan paksa flag
            skipped_non_numeric.append(item.parameter_name)
            continue

        ref_min = _try_parse_float(item.reference_min)
        ref_max = _try_parse_float(item.reference_max)

        if ref_min is None and ref_max is None:
            # Tidak ada referensi range — tidak bisa dinilai
            continue

        if _out_of_range(value, ref_min, ref_max):
            desc = _describe_deviation(item, value, ref_min, ref_max)
            out_of_range_items.append(desc)
            if _is_extreme(value, ref_min, ref_max):
                extreme_items.append(desc)

    return ReviewResult(
        out_of_range=out_of_range_items,
        extreme=extreme_items,
        skipped_non_numeric=skipped_non_numeric,
    )


class ReviewResult:
    def __init__(
        self,
        out_of_range: list[str],
        extreme: list[str],
        skipped_non_numeric: list[str],
    ) -> None:
        self.out_of_range = out_of_range
        self.extreme = extreme
        self.skipped_non_numeric = skipped_non_numeric

    @property
    def flag_status(self) -> FlagStatus:
        if self.extreme or len(self.out_of_range) >= 2:
            return FlagStatus.perlu_review_supervisor
        if self.out_of_range:
            return FlagStatus.perlu_perhatian
        return FlagStatus.normal

    @property
    def reason(self) -> str:
        if not self.out_of_range and not self.skipped_non_numeric:
            return "Semua parameter dalam rentang referensi."

        parts: list[str] = []
        if self.out_of_range:
            count = len(self.out_of_range)
            label = "parameter" if count == 1 else "parameter"
            parts.append(f"{count} {label} di luar rentang referensi: {'; '.join(self.out_of_range)}")
        if self.skipped_non_numeric:
            parts.append(
                f"{len(self.skipped_non_numeric)} parameter tidak dapat dinilai secara numerik "
                f"({', '.join(self.skipped_non_numeric)})"
            )
        return ". ".join(parts)

    @property
    def recommendation(self) -> str | None:
        status = self.flag_status
        if status == FlagStatus.normal:
            return None
        if status == FlagStatus.perlu_review_supervisor:
            if self.extreme:
                return (
                    "Terdapat nilai yang sangat menyimpang dari rentang referensi. "
                    "Disarankan supervisor meninjau sebelum hasil dilaporkan."
                )
            return (
                "Terdapat beberapa parameter di luar rentang referensi. "
                "Disarankan supervisor meninjau sebelum hasil dilaporkan."
            )
        # perlu_perhatian
        return "Terdapat parameter di luar rentang referensi. Disarankan dicek ulang oleh analis."
