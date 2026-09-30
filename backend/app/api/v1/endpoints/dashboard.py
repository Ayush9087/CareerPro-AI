"""Aggregated authenticated dashboard data."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter()


@router.get("/summary")
async def dashboard_summary(current_user: CurrentUser, db: DbSession):
    return await get_dashboard_summary(db, current_user.id)