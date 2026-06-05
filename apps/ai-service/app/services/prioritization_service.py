from __future__ import annotations

from datetime import datetime, timezone

from app.models.ai_models import (
    RankedSample,
    SampleItem,
    SamplePriority,
    SampleStatus,
)

_PRIORITY_BASE: dict[SamplePriority, float] = {
    SamplePriority.cito: 100.0,
    SamplePriority.urgent: 60.0,
    SamplePriority.rutin: 20.0,
}

_AGE_SCORE_PER_HOUR = 2.0
_AGE_SCORE_MAX = 40.0
_RECHECK_BONUS = 20.0


def _age_score(received_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    received = received_at if received_at.tzinfo else received_at.replace(tzinfo=timezone.utc)
    hours = (now - received).total_seconds() / 3600
    return min(hours * _AGE_SCORE_PER_HOUR, _AGE_SCORE_MAX)


def _build_reason(sample: SampleItem, score: float, age_hours: float) -> str:
    parts: list[str] = []

    priority_label = {
        SamplePriority.cito: "CITO",
        SamplePriority.urgent: "Urgent",
        SamplePriority.rutin: "Rutin",
    }[sample.priority]
    parts.append(f"Prioritas {priority_label}")

    if age_hours >= 1:
        parts.append(f"menunggu {age_hours:.0f} jam")
    elif age_hours > 0:
        minutes = age_hours * 60
        parts.append(f"menunggu {minutes:.0f} menit")

    if sample.status == SampleStatus.minta_cek_ulang:
        parts.append("pernah diminta cek ulang")

    return ", ".join(parts)


def _estimated_duration(sample: SampleItem) -> int | None:
    # Estimasi kasar berdasarkan tipe pemeriksaan — tidak ada data aktual
    test_lower = sample.requested_test.lower()
    if any(k in test_lower for k in ("hematologi", "darah lengkap", "cbc")):
        return 20
    if any(k in test_lower for k in ("kimia", "glukosa", "kolesterol", "ureum", "kreatinin")):
        return 30
    if any(k in test_lower for k in ("urin", "urine", "urinalisis")):
        return 15
    if any(k in test_lower for k in ("mikrobiologi", "kultur", "kultur")):
        return 120
    return None


def prioritize(samples: list[SampleItem]) -> list[RankedSample]:
    scored: list[tuple[SampleItem, float, float]] = []

    for sample in samples:
        base = _PRIORITY_BASE.get(sample.priority, 20.0)
        age_hours = (datetime.now(timezone.utc) - (
            sample.received_at if sample.received_at.tzinfo
            else sample.received_at.replace(tzinfo=timezone.utc)
        )).total_seconds() / 3600
        age = min(age_hours * _AGE_SCORE_PER_HOUR, _AGE_SCORE_MAX)
        recheck = _RECHECK_BONUS if sample.status == SampleStatus.minta_cek_ulang else 0.0
        total_score = base + age + recheck
        scored.append((sample, total_score, age_hours))

    # Sort descending by score; tie-break: older sample first
    scored.sort(key=lambda x: (-x[1], x[2]))

    return [
        RankedSample(
            id=item.id,
            rank=idx + 1,
            score=round(score, 2),
            reason=_build_reason(item, score, age_hours),
            estimated_duration_minutes=_estimated_duration(item),
        )
        for idx, (item, score, age_hours) in enumerate(scored)
    ]
