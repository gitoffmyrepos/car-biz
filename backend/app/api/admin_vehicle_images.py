"""
GigWheels - Admin Vehicle Image API
Weekly car rentals for gig drivers

Admin endpoints for managing a vehicle's public photo gallery:
  - POST   /admin/vehicles/{id}/images            multipart upload
  - PATCH  /admin/vehicles/{id}/images/{image_id} set primary / reorder
  - DELETE /admin/vehicles/{id}/images/{image_id} remove row + object

Images are stored in the public-read vehicle-images bucket and validated at
the boundary (content-type allowlist + max size).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_ops
from app.core.config import settings
from app.core.database import get_db
from app.models.vehicle import Vehicle
from app.models.vehicle_image import VehicleImage
from app.schemas.fleet import FleetImage
from app.services.storage import (
    ALLOWED_VEHICLE_IMAGE_TYPES,
    MAX_VEHICLE_IMAGE_SIZE,
    storage_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


class VehicleImageUpdateRequest(BaseModel):
    """Patch payload for a gallery image."""

    is_primary: Optional[bool] = Field(
        None, description="Mark this image as the gallery primary"
    )
    sort_order: Optional[int] = Field(
        None, ge=0, description="New ordering position (ascending)"
    )


def _public_url(image: VehicleImage) -> str:
    return storage_service.generate_public_url(
        bucket=settings.S3_BUCKET_VEHICLE_IMAGES,
        key=image.image_key,
    )


def _to_response(image: VehicleImage) -> FleetImage:
    return FleetImage(
        id=image.id,
        url=_public_url(image),
        sort_order=image.sort_order,
        is_primary=image.is_primary,
    )


async def _get_vehicle_or_404(session: AsyncSession, vehicle_id: int) -> Vehicle:
    result = await session.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found"
        )
    return vehicle


@router.post(
    "/vehicles/{vehicle_id}/images",
    response_model=FleetImage,
    status_code=status.HTTP_201_CREATED,
)
async def upload_vehicle_image(
    vehicle_id: int,
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
) -> FleetImage:
    """
    Upload a gallery image for a vehicle.

    Validates content-type (jpg/png/webp) and max size (8MB) at the boundary,
    stores the object in the public-read vehicle-images bucket, and creates a
    vehicle_images row. The first image uploaded becomes the primary.
    """
    vehicle = await _get_vehicle_or_404(session, vehicle_id)

    file_content = await file.read()

    is_valid, error_message, detected_type = storage_service.validate_file(
        file_content=file_content,
        filename=file.filename or "upload",
        allowed_types=ALLOWED_VEHICLE_IMAGE_TYPES,
        max_size=MAX_VEHICLE_IMAGE_SIZE,
        upload_type="vehicle_image",
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=error_message
        )

    image_key = storage_service.generate_vehicle_image_key(
        vehicle_id=vehicle.id,
        original_filename=file.filename or "upload",
        mime_type=detected_type,
    )

    uploaded = await storage_service.upload_file(
        file_content=file_content,
        bucket=settings.S3_BUCKET_VEHICLE_IMAGES,
        key=image_key,
        content_type=detected_type,
        upload_type="vehicle_image",
    )
    if not uploaded:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to store image",
        )

    # Determine ordering + primary based on existing gallery.
    existing = (
        (
            await session.execute(
                select(VehicleImage).where(VehicleImage.vehicle_id == vehicle.id)
            )
        )
        .scalars()
        .all()
    )
    next_order = (max((img.sort_order for img in existing), default=-1)) + 1
    is_first = len(existing) == 0

    image = VehicleImage(
        vehicle_id=vehicle.id,
        image_key=image_key,
        sort_order=next_order,
        is_primary=is_first,
    )
    session.add(image)

    # Keep the denormalized primary key in sync for back-compat.
    if is_first:
        vehicle.image_key = image_key

    await session.flush()
    await session.refresh(image)

    logger.info(
        "Admin %s uploaded image %s for vehicle %s",
        user.email,
        image_key,
        vehicle.id,
    )

    return _to_response(image)


@router.patch(
    "/vehicles/{vehicle_id}/images/{image_id}",
    response_model=FleetImage,
)
async def update_vehicle_image(
    vehicle_id: int,
    image_id: int,
    payload: VehicleImageUpdateRequest,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
) -> FleetImage:
    """
    Update a gallery image: set it as primary and/or change its sort order.

    Setting is_primary=True clears the flag on the vehicle's other images and
    updates the denormalized vehicle.image_key.
    """
    await _get_vehicle_or_404(session, vehicle_id)

    result = await session.execute(
        select(VehicleImage).where(
            VehicleImage.id == image_id,
            VehicleImage.vehicle_id == vehicle_id,
        )
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
        )

    if payload.sort_order is not None:
        image.sort_order = payload.sort_order

    if payload.is_primary is not None:
        if payload.is_primary:
            # Clear primary on siblings, then set on this one.
            siblings = (
                (
                    await session.execute(
                        select(VehicleImage).where(
                            VehicleImage.vehicle_id == vehicle_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for sib in siblings:
                sib.is_primary = sib.id == image.id

            vehicle = await _get_vehicle_or_404(session, vehicle_id)
            vehicle.image_key = image.image_key
        else:
            image.is_primary = False

    await session.flush()
    await session.refresh(image)

    logger.info(
        "Admin %s updated image %s (vehicle %s)", user.email, image_id, vehicle_id
    )

    return _to_response(image)


@router.delete(
    "/vehicles/{vehicle_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_vehicle_image(
    vehicle_id: int,
    image_id: int,
    user: AuthenticatedUser = Depends(require_ops),
    session: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a gallery image: removes the row and the stored object.

    If the deleted image was primary, the next-by-order remaining image is
    promoted to primary and the denormalized vehicle.image_key updated.
    """
    vehicle = await _get_vehicle_or_404(session, vehicle_id)

    result = await session.execute(
        select(VehicleImage).where(
            VehicleImage.id == image_id,
            VehicleImage.vehicle_id == vehicle_id,
        )
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
        )

    was_primary = image.is_primary
    deleted_key = image.image_key

    # Best-effort delete of the stored object (logged on failure, not swallowed).
    deleted = await storage_service.delete_file(
        bucket=settings.S3_BUCKET_VEHICLE_IMAGES, key=deleted_key
    )
    if not deleted:
        logger.error(
            "Failed to delete object %s for vehicle %s; removing DB row anyway",
            deleted_key,
            vehicle_id,
        )

    await session.delete(image)
    await session.flush()

    # Promote a new primary if needed.
    if was_primary:
        remaining = (
            (
                await session.execute(
                    select(VehicleImage)
                    .where(VehicleImage.vehicle_id == vehicle_id)
                    .order_by(VehicleImage.sort_order)
                )
            )
            .scalars()
            .all()
        )
        if remaining:
            new_primary = remaining[0]
            new_primary.is_primary = True
            vehicle.image_key = new_primary.image_key
        else:
            vehicle.image_key = None
        await session.flush()

    logger.info(
        "Admin %s deleted image %s (vehicle %s)", user.email, image_id, vehicle_id
    )
