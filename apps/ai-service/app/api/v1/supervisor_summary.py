from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    SupervisorSummaryRequest,
    SupervisorSummaryResponse,
)

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
        "supervisor-summary called | lab_id=%s | shift=%s to %s | mode=placeholder",
        request.laboratory_id,
        request.shift_start.isoformat(),
        request.shift_end.isoformat(),
    )

    return SupervisorSummaryResponse(
        summary="[PLACEHOLDER] Supervisor summary not yet implemented",
        stats={},
        focus_recommendations=[],
        mode="placeholder",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
