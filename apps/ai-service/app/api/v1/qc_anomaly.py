from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings
from app.core.logging import logger
from app.models.ai_models import (
    QcAnomalyRequest,
    QcAnomalyResponse,
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
    mode = settings.ai_mode.strip().lower()

    logger.info(
        "qc-anomaly called | instrument_id=%s | control_type=%s | AI_MODE=%s",
        request.instrument_id,
        request.control_type,
        mode,
    )

    if mode == "azure_ml_artifact":
        from app.services import qc_anomaly_ml_service
        result = qc_anomaly_ml_service.detect(request)
        return QcAnomalyResponse(
            status=result.status,
            reason=result.reason,
            suggestion=result.suggestion,
            mode=result.mode,
            processed_at=datetime.now(timezone.utc).isoformat(),
            confidence=result.confidence,
            probabilities=result.probabilities,
            model_version=result.model_version,
            fallback_reason=result.fallback_reason,
        )

    # default: rule_based
    from app.services import qc_anomaly_service
    result = qc_anomaly_service.detect(request)
    return QcAnomalyResponse(
        status=result.status,
        reason=result.reason,
        suggestion=result.suggestion,
        mode="rule_based",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
