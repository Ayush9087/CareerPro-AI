"""Institution administrator analytics endpoints."""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.services.institution_service import get_institution_dashboard, list_admin_institutions

router = APIRouter()


@router.get("")
async def institution_accessible_list(current_user: CurrentUser, db: DbSession):
    """List institutions only for explicitly authorized institution administrators."""
    return {"institutions": await list_admin_institutions(db, current_user.id)}


@router.get("/{institution_id}/dashboard")
async def institution_dashboard(
    institution_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    return await get_institution_dashboard(db, current_user.id, institution_id)