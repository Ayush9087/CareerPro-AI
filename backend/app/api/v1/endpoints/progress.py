"""Stored learning and readiness progress endpoints."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.services.progress_service import get_progress_summary

router = APIRouter()


@router.get("/summary")
async def progress_summary(current_user: CurrentUser, db: DbSession):
    return await get_progress_summary(db, current_user.id)