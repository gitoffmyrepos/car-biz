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

            return AuthenticatedUser(
                sub=payload.get("sub", ""),
                email=payload.get("email", ""),
                name=payload.get("name", payload.get("preferred_username", "")),
                preferred_username=payload.get("preferred_username", ""),
                roles=list(set(roles)),  # Deduplicate
                email_verified=payload.get("email_verified", False),
                raw_token=token,
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

        Format: dev:<role>:<email>
        Example: dev:admin:admin@example.com
        """
        if not token.startswith("dev:"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid development token format. Use: dev:<role>:<email>"
            )

        try:
            _, role, email = token.split(":", 2)
            name = email.split("@")[0].replace(".", " ").title()

            return AuthenticatedUser(
                sub=f"dev-user-{email}",
                email=email,
                name=name,
                preferred_username=email.split("@")[0],
                roles=[role],
                email_verified=True,
                raw_token=token,
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid development token format. Use: dev:<role>:<email>"
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
