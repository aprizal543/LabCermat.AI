from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.logging import logger
from app.models.ai_models import (
    QcAnomalyRequest,
    QcAnomalyResponse,
    QcStatus,
)

router = APIRouter()


@router.post(
    "/qc-anomaly",
    response_model=QcAnomalyResponse,
    tags=["AI — QC Anomaly Detection"],
)
async def detect_qc_anomaly(
    request: QcAnomalyRequest,
) -> QcAnomalyResponse:
    logger.info(
        "qc-anomaly called | instrument_id=%s | control_type=%s | mode=placeholder",
        request.instrument_id,
        request.control_type,
    )

    return QcAnomalyResponse(
        status=QcStatus.stabil,
        reason="[PLACEHOLDER] QC anomaly detection not yet implemented",
        suggestion=None,
        mode="placeholder",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
