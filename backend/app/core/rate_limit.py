"""Process-local per-user rate limits for authenticated API routes."""

import asyncio
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

DEFAULT_LIMIT = (120, 60)
ROUTE_LIMITS = {
    "/api/v1/chat/messages": (20, 300),
    "/api/v1/interviews/start": (8, 3600),
    "/api/v1/roadmap/generate": (6, 3600),
    "/api/v1/resumes/upload": (10, 3600),
    "/api/v1/onboarding/complete": (5, 3600),
    "/api/v1/market/refresh": (8, 3600),
}

_requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()


async def enforce_user_rate_limit(user_id: str, route: str) -> None:
    limit, window = ROUTE_LIMITS.get(route, DEFAULT_LIMIT)
    now = time.monotonic()
    key = (user_id, route)
    async with _lock:
        timestamps = _requests[key]
        while timestamps and timestamps[0] <= now - window:
            timestamps.popleft()
        if len(timestamps) >= limit:
            retry_after = max(1, int(window - (now - timestamps[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )
        timestamps.append(now)
        if len(_requests) > 10000:
            expired_keys = [
                entry_key
                for entry_key, entries in _requests.items()
                if not entries or entries[-1] <= now - max(window, 3600)
            ]
            for entry_key in expired_keys:
                _requests.pop(entry_key, None)