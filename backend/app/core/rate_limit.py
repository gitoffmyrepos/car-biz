"""
GigWheels - Rate Limiting
Weekly car rentals for gig drivers

Redis-backed rate limiting for API endpoints.
"""

import time
from typing import Optional, Callable
from functools import wraps

from fastapi import HTTPException, Request, status
from redis import asyncio as aioredis

from app.core.config import settings


class RateLimiter:
    """
    Redis-backed rate limiter using sliding window algorithm.

    Provides configurable rate limiting per endpoint and IP.
    """

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def is_rate_limited(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        """
        Check if a key has exceeded rate limit.

        Args:
            key: Unique identifier for rate limiting (e.g., IP:endpoint)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            Tuple of (is_limited, remaining_requests, reset_time_seconds)
        """
        redis = await self._get_redis()
        current_time = time.time()
        window_start = current_time - window_seconds

        # Use Redis pipeline for atomic operations
        pipe = redis.pipeline()

        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current requests in window
        pipe.zcard(key)

        # Add current request with unique timestamp (include microseconds)
        pipe.zadd(key, {str(current_time): current_time})

        # Set key expiration
        pipe.expire(key, window_seconds + 1)

        results = await pipe.execute()
        request_count = results[1]  # zcard result

        remaining = max(0, max_requests - request_count - 1)
        reset_time = window_seconds

        is_limited = request_count >= max_requests

        return is_limited, remaining, reset_time

    async def check_rate_limit(
        self,
        request: Request,
        endpoint: str,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None,
    ) -> dict:
        """
        Check rate limit for a request and raise HTTPException if exceeded.

        Args:
            request: FastAPI request object
            endpoint: Endpoint identifier for rate limiting
            max_requests: Override default max requests
            window_seconds: Override default window

        Returns:
            Dict with rate limit info for headers

        Raises:
            HTTPException: If rate limit exceeded (429)
        """
        max_reqs = max_requests or settings.RATE_LIMIT_REQUESTS
        window = window_seconds or settings.RATE_LIMIT_WINDOW

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Create unique key for this client+endpoint
        key = f"rate_limit:{client_ip}:{endpoint}"

        is_limited, remaining, reset_time = await self.is_rate_limited(
            key, max_reqs, window
        )

        rate_limit_info = {
            "X-RateLimit-Limit": str(max_reqs),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_time),
        }

        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={
                    **rate_limit_info,
                    "Retry-After": str(reset_time),
                },
            )

        return rate_limit_info

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check for forwarded headers (behind proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First IP in the list is the original client
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"

    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(
    max_requests: Optional[int] = None,
    window_seconds: Optional[int] = None,
    endpoint_name: Optional[str] = None,
):
    """
    Decorator to apply rate limiting to an endpoint.

    Usage:
        @router.post("/login")
        @rate_limit(max_requests=5, window_seconds=60)
        async def login(request: Request, ...):
            ...

    Args:
        max_requests: Maximum requests per window (default from settings)
        window_seconds: Window duration in seconds (default from settings)
        endpoint_name: Custom endpoint identifier (default: function name)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract Request from args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get("request")

            if request is None:
                raise ValueError(
                    "rate_limit decorator requires Request parameter in endpoint"
                )

            endpoint = endpoint_name or func.__name__

            # Check rate limit (raises HTTPException if exceeded)
            await rate_limiter.check_rate_limit(
                request,
                endpoint,
                max_requests,
                window_seconds,
            )

            # Call the actual endpoint
            return await func(*args, **kwargs)

        return wrapper
    return decorator


async def rate_limit_dependency(
    request: Request,
    endpoint: str = "default",
    max_requests: Optional[int] = None,
    window_seconds: Optional[int] = None,
) -> dict:
    """
    FastAPI dependency for rate limiting.

    Usage:
        @router.post("/login")
        async def login(
            request: Request,
            rate_info: dict = Depends(lambda r: rate_limit_dependency(r, "login", 5, 60)),
        ):
            ...
    """
    return await rate_limiter.check_rate_limit(
        request, endpoint, max_requests, window_seconds
    )


def create_rate_limit_dependency(
    endpoint: str,
    max_requests: Optional[int] = None,
    window_seconds: Optional[int] = None,
):
    """
    Factory to create a rate limit dependency for a specific endpoint.

    Usage:
        login_rate_limit = create_rate_limit_dependency("login", 5, 60)

        @router.post("/login")
        async def login(request: Request, _: None = Depends(login_rate_limit)):
            ...
    """
    async def dependency(request: Request) -> dict:
        return await rate_limiter.check_rate_limit(
            request, endpoint, max_requests, window_seconds
        )
    return dependency


# Pre-configured rate limits for common endpoints
# Strict limits for authentication endpoints (5 per minute)
auth_rate_limit = create_rate_limit_dependency("auth", 5, 60)

# Moderate limits for sensitive operations (20 per minute)
sensitive_rate_limit = create_rate_limit_dependency("sensitive", 20, 60)

# Standard API limits (100 per minute)
api_rate_limit = create_rate_limit_dependency("api", 100, 60)
