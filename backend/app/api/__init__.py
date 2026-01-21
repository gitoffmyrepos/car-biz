"""
Weekly Vehicle Leasing Platform - API Router
Salvage-to-Lux Fleet Management

Main API router that includes all sub-routers.
"""

from fastapi import APIRouter

from app.api.inquiries import router as inquiries_router

router = APIRouter()

# Include sub-routers
router.include_router(inquiries_router)


@router.get("/status", tags=["Status"])
async def api_status() -> dict[str, str]:
    """API status endpoint."""
    return {
        "status": "operational",
        "message": "API is running",
    }
