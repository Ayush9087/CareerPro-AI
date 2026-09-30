"""CareerPro advisor with intent-scoped student context retrieval."""

import logging
import re
import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.chatbot_ai import get_chat_response
from app.core.exceptions import NotFoundException
from app.models.domain import (
    ChatMessage,
    ChatSession,
    InterviewScore,
    MockInterview,
    Profile,
    ReadinessScore,
    Resume,
    Roadmap,
    RoadmapTask,
    RoadmapWeek,
    TargetRole,
    UserSkill,
)
from app.schemas.schemas import ChatMessageCreate
from app.services.embedding_service import embedding_service

logger = logging.getLogger("careerpro_ai.advisor")


def _has_any(message: str, terms: tuple[str, ...]) -> bool:
    return any(term in message for term in terms)


async def _retrieve_context(db: AsyncSession, profile: Profile, message: str) -> tuple[dict, list[str]]:
    query = message.casefold()
    context: dict = {
        "profile": {
            "experience_level": profile.experience_level,
            "study_time_per_week": (profile.career_preferences or {}).get("available_study_time"),
            "learning_style": (profile.career_preferences or {}).get("learning_style"),
        }
    }
    sources = ["profile"]

    target_stmt = (
        select(TargetRole)
        .where(TargetRole.profile_id == profile.id)
        .order_by(TargetRole.created_at.desc())
        .limit(1)
    )
    target_role = (await db.execute(target_stmt)).scalar_one_or_none()
    context["target_role"] = target_role.title if target_role else None
    if target_role:
        sources.append("target_role")

    readiness_terms = ("readiness", "score", "ready to apply", "apply for", "internship", "gap", "priority", "learn next", "skill")
    wants_readiness = _has_any(query, readiness_terms)
    wants_roadmap = _has_any(query, ("today", "work on", "roadmap", "task", "next step", "what should i do"))
    wants_projects = _has_any(query, ("project", "portfolio", "resume", "ats"))
    wants_interviews = _has_any(query, ("interview", "practice", "behavioral", "technical answer"))

    if wants_readiness:
        readiness_stmt = (
            select(ReadinessScore)
            .where(ReadinessScore.profile_id == profile.id)
            .order_by(ReadinessScore.created_at.desc())
            .limit(1)
            .options(selectinload(ReadinessScore.breakdowns))
        )
        readiness = (await db.execute(readiness_stmt)).scalar_one_or_none()
        if readiness:
            raw_matches = (readiness.skill_match_summary or {}).get("matches", [])
            ordered_matches = sorted(raw_matches, key=lambda item: item.get("priority_score", 0), reverse=True)
            context["readiness"] = {
                "overall_score": readiness.overall_score,
                "as_of": readiness.created_at.isoformat(),
                "breakdown": [
                    {"category": item.category, "score": item.score, "weight": item.weight, "explanation": item.explanation}
                    for item in readiness.breakdowns
                ],
                "highest_priority_skill_gaps": [
                    {
                        "skill": item.get("skill_name"),
                        "status": item.get("status"),
                        "priority_score": item.get("priority_score"),
                        "gap_severity": item.get("gap_severity"),
                        "role_importance": item.get("importance"),
                        "evidence_confidence": item.get("confidence"),
                        "evidence_classification": item.get("evidence_classification"),
                        "market_demand_percent": item.get("market_demand"),
                    }
                    for item in ordered_matches[:8]
                    if item.get("status") != "HAVE"
                ],
                "demonstrated_strengths": [
                    {"skill": item.get("skill_name"), "proficiency": item.get("proficiency"), "confidence": item.get("confidence")}
                    for item in ordered_matches
                    if item.get("status") == "HAVE"
                ][:6],
            }
            sources.append("readiness_and_skill_gaps")

        if _has_any(query, ("skill", "typescript", "react", "priority", "learn next", "gap")):
            skills_stmt = (
                select(UserSkill)
                .where(UserSkill.profile_id == profile.id)
                .options(selectinload(UserSkill.skill), selectinload(UserSkill.evidence))
                .order_by(UserSkill.updated_at.desc())
                .limit(20)
            )
            user_skills = (await db.execute(skills_stmt)).scalars().all()
            context["current_skills"] = [
                {
                    "skill": item.skill.name,
                    "proficiency": item.proficiency,
                    "evidence": [
                        {
                            "classification": evidence.classification,
                            "confidence": evidence.confidence,
                            "type": evidence.evidence_type,
                            "description": evidence.description[:240],
                        }
                        for evidence in item.evidence[:2]
                    ],
                }
                for item in user_skills
            ]
            sources.append("current_skills_and_evidence")
            try:
                related_skills = await embedding_service.semantic_search(
                    db,
                    message,
                    entity_type="skills",
                    limit=5,
                    min_similarity=0.55,
                )
            except Exception as error:
                logger.info("Semantic skill recall unavailable (%s)", type(error).__name__)
                related_skills = []
            if related_skills:
                context["semantically_related_skills"] = related_skills
                sources.append("semantic_skill_recall")

    if _has_any(query, ("resource", "tutorial", "course", "documentation", "learn", "study")):
        try:
            related_resources = await embedding_service.semantic_search(
                db,
                message,
                entity_type="resources",
                limit=4,
                min_similarity=0.55,
            )
        except Exception as error:
            logger.info("Semantic resource recall unavailable (%s)", type(error).__name__)
            related_resources = []
        if related_resources:
            context["semantically_relevant_resources"] = related_resources
            sources.append("semantic_resource_recall")

    if wants_roadmap:
        roadmap_stmt = (
            select(Roadmap)
            .where(Roadmap.profile_id == profile.id, Roadmap.active.is_(True))
            .order_by(Roadmap.created_at.desc())
            .limit(1)
            .options(
                selectinload(Roadmap.weeks)
                .selectinload(RoadmapWeek.tasks)
                .selectinload(RoadmapTask.skill)
            )
        )
        roadmap = (await db.execute(roadmap_stmt)).scalar_one_or_none()
        if roadmap:
            tasks = [task for week in roadmap.weeks for task in week.tasks]
            open_tasks = [task for task in tasks if task.status in {"not_started", "in_progress"}]
            open_tasks.sort(key=lambda task: (task.status != "in_progress", -task.priority_score, task.rank_index))
            context["roadmap"] = {
                "title": roadmap.title,
                "progress": {"completed": sum(task.status == "completed" for task in tasks), "total": len(tasks)},
                "next_tasks": [
                    {
                        "title": task.title,
                        "status": task.status,
                        "skill": task.skill.name if task.skill else None,
                        "estimated_minutes": task.estimated_minutes,
                        "priority_score": task.priority_score,
                        "week": next((week.week_number for week in roadmap.weeks if task in week.tasks), None),
                    }
                    for task in open_tasks[:5]
                ],
            }
            sources.append("active_roadmap_and_progress")
        else:
            context["roadmap"] = None

    if wants_projects:
        resume_stmt = (
            select(Resume)
            .where(Resume.profile_id == profile.id, Resume.status == "completed")
            .order_by(Resume.created_at.desc())
            .limit(1)
            .options(selectinload(Resume.analysis))
        )
        resume = (await db.execute(resume_stmt)).scalar_one_or_none()
        if resume:
            extracted = resume.extracted_data or {}
            analysis = resume.analysis
            context["resume_analysis"] = {
                "ats_score": analysis.ats_score if analysis else None,
                "strengths": (analysis.strengths or [])[:5] if analysis else [],
                "weaknesses": (analysis.weaknesses or [])[:5] if analysis else [],
                "feedback": analysis.feedback[:600] if analysis and analysis.feedback else None,
                "projects": [str(item)[:400] for item in extracted.get("projects", [])[:6]],
                "experience": [str(item)[:400] for item in extracted.get("experience", [])[:5]],
            }
            sources.append("latest_resume_analysis")
        else:
            context["resume_analysis"] = None

    if wants_interviews:
        interview_stmt = (
            select(InterviewScore, MockInterview)
            .join(MockInterview, InterviewScore.interview_id == MockInterview.id)
            .where(MockInterview.profile_id == profile.id, MockInterview.status == "completed")
            .order_by(InterviewScore.created_at.desc())
            .limit(4)
        )
        interview_rows = (await db.execute(interview_stmt)).all()
        context["interview_history"] = [
            {
                "type": interview.interview_type,
                "difficulty": interview.difficulty,
                "overall_score": score.overall_score,
                "strong_areas": score.strong_areas or [],
                "weak_areas": score.weak_areas or [],
                "recommended_practice": score.recommended_practice or [],
                "feedback_summary": score.feedback_summary,
                "completed_at": score.created_at.isoformat(),
            }
            for score, interview in interview_rows
        ]
        sources.append("recent_interview_history")

    return context, sources


def _serialize_message(message: ChatMessage) -> dict:
    return {
        "id": str(message.id),
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at,
    }


async def list_sessions(db: AsyncSession, user_id: str) -> list[dict]:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        return []
    stmt = (
        select(ChatSession)
        .where(ChatSession.profile_id == profile_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(30)
    )
    sessions = (await db.execute(stmt)).scalars().all()
    return [{"id": str(item.id), "title": item.title, "created_at": item.created_at, "updated_at": item.updated_at} for item in sessions]


async def get_session(db: AsyncSession, user_id: str, session_id: uuid.UUID) -> dict:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        raise NotFoundException("Profile")
    stmt = (
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.profile_id == profile_id)
        .options(selectinload(ChatSession.messages))
    )
    session = (await db.execute(stmt)).scalar_one_or_none()
    if session is None:
        raise NotFoundException("Chat session")
    messages = sorted(session.messages, key=lambda item: item.created_at)
    return {
        "id": str(session.id),
        "title": session.title,
        "messages": [_serialize_message(item) for item in messages],
    }


async def send_message(db: AsyncSession, user_id: str, data: ChatMessageCreate) -> dict:
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    if data.session_id:
        session_stmt = select(ChatSession).where(
            ChatSession.id == data.session_id,
            ChatSession.profile_id == profile.id,
        )
        chat_session = (await db.execute(session_stmt)).scalar_one_or_none()
        if chat_session is None:
            raise NotFoundException("Chat session")
    else:
        chat_session = ChatSession(profile_id=profile.id, title="New Chat")
        db.add(chat_session)
        await db.flush()

    history_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    previous_messages = list((await db.execute(history_stmt)).scalars().all())
    previous_messages.reverse()
    context, context_sources = await _retrieve_context(db, profile, data.content)
    try:
        response = await get_chat_response(
            message=data.content,
            history=[{"role": item.role, "content": item.content} for item in previous_messages],
            career_context=context,
        )
    except Exception as error:
        await db.rollback()
        logger.warning("Advisor response failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The CareerPro Advisor is temporarily unavailable. Your message was not saved; please retry.",
        ) from error

    if chat_session.title == "New Chat":
        chat_session.title = re.sub(r"\s+", " ", data.content).strip()[:72] or "Career question"
    chat_session.updated_at = datetime.utcnow()

    user_message = ChatMessage(session_id=chat_session.id, role="user", content=data.content.strip())
    assistant_message = ChatMessage(session_id=chat_session.id, role="assistant", content=response.reply.strip())
    db.add_all([user_message, assistant_message])
    await db.commit()
    await db.refresh(chat_session)
    await db.refresh(user_message)
    await db.refresh(assistant_message)

    return {
        "session": {"id": str(chat_session.id), "title": chat_session.title},
        "user_message": _serialize_message(user_message),
        "assistant_message": _serialize_message(assistant_message),
        "suggested_actions": response.suggested_actions,
        "context_sources": context_sources,
    }