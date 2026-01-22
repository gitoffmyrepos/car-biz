"""
Weekly Vehicle Leasing Platform - Authentication
Salvage-to-Lux Fleet Management

OIDC authentication with Keycloak integration.
Supports development mode with mock authentication.
"""

from datetime import datetime, timezone
from typing import Any, Optional
from dataclasses import dataclass
from enum import Enum

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError

from app.core.config import settings


class UserRole(str, Enum):
    """User roles for RBAC."""
    ADMIN = "admin"
    OPS = "ops"
    CUSTOMER = "customer"


@dataclass
class AuthenticatedUser:
    """Represents an authenticated user from OIDC token."""
    sub: str  # Subject (user ID)
    email: str
    name: str
    preferred_username: str
    roles: list[str]
    email_verified: bool = False
    raw_token: str = ""
    mfa_enabled: bool = False  # Whether user has MFA configured
    mfa_verified: bool = False  # Whether MFA was verified in current session
    acr: str = ""  # Authentication Context Class Reference

    @property
    def is_admin(self) -> bool:
        return UserRole.ADMIN.value in self.roles

    @property
    def is_ops(self) -> bool:
        return UserRole.OPS.value in self.roles or self.is_admin

    @property
    def is_customer(self) -> bool:
        return UserRole.CUSTOMER.value in self.roles

    def has_role(self, role: UserRole) -> bool:
        return role.value in self.roles

    @property
    def admin_mfa_satisfied(self) -> bool:
        """Check if admin MFA requirement is satisfied.

        Admin users must have MFA verified to access admin functions.
        Non-admin users don't need MFA.
        """
        if not self.is_admin:
            return True  # Non-admin users don't need MFA
        return self.mfa_verified


class OIDCAuthenticator:
    """
    OIDC Authentication handler with JWKS validation.

    Supports:
    - Production mode: Full OIDC validation with Keycloak JWKS
    - Development mode: Mock authentication for local testing
    """

    def __init__(self):
        self._jwks_cache: dict[str, Any] = {}
        self._jwks_cache_time: Optional[datetime] = None
        self._jwks_cache_ttl = 3600  # 1 hour
        self._dev_mode = not settings.OIDC_ISSUER_URL

    @property
    def is_dev_mode(self) -> bool:
        """Check if running in development mode (no OIDC configured)."""
        return self._dev_mode

    async def _fetch_jwks(self) -> dict[str, Any]:
        """Fetch JWKS from the OIDC provider."""
        if self._dev_mode:
            return {}

        # Check cache
        now = datetime.now(timezone.utc)
        if (
            self._jwks_cache
            and self._jwks_cache_time
            and (now - self._jwks_cache_time).total_seconds() < self._jwks_cache_ttl
        ):
            return self._jwks_cache

        # Construct JWKS URL
        jwks_url = settings.OIDC_JWKS_URL
        if not jwks_url:
            # Derive from issuer URL (standard OIDC pattern)
            jwks_url = f"{settings.OIDC_ISSUER_URL}/protocol/openid-connect/certs"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_url, timeout=10.0)
                response.raise_for_status()
                self._jwks_cache = response.json()
                self._jwks_cache_time = now
                return self._jwks_cache
        except Exception as e:
            print(f"Failed to fetch JWKS: {e}")
            # Return cached if available
            if self._jwks_cache:
                return self._jwks_cache
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable"
            )

    async def validate_token(self, token: str) -> AuthenticatedUser:
        """
        Validate a JWT token and return the authenticated user.

        In development mode, accepts a special dev token format:
        dev:<role>:<email> (e.g., "dev:admin:admin@example.com")
        """
        if self._dev_mode:
            return self._validate_dev_token(token)

        try:
            # Fetch JWKS
            jwks = await self._fetch_jwks()

            # Decode and validate the token
            # First decode without verification to get the header
            unverified = jwt.get_unverified_header(token)
            kid = unverified.get("kid")

            # Find the matching key
            rsa_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = key
                    break

            if not rsa_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token signing key"
                )

            # Verify and decode
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=settings.OIDC_AUDIENCE or settings.OIDC_CLIENT_ID,
                issuer=settings.OIDC_ISSUER_URL,
            )

            # Extract roles from Keycloak token
            # Keycloak puts roles in realm_access.roles and/or resource_access.<client>.roles
            roles = []

            # Realm roles
            realm_access = payload.get("realm_access", {})
            roles.extend(realm_access.get("roles", []))

            # Client roles
            resource_access = payload.get("resource_access", {})
            client_access = resource_access.get(settings.OIDC_CLIENT_ID, {})
            roles.extend(client_access.get("roles", []))

            # Check for MFA/2FA authentication
            # Keycloak uses 'acr' (Authentication Context Class Reference) to indicate auth level
            # acr=1 typically means password only, acr=2+ means MFA was used
            # Keycloak may also use 'amr' (Authentication Methods References)
            acr = payload.get("acr", "")
            amr = payload.get("amr", [])

            # Check if MFA was verified during this session
            # acr of "urn:mace:incommon:iap:silver" or higher typically indicates MFA
            # Or acr values like "2" or "aal2" indicate MFA
            mfa_verified = (
                acr in ["2", "aal2", "urn:mace:incommon:iap:silver"]
                or "otp" in amr
                or "totp" in amr
                or "mfa" in amr
            )

            # Check if user has MFA enabled (from Keycloak attributes)
            # This is typically in a custom claim like "mfa_enabled" or derived from acr
            mfa_enabled = mfa_verified or payload.get("mfa_enabled", False)

            return AuthenticatedUser(
                sub=payload.get("sub", ""),
                email=payload.get("email", ""),
                name=payload.get("name", payload.get("preferred_username", "")),
                preferred_username=payload.get("preferred_username", ""),
                roles=list(set(roles)),  # Deduplicate
                email_verified=payload.get("email_verified", False),
                raw_token=token,
                mfa_enabled=mfa_enabled,
                mfa_verified=mfa_verified,
                acr=acr,
            )

        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )

    def _validate_dev_token(self, token: str) -> AuthenticatedUser:
        """
        Validate a development token.

        Format: dev:<role>:<email> or dev:<role>:<email>:mfa
        Example: dev:admin:admin@example.com or dev:admin:admin@example.com:mfa
        """
        if not token.startswith("dev:"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid development token format. Use: dev:<role>:<email>[:mfa]"
            )

        try:
            parts = token.split(":")
            if len(parts) < 3:
                raise ValueError("Not enough parts")

            role = parts[1]
            email = parts[2]
            # Check if MFA flag is present (4th part)
            mfa_verified = len(parts) >= 4 and parts[3] == "mfa"
            name = email.split("@")[0].replace(".", " ").title()

            # In dev mode, admin users have MFA enabled by default
            is_admin = role == "admin"
            mfa_enabled = is_admin  # Admin users always have MFA enabled

            return AuthenticatedUser(
                sub=f"dev-user-{email}",
                email=email,
                name=name,
                preferred_username=email.split("@")[0],
                roles=[role],
                email_verified=True,
                raw_token=token,
                mfa_enabled=mfa_enabled,
                mfa_verified=mfa_verified,
                acr="2" if mfa_verified else "1",
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid development token format. Use: dev:<role>:<email>[:mfa]"
            )


# Global authenticator instance
oidc_auth = OIDCAuthenticator()

# Security scheme for OpenAPI documentation
security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts the Bearer token from the Authorization header and validates it.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await oidc_auth.validate_token(credentials.credentials)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency to optionally get the current user.

    Returns None if no valid token is provided instead of raising an exception.
    """
    if credentials is None:
        return None

    try:
        return await oidc_auth.validate_token(credentials.credentials)
    except HTTPException:
        return None


def require_role(role: UserRole):
    """
    Factory function to create a dependency that requires a specific role.

    Usage:
        @app.get("/admin/users")
        async def list_users(user: AuthenticatedUser = Depends(require_role(UserRole.ADMIN))):
            ...
    """
    async def role_checker(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if not user.has_role(role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {role.value}"
            )
        return user

    return role_checker


def require_any_role(*roles: UserRole):
    """
    Factory function to create a dependency that requires any of the specified roles.

    Usage:
        @app.get("/dashboard")
        async def dashboard(user: AuthenticatedUser = Depends(require_any_role(UserRole.ADMIN, UserRole.OPS))):
            ...
    """
    async def role_checker(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        for role in roles:
            if user.has_role(role):
                return user

        role_names = ", ".join(r.value for r in roles)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required one of: {role_names}"
        )

    return role_checker


# Convenience dependencies for common role requirements
require_admin = require_role(UserRole.ADMIN)
require_ops = require_any_role(UserRole.ADMIN, UserRole.OPS)
require_customer = require_role(UserRole.CUSTOMER)


def require_admin_with_mfa():
    """
    Factory function to create a dependency that requires admin role with MFA verified.

    Usage:
        @app.get("/admin/sensitive")
        async def sensitive_data(user: AuthenticatedUser = Depends(require_admin_with_mfa())):
            ...
    """
    async def admin_mfa_checker(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if not user.has_role(UserRole.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. Required role: admin"
            )
        if not user.mfa_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA verification required for admin access. Please complete MFA authentication.",
                headers={"X-MFA-Required": "true"}
            )
        return user

    return admin_mfa_checker


# Admin with MFA requirement dependency
require_admin_mfa = require_admin_with_mfa()
