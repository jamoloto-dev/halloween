"""Security and rate limiting utilities for Halloween Quiz."""

import os
import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Thread-safe sliding-window rate limiter per client IP."""

    def __init__(self) -> None:
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: float) -> tuple[bool, int]:
        """Check if request is allowed under rate limits.

        Returns (is_allowed, remaining_requests).
        """
        # Skip rate limiting in test environments or if explicitly disabled
        if os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("false", "0", "no"):
            return True, max_requests
        if os.getenv("ENVIRONMENT", "development").lower() == "testing":
            return True, max_requests

        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            timestamps = self._requests[key]
            # Prune old timestamps
            self._requests[key] = [ts for ts in timestamps if ts > cutoff]
            count = len(self._requests[key])

            if count >= max_requests:
                return False, 0

            self._requests[key].append(now)
            remaining = max_requests - (count + 1)
            return True, remaining


# Global limiter instance
limiter = InMemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP address safely considering X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def rate_limit_start_quiz(request: Request) -> None:
    """Limit quiz creations to 15 per minute per IP."""
    ip = get_client_ip(request)
    allowed, remaining = limiter.check(f"start:{ip}", max_requests=15, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many quiz sessions initiated. Please wait a minute before starting another.",
        )


def rate_limit_quiz_action(request: Request) -> None:
    """Limit gameplay submissions to 60 per minute per IP."""
    ip = get_client_ip(request)
    allowed, remaining = limiter.check(f"action:{ip}", max_requests=60, window_seconds=60.0)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down! You are answering faster than allowed by the crypt keeper.",
        )
