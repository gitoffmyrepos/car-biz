"""
Weekly Vehicle Leasing Platform - Auth API
Salvage-to-Lux Fleet Management

Authentication endpoints for OIDC integration.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.auth import (
    AuthenticatedUser,
    get_current_user,
    get_current_user_optional,
    oidc_auth,
)
from app.core.config import settings
from app.core.rate_limit import auth_rate_limit


router = APIRouter(prefix="/auth", tags=["Authentication"])


class OIDCConfigResponse(BaseModel):
    """OIDC configuration for frontend."""
    issuer_url: str
    client_id: str
    authorization_endpoint: str
    token_endpoint: str
    end_session_endpoint: str
    is_dev_mode: bool


class UserInfoResponse(BaseModel):
    """Current user information."""
    sub: str
    email: str
    name: str
    preferred_username: str
    roles: list[str]
    email_verified: bool
    is_admin: bool
    is_ops: bool
    is_customer: bool
    mfa_enabled: bool = False
    mfa_verified: bool = False
    admin_mfa_satisfied: bool = True


class DevLoginRequest(BaseModel):
    """Request body for dev mode login."""
    role: str = "customer"
    email: str = "test@example.com"


class DevLoginResponse(BaseModel):
    """Response for dev mode login."""
    access_token: str
    token_type: str = "bearer"
    user: UserInfoResponse


@router.get("/config", response_model=OIDCConfigResponse)
async def get_oidc_config():
    """
    Get OIDC configuration for frontend.

    Returns the necessary endpoints for frontend to initiate OIDC flow.
    """
    issuer_url = settings.OIDC_ISSUER_URL or "http://localhost:8080/realms/fx-weekly-lease"

    return OIDCConfigResponse(
        issuer_url=issuer_url,
        client_id=settings.OIDC_CLIENT_ID or "fx-weekly-lease-app",
        authorization_endpoint=f"{issuer_url}/protocol/openid-connect/auth",
        token_endpoint=f"{issuer_url}/protocol/openid-connect/token",
        end_session_endpoint=f"{issuer_url}/protocol/openid-connect/logout",
        is_dev_mode=oidc_auth.is_dev_mode,
    )


@router.get("/me", response_model=UserInfoResponse)
async def get_current_user_info(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get current authenticated user information.

    Requires valid Bearer token in Authorization header.
    """
    return UserInfoResponse(
        sub=user.sub,
        email=user.email,
        name=user.name,
        preferred_username=user.preferred_username,
        roles=user.roles,
        email_verified=user.email_verified,
        is_admin=user.is_admin,
        is_ops=user.is_ops,
        is_customer=user.is_customer,
        mfa_enabled=user.mfa_enabled,
        mfa_verified=user.mfa_verified,
        admin_mfa_satisfied=user.admin_mfa_satisfied,
    )


@router.get("/me/optional", response_model=Optional[UserInfoResponse])
async def get_current_user_info_optional(
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
):
    """
    Get current user information if authenticated, otherwise null.

    Does not require authentication - returns null if not authenticated.
    """
    if user is None:
        return None

    return UserInfoResponse(
        sub=user.sub,
        email=user.email,
        name=user.name,
        preferred_username=user.preferred_username,
        roles=user.roles,
        email_verified=user.email_verified,
        is_admin=user.is_admin,
        is_ops=user.is_ops,
        is_customer=user.is_customer,
        mfa_enabled=user.mfa_enabled,
        mfa_verified=user.mfa_verified,
        admin_mfa_satisfied=user.admin_mfa_satisfied,
    )


@router.post("/dev-login", response_model=DevLoginResponse)
async def dev_login(
    request: Request,
    login_request: DevLoginRequest,
    _: None = Depends(auth_rate_limit),
):
    """
    Development-only login endpoint.

    Creates a dev token for testing without Keycloak.
    Only available when OIDC is not configured (dev mode).

    Rate limited: 5 requests per 60 seconds per IP.
    """
    if not oidc_auth.is_dev_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is only available in development mode"
        )

    # Create dev token
    token = f"dev:{login_request.role}:{login_request.email}"

    # Validate it to get user info
    user = await oidc_auth.validate_token(token)

    return DevLoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserInfoResponse(
            sub=user.sub,
            email=user.email,
            name=user.name,
            preferred_username=user.preferred_username,
            roles=user.roles,
            email_verified=user.email_verified,
            is_admin=user.is_admin,
            is_ops=user.is_ops,
            is_customer=user.is_customer,
            mfa_enabled=user.mfa_enabled,
            mfa_verified=user.mfa_verified,
            admin_mfa_satisfied=user.admin_mfa_satisfied,
        ),
    )


@router.post("/verify-token")
async def verify_token(
    user: AuthenticatedUser = Depends(get_current_user),
    _: None = Depends(auth_rate_limit),
):
    """
    Verify a token is valid.

    Returns basic user info if token is valid, 401 if invalid.

    Rate limited: 5 requests per 60 seconds per IP.
    """
    return {
        "valid": True,
        "sub": user.sub,
        "roles": user.roles,
        "mfa_verified": user.mfa_verified,
    }


class DevMFAVerifyRequest(BaseModel):
    """Request body for dev mode MFA verification."""
    totp_code: str


class DevMFAVerifyResponse(BaseModel):
    """Response for dev mode MFA verification."""
    success: bool
    access_token: str
    user: UserInfoResponse


@router.post("/dev-mfa-verify", response_model=DevMFAVerifyResponse)
async def dev_mfa_verify(
    mfa_request: DevMFAVerifyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    _: None = Depends(auth_rate_limit),
):
    """
    Development-only MFA verification endpoint.

    Simulates TOTP verification for testing admin MFA flow.
    Accepts any 6-digit code in dev mode.

    Rate limited: 5 requests per 60 seconds per IP.
    """
    if not oidc_auth.is_dev_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev MFA verification is only available in development mode"
        )

    # In dev mode, accept any 6-digit code
    if not mfa_request.totp_code or len(mfa_request.totp_code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code. Please enter a 6-digit code."
        )

    if not mfa_request.totp_code.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code. Code must contain only digits."
        )

    # Create new token with MFA verified
    new_token = f"dev:{user.roles[0]}:{user.email}:mfa"

    # Validate the new token to get updated user info
    verified_user = await oidc_auth.validate_token(new_token)

    return DevMFAVerifyResponse(
        success=True,
        access_token=new_token,
        user=UserInfoResponse(
            sub=verified_user.sub,
            email=verified_user.email,
            name=verified_user.name,
            preferred_username=verified_user.preferred_username,
            roles=verified_user.roles,
            email_verified=verified_user.email_verified,
            is_admin=verified_user.is_admin,
            is_ops=verified_user.is_ops,
            is_customer=verified_user.is_customer,
            mfa_enabled=verified_user.mfa_enabled,
            mfa_verified=verified_user.mfa_verified,
            admin_mfa_satisfied=verified_user.admin_mfa_satisfied,
        ),
    )
