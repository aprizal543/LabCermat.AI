from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    RankedSample,
    SamplePrioritizationRequest,
    SamplePrioritizationResponse,
)

router = APIRouter()


@router.post(
    "/sample-prioritization",
    response_model=SamplePrioritizationResponse,
    tags=["AI — Sample Prioritization"],
)
async def prioritize_samples(
    request: SamplePrioritizationRequest,
) -> SamplePrioritizationResponse:
    logger.info("sample-prioritization called | samples=%d | mode=placeholder", len(request.samples))

    ranked = [
        RankedSample(
            id=sample.id,
            rank=idx + 1,
            score=0.0,
            reason="[PLACEHOLDER] Prioritization not yet implemented",
            estimated_duration_minutes=None,
        )
        for idx, sample in enumerate(request.samples)
    ]

    return SamplePrioritizationResponse(
        ranked_samples=ranked,
        mode="placeholder",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
