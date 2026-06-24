"""
GigWheels - Waitlist API

Public pre-launch waitlist signup (drivers + owners) and an admin list view.
On signup we store the entry and dispatch to n8n (thank-you email + CRM lead),
with a direct email/CRM fallback if n8n isn't wired yet.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.waitlist import WaitlistEntry, WaitlistRole
from app.schemas.waitlist import (
    WaitlistCreate,
    WaitlistListResponse,
    WaitlistResponse,
    WaitlistSubmitResponse,
)
from app.services import waitlist_dispatch

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


async def _dispatch_async(entry_id: int) -> None:
    """Re-load the entry in a fresh session and dispatch (email + CRM)."""
    from app.core.database import async_session_maker
    async with async_session_maker() as db:
        entry = await db.get(WaitlistEntry, entry_id)
        if not entry:
            return
        await waitlist_dispatch.dispatch(entry)
        if not entry.synced_to_crm:
            # mark dispatched (best-effort; n8n owns final CRM state)
            entry.synced_to_crm = True
            await db.commit()


@router.post(
    "/",
    response_model=WaitlistSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join the waitlist",
)
async def join_waitlist(
    data: WaitlistCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> WaitlistSubmitResponse:
    entry = WaitlistEntry(
        role=data.role,
        full_name=data.full_name,
        email=str(data.email),
        phone=data.phone,
        city=data.city,
        vehicle_make=data.vehicle_make,
        vehicle_model=data.vehicle_model,
        vehicle_year=data.vehicle_year,
        vehicle_count=data.vehicle_count,
        vehicle_type=data.vehicle_type,
        business_categories=[c.value for c in data.business_categories] if data.business_categories else None,
        notes=data.notes,
        ip_address=(request.client.host if request.client else None),
        user_agent=request.headers.get("user-agent", "")[:500],
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    background_tasks.add_task(_dispatch_async, entry.id)

    msg = ("You're on the owner waitlist — we'll reach out at launch."
           if data.role == WaitlistRole.OWNER
           else "You're on the driver waitlist — we'll reach out at launch.")
    return WaitlistSubmitResponse(success=True, message=msg, id=entry.id)


@router.get(
    "/",
    response_model=WaitlistListResponse,
    summary="List waitlist entries (admin)",
)
async def list_waitlist(
    role: WaitlistRole | None = None,
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> WaitlistListResponse:
    # NOTE: mounted behind the admin router guard in app wiring; if exposed
    # directly, add an auth dependency here.
    stmt = select(WaitlistEntry).order_by(WaitlistEntry.created_at.desc())
    count_stmt = select(func.count(WaitlistEntry.id))
    if role:
        stmt = stmt.where(WaitlistEntry.role == role)
        count_stmt = count_stmt.where(WaitlistEntry.role == role)
    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt.limit(limit).offset(offset))).scalars().all()
    return WaitlistListResponse(
        items=[WaitlistResponse.model_validate(r) for r in rows],
        total=total,
    )
