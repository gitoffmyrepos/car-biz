"""
Weekly Vehicle Leasing Platform - API Router
Salvage-to-Lux Fleet Management

Main API router that includes all sub-routers.
"""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.inquiries import router as inquiries_router
from app.api.admin import router as admin_router

router = APIRouter()

# Include sub-routers
router.include_router(auth_router)
router.include_router(inquiries_router)
router.include_router(admin_router)


@router.get("/status", tags=["Status"])
async def api_status() -> dict[str, str]:
    """API status endpoint."""
    return {
        "status": "operational",
        "message": "API is running",
    }
