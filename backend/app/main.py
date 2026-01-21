"""
Weekly Vehicle Leasing Platform - FastAPI Backend
Salvage-to-Lux Fleet Management

Main application entry point with health check and API routing.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Environment: {settings.APP_ENV}")
    yield
    # Shutdown
    print(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    description="Weekly vehicle leasing platform for salvage-to-lux fleet management",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint for container orchestration.
    Returns application health status.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else "API documentation disabled in production",
    }


# Include API router
app.include_router(api_router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for unhandled errors."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred" if not settings.DEBUG else str(exc),
        },
    )
