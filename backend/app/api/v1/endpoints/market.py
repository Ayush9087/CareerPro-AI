"""Job market intelligence endpoints for the authenticated user's role."""

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundException
from app.models.domain import Profile, TargetRole
from app.services.market_intelligence import get_market_intelligence

router = APIRouter()


async def _get_selected_role(db: DbSession, user_id: str):
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    role_stmt = (
        select(TargetRole)
        .where(TargetRole.profile_id == profile.id)
        .order_by(TargetRole.created_at.desc())
        .limit(1)
    )
    target_role = (await db.execute(role_stmt)).scalar_one_or_none()
    if target_role is None:
        raise NotFoundException("Target role")
    return profile, target_role


@router.get("/intelligence")
async def get_intelligence(current_user: CurrentUser, db: DbSession):
    profile, target_role = await _get_selected_role(db, current_user.id)
    return await get_market_intelligence(db, target_role, location=profile.city)


@router.post("/refresh")
async def refresh_intelligence(current_user: CurrentUser, db: DbSession):
    profile, target_role = await _get_selected_role(db, current_user.id)
    return await get_market_intelligence(
        db,
        target_role,
        location=profile.city,
        force_refresh=True,
    )