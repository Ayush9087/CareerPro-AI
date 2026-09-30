"""Personalized roadmap generation, validation, and progress feedback."""

import json
import re
import uuid
from collections import defaultdict
from datetime import datetime
from urllib.parse import urlsplit

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.client import AIException, generate_structured
from app.ai.prompts import ROADMAP_PROMPT, SYSTEM_INSTRUCTION_CAREER
from app.ai.schemas import RoadmapAI
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.domain import (
    ActivityEvent,
    Profile,
    Roadmap,
    RoadmapTask,
    RoadmapWeek,
    Resume,
    RoleSkill,
    Skill,
    SkillEvidence,
    TargetRole,
    TaskProgress,
    UserSkill,
)
from app.schemas.schemas import RoadmapTaskStatusUpdate
from app.services.readiness_engine import calculate_readiness, persist_readiness


STUDY_HOUR_LIMITS = {
    "< 5 hours": 4.0,
    "5-10 hours": 10.0,
    "10-20 hours": 20.0,
    "20+ hours": 30.0,
}


def _study_hour_limit(preference: str | None) -> float:
    return STUDY_HOUR_LIMITS.get(preference or "", 5.0)


def _skill_lookup(skills: list[Skill]) -> dict[str, Skill]:
    lookup = {}
    for skill in skills:
        for name in [skill.name, *(skill.aliases or [])]:
            lookup[re.sub(r"\s+", " ", name).strip().casefold()] = skill
    return lookup


def _safe_resource(resource: str | None) -> str | None:
    if resource is None:
        return None
    resource = resource.strip()
    if not resource:
        return None
    if "://" not in resource:
        return resource
    parsed = urlsplit(resource)
    if parsed.scheme != "https" or not parsed.hostname:
        raise BadRequestException("Roadmap resources must use HTTPS URLs or be plain resource names.")
    return resource


async def _get_profile_context(db: AsyncSession, user_id: str):
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

    readiness = await calculate_readiness(db, profile.id)
    readiness_record = await persist_readiness(db, profile.id, readiness, readiness.target_role_id)

    global_role_stmt = select(TargetRole).where(
        TargetRole.profile_id.is_(None),
        TargetRole.title.ilike(target_role.title),
    )
    global_role = (await db.execute(global_role_stmt)).scalar_one_or_none()

    role_skills: list[Skill] = []
    if global_role:
        role_skill_stmt = (
            select(RoleSkill)
            .where(RoleSkill.target_role_id == global_role.id)
            .options(selectinload(RoleSkill.skill))
            .order_by(RoleSkill.importance_level.desc())
        )
        role_skill_rows = (await db.execute(role_skill_stmt)).scalars().all()
        role_skills = [row.skill for row in role_skill_rows]

    user_skill_stmt = (
        select(UserSkill)
        .where(UserSkill.profile_id == profile.id)
        .options(selectinload(UserSkill.skill), selectinload(UserSkill.evidence))
    )
    user_skill_rows = (await db.execute(user_skill_stmt)).scalars().all()
    all_skills_by_id = {skill.id: skill for skill in role_skills}
    all_skills_by_id.update({row.skill.id: row.skill for row in user_skill_rows})
    allowed_skills = list(all_skills_by_id.values())
    if not allowed_skills:
        raise BadRequestException("Add role skill requirements before generating a roadmap.")

    resume_stmt = (
        select(Resume)
        .where(Resume.profile_id == profile.id, Resume.status == "completed")
        .order_by(Resume.created_at.desc())
        .limit(1)
    )
    resume = (await db.execute(resume_stmt)).scalar_one_or_none()
    extracted = resume.extracted_data or {} if resume else {}

    active_stmt = (
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
    active_roadmap = (await db.execute(active_stmt)).scalar_one_or_none()
    progress = []
    if active_roadmap:
        progress = [
            {
                "title": task.title,
                "skill": task.skill.name if task.skill else None,
                "status": task.status,
            }
            for week in active_roadmap.weeks
            for task in week.tasks
        ]

    preferences = profile.career_preferences or {}
    study_preference = preferences.get("available_study_time")
    available_hours = _study_hour_limit(study_preference)
    skill_priority = {match.skill_name.casefold(): match.priority_score for match in readiness.skill_matches}
    context = {
        "target_role": target_role.title,
        "readiness_score": readiness.overall_score,
        "readiness_categories": [
            {"category": item.category, "score": item.score, "weight": item.weight}
            for item in readiness.categories
        ],
        "skill_gaps": [
            {
                "skill": match.skill_name,
                "status": match.status,
                "gap_severity": match.gap_severity,
                "role_importance": match.importance,
                "market_demand_percent": match.market_demand,
                "priority_score": match.priority_score,
            }
            for match in sorted(readiness.skill_matches, key=lambda item: item.priority_score, reverse=True)
            if match.status != "HAVE"
        ],
        "current_skills": [
            {
                "skill": row.skill.name,
                "proficiency": row.proficiency,
                "evidence": [
                    {"classification": item.classification, "confidence": item.confidence}
                    for item in row.evidence
                ],
            }
            for row in user_skill_rows
        ],
        "experience_level": profile.experience_level,
        "experience": extracted.get("experience", []),
        "available_study_time_preference": study_preference,
        "available_study_hours_per_week": available_hours,
        "learning_style": preferences.get("learning_style"),
        "progress": progress,
        "allowed_role_skills": [skill.name for skill in allowed_skills],
    }
    return profile, target_role, readiness_record, readiness, allowed_skills, context, skill_priority


def _validate_roadmap(generated: RoadmapAI, skill_lookup: dict[str, Skill], weekly_limit: float):
    if [week.week_number for week in generated.weeks] != [1, 2, 3, 4]:
        raise BadRequestException("The generated roadmap must contain weeks numbered 1 through 4.")

    task_titles: set[str] = set()
    normalized_weeks = []
    for week in generated.weeks:
        normalized_week_skills = []
        for name in week.skills:
            skill = skill_lookup.get(re.sub(r"\s+", " ", name).strip().casefold())
            if skill is None:
                raise BadRequestException(f"The generated roadmap referenced an unknown skill: {name}.")
            normalized_week_skills.append(skill.name)

        normalized_tasks = []
        task_hours = 0.0
        for task in week.tasks:
            title_key = task.title.strip().casefold()
            if title_key in task_titles:
                raise BadRequestException("The generated roadmap contains duplicate task titles.")
            task_titles.add(title_key)

            skill = skill_lookup.get(re.sub(r"\s+", " ", task.skill).strip().casefold())
            if skill is None or skill.name not in normalized_week_skills:
                raise BadRequestException("Every task must use a known skill listed in its week.")

            resource = _safe_resource(task.resource)
            task_hours += task.estimated_minutes / 60
            normalized_tasks.append((task, skill, resource))

        if task_hours > weekly_limit:
            raise BadRequestException("Generated task hours exceed the candidate's weekly study-time limit.")
        if week.estimated_hours > weekly_limit:
            raise BadRequestException("Generated weekly hours exceed the candidate's study-time limit.")
        if abs(week.estimated_hours - task_hours) > max(0.5, task_hours * 0.3):
            raise BadRequestException("Weekly estimated hours do not match the sum of task estimates.")
        normalized_weeks.append((week, normalized_week_skills, normalized_tasks, round(task_hours, 2)))

    return normalized_weeks


def _serialize_roadmap(roadmap: Roadmap) -> dict:
    weeks = []
    for week in roadmap.weeks:
        tasks = []
        for task in week.tasks:
            latest_progress = max(task.progress, key=lambda item: item.created_at, default=None)
            tasks.append({
                "id": str(task.id),
                "title": task.title,
                "description": task.description,
                "why_it_matters": task.why_it_matters,
                "estimated_minutes": task.estimated_minutes,
                "difficulty": task.difficulty,
                "skill": task.skill.name if task.skill else None,
                "resource": task.resource,
                "evidence_requirement": task.evidence_requirement,
                "status": task.status,
                "priority_score": task.priority_score,
                "evidence": latest_progress.note if latest_progress else None,
            })
        weeks.append({
            "week_number": week.week_number,
            "objective": week.objective,
            "skills": week.skills or [],
            "estimated_hours": week.estimated_hours,
            "tasks": tasks,
        })

    return {
        "id": str(roadmap.id),
        "title": roadmap.title,
        "target_role_id": str(roadmap.target_role_id) if roadmap.target_role_id else None,
        "readiness_score_id": str(roadmap.readiness_score_id) if roadmap.readiness_score_id else None,
        "created_at": roadmap.created_at,
        "weeks": weeks,
    }


def _roadmap_load_options():
    task_path = selectinload(Roadmap.weeks).selectinload(RoadmapWeek.tasks)
    return (
        task_path.selectinload(RoadmapTask.skill),
        task_path.selectinload(RoadmapTask.progress),
    )


async def get_active_roadmap(db: AsyncSession, profile_id: uuid.UUID) -> dict:
    stmt = (
        select(Roadmap)
        .where(Roadmap.profile_id == profile_id, Roadmap.active.is_(True))
        .order_by(Roadmap.created_at.desc())
        .limit(1)
        .options(*_roadmap_load_options())
    )
    roadmap = (await db.execute(stmt)).scalar_one_or_none()
    if roadmap is None:
        raise NotFoundException("Roadmap")
    return _serialize_roadmap(roadmap)


async def generate_roadmap(db: AsyncSession, user_id: str) -> dict:
    profile, target_role, readiness_record, readiness, allowed_skills, context, skill_priority = await _get_profile_context(db, user_id)
    skill_lookup = _skill_lookup(allowed_skills)
    weekly_limit = context["available_study_hours_per_week"]
    prompt = ROADMAP_PROMPT.format(candidate_context=json.dumps(context, ensure_ascii=True, default=str))

    try:
        generated = await generate_structured(
            prompt,
            RoadmapAI,
            system_instruction=SYSTEM_INSTRUCTION_CAREER,
        )
    except AIException as error:
        raise BadRequestException("Roadmap generation is temporarily unavailable. Please try again.") from error

    normalized_weeks = _validate_roadmap(generated, skill_lookup, weekly_limit)

    active_stmt = select(Roadmap).where(Roadmap.profile_id == profile.id, Roadmap.active.is_(True))
    active_roadmaps = (await db.execute(active_stmt)).scalars().all()
    for previous in active_roadmaps:
        previous.active = False

    roadmap = Roadmap(
        profile_id=profile.id,
        target_role_id=target_role.id,
        readiness_score_id=readiness_record.id,
        title=generated.title.strip(),
        active=True,
        context_snapshot=context,
    )
    db.add(roadmap)
    await db.flush()

    for week_ai, week_skills, tasks_ai, task_hours in normalized_weeks:
        week = RoadmapWeek(
            roadmap_id=roadmap.id,
            week_number=week_ai.week_number,
            objective=week_ai.objective.strip(),
            skills=week_skills,
            estimated_hours=task_hours,
        )
        db.add(week)
        await db.flush()
        for rank_index, (task_ai, skill, resource) in enumerate(tasks_ai):
            db.add(RoadmapTask(
                roadmap_id=roadmap.id,
                week_id=week.id,
                skill_id=skill.id,
                title=task_ai.title.strip(),
                description=task_ai.description.strip(),
                why_it_matters=task_ai.why_it_matters.strip(),
                estimated_minutes=task_ai.estimated_minutes,
                difficulty=task_ai.difficulty,
                resource=resource,
                evidence_requirement=task_ai.evidence_requirement.strip(),
                status="not_started",
                rank_index=rank_index,
                priority_score=skill_priority.get(skill.name.casefold(), 0),
            ))

    await db.commit()
    return await get_active_roadmap(db, profile.id)


async def _rerank_future_tasks(db: AsyncSession, roadmap_id: uuid.UUID, priority_by_skill: dict[str, int]) -> None:
    stmt = (
        select(RoadmapTask)
        .where(RoadmapTask.roadmap_id == roadmap_id)
        .options(selectinload(RoadmapTask.skill))
    )
    tasks = (await db.execute(stmt)).scalars().all()
    by_week: dict[uuid.UUID, list[RoadmapTask]] = defaultdict(list)
    for task in tasks:
        if task.week_id is not None:
            by_week[task.week_id].append(task)
        if task.skill:
            task.priority_score = priority_by_skill.get(task.skill.name.casefold(), task.priority_score)

    for week_tasks in by_week.values():
        fixed = [task for task in week_tasks if task.status in {"completed", "skipped"}]
        future = [task for task in week_tasks if task.status in {"not_started", "in_progress"}]
        future.sort(key=lambda task: (task.status != "in_progress", -task.priority_score, task.rank_index))
        next_rank = max((task.rank_index for task in fixed), default=-1) + 1
        for offset, task in enumerate(future):
            task.rank_index = next_rank + offset


async def update_task_status(
    db: AsyncSession,
    user_id: str,
    task_id: uuid.UUID,
    update: RoadmapTaskStatusUpdate,
) -> dict:
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    task_stmt = (
        select(RoadmapTask)
        .join(Roadmap, Roadmap.id == RoadmapTask.roadmap_id)
        .where(
            RoadmapTask.id == task_id,
            Roadmap.profile_id == profile.id,
            Roadmap.active.is_(True),
        )
        .options(selectinload(RoadmapTask.skill), selectinload(RoadmapTask.progress))
    )
    task = (await db.execute(task_stmt)).scalar_one_or_none()
    if task is None:
        raise NotFoundException("Roadmap task")
    if update.evidence and update.status != "completed":
        raise BadRequestException("Evidence can only be attached to a completed roadmap task.")

    old_status = task.status
    status_changed = old_status != update.status
    new_evidence = bool(update.evidence and all(item.note != update.evidence for item in task.progress))
    if not status_changed and not new_evidence:
        return await get_active_roadmap(db, profile.id)

    task.status = update.status
    event_type = "roadmap_task_completed" if update.status == "completed" and status_changed else "roadmap_task_status_changed"
    if status_changed:
        db.add(ActivityEvent(
            profile_id=profile.id,
            event_type=event_type,
            metadata_json={
                "task_id": str(task.id),
                "task_title": task.title,
                "skill": task.skill.name if task.skill else None,
                "previous_status": old_status,
                "status": update.status,
            },
        ))

    if status_changed or new_evidence:
        task.progress.append(TaskProgress(
            task_id=task.id,
            note=update.evidence,
            completed_at=datetime.utcnow() if update.status == "completed" else None,
        ))

    if new_evidence and task.skill_id:
        user_skill_stmt = (
            select(UserSkill)
            .where(UserSkill.profile_id == profile.id, UserSkill.skill_id == task.skill_id)
            .options(selectinload(UserSkill.evidence))
        )
        user_skill = (await db.execute(user_skill_stmt)).scalar_one_or_none()
        if user_skill is None:
            user_skill = UserSkill(profile_id=profile.id, skill_id=task.skill_id, proficiency=1)
            db.add(user_skill)
            await db.flush()
        db.add(SkillEvidence(
            user_skill=user_skill,
            evidence_type="roadmap_task",
            description=update.evidence,
            classification="DECLARED",
            confidence=0,
            recency="current",
        ))
        db.add(ActivityEvent(
            profile_id=profile.id,
            event_type="roadmap_task_evidence_added",
            metadata_json={"task_id": str(task.id), "skill": task.skill.name if task.skill else None},
        ))

    await db.flush()
    if new_evidence:
        readiness = await calculate_readiness(db, profile.id)
        await persist_readiness(db, profile.id, readiness, readiness.target_role_id)
        priority_by_skill = {match.skill_name.casefold(): match.priority_score for match in readiness.skill_matches}
        await _rerank_future_tasks(db, task.roadmap_id, priority_by_skill)
    await db.commit()
    return await get_active_roadmap(db, profile.id)