from __future__ import annotations

from app.models.ai_models import SupervisorSummaryRequest


def summarize(req: SupervisorSummaryRequest) -> SupervisorSummaryResult:
    total      = req.total_samples
    validated  = req.validated_count
    recheck    = req.recheck_count
    qc_issues  = req.qc_issues_count

    shift_start_str = req.shift_start.strftime("%H:%M")
    shift_end_str   = req.shift_end.strftime("%H:%M")

    # ── Ringkasan utama ───────────────────────────────────────
    if total == 0:
        summary = (
            f"Tidak ada sampel yang tercatat dalam shift "
            f"{shift_start_str}–{shift_end_str}."
        )
    else:
        validation_rate = (validated / total * 100) if total > 0 else 0
        summary_parts = [
            f"Shift {shift_start_str}–{shift_end_str} mencatat {total} sampel.",
            f"{validated} sampel tervalidasi ({validation_rate:.0f}%).",
        ]
        if recheck > 0:
            summary_parts.append(
                f"{recheck} sampel memerlukan cek ulang."
            )
        if qc_issues > 0:
            summary_parts.append(
                f"{qc_issues} catatan QC memerlukan perhatian."
            )
        summary = " ".join(summary_parts)

    # ── Rekomendasi fokus ─────────────────────────────────────
    recommendations: list[str] = []

    if recheck >= 3:
        recommendations.append(
            f"Terdapat {recheck} sampel minta cek ulang — tinjau catatan analis dan identifikasi pola."
        )
    elif recheck > 0:
        recommendations.append(
            f"{recheck} sampel minta cek ulang — periksa catatan analis sebelum shift berikutnya."
        )

    if qc_issues >= 2:
        recommendations.append(
            f"Terdapat {qc_issues} masalah QC — pastikan kalibrasi semua alat terdampak sudah dilakukan."
        )
    elif qc_issues == 1:
        recommendations.append(
            "1 masalah QC terdeteksi — pastikan kalibrasi alat sudah dilakukan."
        )

    if total > 0:
        validation_rate = validated / total * 100
        pending = total - validated - recheck
        if pending > 0:
            recommendations.append(
                f"{pending} sampel masih dalam proses — pantau kelancaran alur pemeriksaan."
            )
        if validation_rate < 50 and total >= 5:
            recommendations.append(
                "Tingkat validasi di bawah 50% — pertimbangkan evaluasi kapasitas shift."
            )

    if not recommendations:
        recommendations.append("Tidak ada tindakan mendesak yang diperlukan. Lanjutkan pemantauan rutin.")

    # ── Stats ringkas ─────────────────────────────────────────
    stats: dict = {
        "total_samples":    total,
        "validated":        validated,
        "recheck":          recheck,
        "qc_issues":        qc_issues,
        "validation_rate":  round((validated / total * 100) if total > 0 else 0, 1),
    }

    if req.analis_list:
        stats["analis_bertugas"] = req.analis_list

    return SupervisorSummaryResult(
        summary=summary,
        stats=stats,
        focus_recommendations=recommendations,
    )


class SupervisorSummaryResult:
    def __init__(
        self,
        summary: str,
        stats: dict,
        focus_recommendations: list[str],
    ) -> None:
        self.summary = summary
        self.stats = stats
        self.focus_recommendations = focus_recommendations
