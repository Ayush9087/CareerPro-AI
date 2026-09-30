"""
Authentication dependency for FastAPI.

Validates the Supabase JWT from the Authorization header.
The backend NEVER trusts a user_id from the frontend —
user identity is always derived from the verified token.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient, PyJWTError
from pydantic import BaseModel
from supabase import create_client

from app.core.config import get_settings
from app.core.rate_limit import enforce_user_rate_limit

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None
_supabase_client = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        settings = get_settings()
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_client


class AuthenticatedUser(BaseModel):
    """Represents the authenticated user derived from the JWT."""
    id: str
    email: str | None = None
    role: str | None = None


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthenticatedUser:
    """
    FastAPI dependency that:
    1. Extracts the Bearer token from the Authorization header.
    2. Verifies it against Supabase JWKS (for ES256/RS256) or JWT secret (for HS256),
       with fallback to Supabase's Auth API.
    3. Returns an AuthenticatedUser with the user's id derived from the verified token.

    Raises HTTP 401 if the token is missing, expired, or invalid.
    """
    settings = get_settings()
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials

    payload: dict | None = None
    user_id: str | None = None
    user_email: str | None = None
    user_role: str | None = None

    # Step 1: Attempt local decode using PyJWKClient (ES256/RS256) or secret (HS256)
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg in ["ES256", "RS256", "EdDSA"]:
            jwks = get_jwks_client()
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={"verify_aud": False, "verify_iss": False},
            )
        else:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_iss": False},
            )

        user_id = payload.get("sub")
        user_email = payload.get("email")
        user_role = payload.get("role") or payload.get("aud")
    except (PyJWTError, Exception) as decode_err:
        logger.warning(f"Local JWT decode failed ({decode_err}), trying Supabase Auth API fallback...")

    # Step 2: Fallback to Supabase Auth API if local decoding didn't succeed
    if not user_id:
        try:
            sb = get_supabase_client()
            user_res = sb.auth.get_user(token)
            if user_res and user_res.user:
                user_id = str(user_res.user.id)
                user_email = user_res.user.email
                user_role = getattr(user_res.user, "role", "authenticated") or "authenticated"
        except Exception as sb_err:
            logger.error(f"Supabase Auth API verification failed: {sb_err}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user_role != "authenticated":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    route = request.scope.get("route")
    route_key = getattr(route, "path", request.url.path)
    await enforce_user_rate_limit(user_id, route_key)

    return AuthenticatedUser(
        id=user_id,
        email=user_email,
        role=user_role,
    )

