from fastapi import APIRouter

from .health import router as health_router
from .sample_prioritization import router as sample_prioritization_router
from .result_review import router as result_review_router
from .qc_anomaly import router as qc_anomaly_router
from .supervisor_summary import router as supervisor_summary_router

# Router root — health dipasang di /health (tanpa prefix ai/v1)
root_router = APIRouter()
root_router.include_router(health_router)

# Router AI — semua endpoint di bawah /ai/v1
ai_router = APIRouter(prefix="/ai/v1")
ai_router.include_router(sample_prioritization_router)
ai_router.include_router(result_review_router)
ai_router.include_router(qc_anomaly_router)
ai_router.include_router(supervisor_summary_router)
