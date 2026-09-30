"""Authenticated mock interview session endpoints."""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.schemas import InterviewAnswerIn, InterviewStartIn
from app.services import interview_service

router = APIRouter()


@router.get("/options")
async def interview_options(current_user: CurrentUser, db: DbSession):
    return await interview_service.get_interview_options(db, current_user.id)


@router.get("")
async def list_interviews(current_user: CurrentUser, db: DbSession):
    return {"interviews": await interview_service.list_interviews(db, current_user.id)}


@router.post("/start")
async def start_interview(data: InterviewStartIn, current_user: CurrentUser, db: DbSession):
    return await interview_service.start_interview(db, current_user.id, data)


@router.get("/{interview_id}")
async def get_interview(interview_id: uuid.UUID, current_user: CurrentUser, db: DbSession):
    return await interview_service.get_interview(db, interview_id, current_user.id)


@router.post("/{interview_id}/questions/{question_id}/answer")
async def submit_interview_answer(
    interview_id: uuid.UUID,
    question_id: uuid.UUID,
    data: InterviewAnswerIn,
    current_user: CurrentUser,
    db: DbSession,
):
    return await interview_service.submit_answer(
        db,
        current_user.id,
        interview_id,
        question_id,
        data,
    )