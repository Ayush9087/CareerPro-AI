"""
FastAPI dependency injection utilities.
"""

from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.auth import AuthenticatedUser, get_current_user

# Type aliases for cleaner endpoint signatures
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
