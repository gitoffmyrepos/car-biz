"""
Weekly Vehicle Leasing Platform - FastAPI Backend
Salvage-to-Lux Fleet Management

Main application entry point with health check and API routing.
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.core.security import SecurityHeadersMiddleware
from app.core.rate_limit import rate_limiter
from app.api import router as api_router
from app.services.background_jobs import background_job_service
from app.workers.email_worker import register_email_handlers

# Import all models to register them with SQLAlchemy before init_db
import app.models  # noqa: F401

# Store background worker task reference
_worker_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    global _worker_task

    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Environment: {settings.APP_ENV}")
    # Initialize database tables
    await init_db()
    print("Database tables initialized")
    print("Rate limiter connected to Redis")

    # Register email job handlers
    register_email_handlers()
    print("Email job handlers registered")

    # Start background job worker
    _worker_task = asyncio.create_task(
        background_job_service.start_worker(poll_interval=1.0)
    )
    print("Background job worker started")

    yield

    # Shutdown
    print(f"Shutting down {settings.APP_NAME}")

    # Stop background job worker
    background_job_service.stop_worker()
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
    await background_job_service.close()
    print("Background job worker stopped")

    # Close rate limiter connection
    await rate_limiter.close()


app = FastAPI(
    title=settings.APP_NAME,
    description="Weekly vehicle leasing platform for salvage-to-lux fleet management",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add security headers middleware (must be added before CORS)
app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS with explicit allowed methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Type",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint for container orchestration.
    Returns application health status including database and Redis connectivity.
    """
    from sqlalchemy import text
    from app.core.database import async_session_maker

    # Track component health statuses
    components = {}
    overall_healthy = True

    # Check database connectivity
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        components["database"] = {"status": "healthy", "type": "postgresql"}
    except Exception as db_error:
        components["database"] = {
            "status": "unhealthy",
            "type": "postgresql",
            "error": str(db_error) if settings.DEBUG else "Connection failed",
        }
        overall_healthy = False

    # Check Redis connectivity
    try:
        redis = await rate_limiter._get_redis()
        await redis.ping()
        components["redis"] = {"status": "healthy", "type": "redis"}
    except Exception as redis_error:
        components["redis"] = {
            "status": "unhealthy",
            "type": "redis",
            "error": str(redis_error) if settings.DEBUG else "Connection failed",
        }
        overall_healthy = False

    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": components,
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
