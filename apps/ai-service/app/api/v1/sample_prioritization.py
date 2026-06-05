from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    SamplePrioritizationRequest,
    SamplePrioritizationResponse,
)
from app.services import prioritization_service

router = APIRouter()


@router.post(
    "/sample-prioritization",
    response_model=SamplePrioritizationResponse,
    tags=["AI — Sample Prioritization"],
)
async def prioritize_samples(
    request: SamplePrioritizationRequest,
) -> SamplePrioritizationResponse:
    logger.info(
        "sample-prioritization called | samples=%d | mode=rule_based",
        len(request.samples),
    )

    ranked = prioritization_service.prioritize(request.samples)

    return SamplePrioritizationResponse(
        ranked_samples=ranked,
        mode="rule_based",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
