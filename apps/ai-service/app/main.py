from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import ai_router, root_router
from app.core.config import settings
from app.core.logging import logger


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    logger.info(
        "LabCermat AI Service v%s starting | env=%s | mode=placeholder",
        settings.app_version,
        settings.app_env,
    )
    yield
    logger.info("LabCermat AI Service shutting down")


app = FastAPI(
    title="LabCermat AI Service",
    description="AI service placeholder untuk Sprint 1. Logic AI diimplementasikan di Sprint 6+.",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception | path=%s | error=%s", request.url.path, str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "statusCode": 500,
            "message": "Internal server error",
            "error": type(exc).__name__,
            "path": str(request.url.path),
        },
    )


# Mount routers
app.include_router(root_router)
app.include_router(ai_router)
