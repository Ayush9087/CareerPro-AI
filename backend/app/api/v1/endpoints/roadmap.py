"""Roadmap generation and task progress endpoints."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundException
from app.models.domain import Profile
from app.schemas.schemas import RoadmapOut, RoadmapTaskStatusUpdate
from app.services import roadmap_service

router = APIRouter()


async def _profile_id(db: DbSession, user_id: str) -> uuid.UUID:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        raise NotFoundException("Profile")
    return profile_id


@router.get("", response_model=RoadmapOut)
async def get_roadmap(current_user: CurrentUser, db: DbSession):
    profile_id = await _profile_id(db, current_user.id)
    return await roadmap_service.get_active_roadmap(db, profile_id)


@router.post("/generate", response_model=RoadmapOut)
async def generate_roadmap(current_user: CurrentUser, db: DbSession):
    return await roadmap_service.generate_roadmap(db, current_user.id)


@router.patch("/tasks/{task_id}", response_model=RoadmapOut)
async def update_roadmap_task(
    task_id: uuid.UUID,
    data: RoadmapTaskStatusUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    return await roadmap_service.update_task_status(db, current_user.id, task_id, data)