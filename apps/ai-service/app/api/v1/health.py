from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings
from app.models.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="labcermat-ai-service",
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc).isoformat(),
        mode="placeholder",
    )
