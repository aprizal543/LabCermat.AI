from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    SupervisorSummaryRequest,
    SupervisorSummaryResponse,
)
from app.services import supervisor_summary_service

router = APIRouter()


@router.post(
    "/supervisor-summary",
    response_model=SupervisorSummaryResponse,
    tags=["AI — Supervisor Summary"],
)
async def supervisor_summary(
    request: SupervisorSummaryRequest,
) -> SupervisorSummaryResponse:
    logger.info(
        "supervisor-summary called | lab_id=%s | shift=%s to %s | mode=rule_based",
        request.laboratory_id,
        request.shift_start.isoformat(),
        request.shift_end.isoformat(),
    )

    result = supervisor_summary_service.summarize(request)

    return SupervisorSummaryResponse(
        summary=result.summary,
        stats=result.stats,
        focus_recommendations=result.focus_recommendations,
        mode="rule_based",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
