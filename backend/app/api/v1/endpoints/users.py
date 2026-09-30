"""
Users API endpoints — /api/v1/users
All user identity is derived from the authenticated JWT token.
"""

from fastapi import APIRouter

from app.api.deps import DbSession, CurrentUser
from app.schemas.schemas import ProfileCreate, ProfileUpdate, ProfileOut
from app.services import profile_service
from app.core.exceptions import NotFoundException

router = APIRouter()


@router.get("/me")
async def get_me(current_user: CurrentUser, db: DbSession):
    """Returns the authenticated user's identity and profile."""
    profile = await profile_service.get_profile_by_user_id(db, current_user.id)

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
        },
        "profile": ProfileOut.model_validate(profile) if profile else None,
    }


@router.get("/career-profile")
async def get_career_profile(current_user: CurrentUser, db: DbSession):
    """Returns profile fields and bounded career summaries without raw resume text or storage paths."""
    return await profile_service.get_career_profile(db, current_user.id)


@router.post("/profile", response_model=ProfileOut, status_code=201)
async def create_profile(data: ProfileCreate, current_user: CurrentUser, db: DbSession):
    """Create a user profile during onboarding. User ID comes from the JWT."""
    profile = await profile_service.create_profile(db, current_user.id, data)
    return profile


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(data: ProfileUpdate, current_user: CurrentUser, db: DbSession):
    """Update the authenticated user's profile."""
    profile = await profile_service.update_profile(db, current_user.id, data)
    return profile
