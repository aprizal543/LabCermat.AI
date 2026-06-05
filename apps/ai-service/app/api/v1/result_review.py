from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    ResultReviewRequest,
    ResultReviewResponse,
)
from app.services import result_review_service

router = APIRouter()


@router.post(
    "/result-review",
    response_model=ResultReviewResponse,
    tags=["AI — Result Review"],
)
async def review_result(
    request: ResultReviewRequest,
) -> ResultReviewResponse:
    logger.info(
        "result-review called | sample_id=%s | results=%d | mode=rule_based",
        request.sample_id,
        len(request.results),
    )

    result = result_review_service.review(request.results)

    return ResultReviewResponse(
        sample_id=request.sample_id,
        flag_status=result.flag_status,
        reason=result.reason,
        recommendation=result.recommendation,
        mode="rule_based",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
