"""
Weekly Vehicle Leasing Platform - API Router
Salvage-to-Lux Fleet Management

Main API router that includes all sub-routers.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/status", tags=["Status"])
async def api_status() -> dict[str, str]:
    """API status endpoint."""
    return {
        "status": "operational",
        "message": "API is running",
    }
