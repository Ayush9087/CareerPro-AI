"""CareerPro AI Advisor chat endpoints."""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.schemas import ChatMessageCreate
from app.services import advisor_service

router = APIRouter()

SUGGESTED_PROMPTS = [
    "Why is my readiness score what it is?",
    "What should I work on today?",
    "Why is TypeScript my highest priority?",
    "How can I improve my interview score?",
    "Which skill should I learn next?",
    "Which project should I improve?",
    "Am I ready to apply for frontend internships?",
]


@router.get("/suggested-prompts")
async def suggested_prompts():
    return {"prompts": SUGGESTED_PROMPTS}


@router.get("/sessions")
async def list_chat_sessions(current_user: CurrentUser, db: DbSession):
    return {"sessions": await advisor_service.list_sessions(db, current_user.id)}


@router.get("/sessions/{session_id}")
async def get_chat_session(session_id: uuid.UUID, current_user: CurrentUser, db: DbSession):
    return await advisor_service.get_session(db, current_user.id, session_id)


@router.post("/messages")
async def send_chat_message(data: ChatMessageCreate, current_user: CurrentUser, db: DbSession):
    return await advisor_service.send_message(db, current_user.id, data)