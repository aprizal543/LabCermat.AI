from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    FlagStatus,
    ResultReviewRequest,
    ResultReviewResponse,
)

router = APIRouter()


@router.post(
    "/result-review",
    response_model=ResultReviewResponse,
    tags=["AI — Result Review"],
)
async def review_result(
    request: ResultReviewRequest,
) -> ResultReviewResponse:
    logger.info("result-review called | sample_id=%s | results=%d | mode=placeholder", request.sample_id, len(request.results))

    return ResultReviewResponse(
        sample_id=request.sample_id,
        flag_status=FlagStatus.normal,
        reason="[PLACEHOLDER] Result review not yet implemented",
        recommendation=None,
        mode="placeholder",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
