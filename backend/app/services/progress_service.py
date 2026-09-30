"""Aggregate stored learning events into progress timelines."""

from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.domain import (
    ActivityEvent,
    InterviewScore,
    MockInterview,
    Profile,
    ReadinessScore,
    Roadmap,
    RoadmapTask,
    RoadmapWeek,
    Skill,
    SkillEvidence,
    TaskProgress,
    UserSkill,
)

LEARNING_EVENTS = {
    "roadmap_task_completed",
    "roadmap_task_evidence_added",
    "interview_completed",
}


def _week_start(value: datetime) -> date:
    day = value.date()
    return day - timedelta(days=day.weekday())


def _learning_streak(event_dates: set[date], today: date) -> int:
    if not event_dates:
        return 0
    current = today if today in event_dates else today - timedelta(days=1)
    if current not in event_dates:
        return 0
    streak = 0
    while current in event_dates:
        streak += 1
        current -= timedelta(days=1)
    return streak


async def get_progress_summary(db: AsyncSession, user_id: str) -> dict:
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")
    one_year_ago = datetime.utcnow() - timedelta(days=365)

    readiness_stmt = (
        select(ReadinessScore)
        .where(ReadinessScore.profile_id == profile.id)
        .order_by(ReadinessScore.created_at.desc())
        .limit(100)
    )
    readiness_rows = list((await db.execute(readiness_stmt)).scalars().all())
    readiness_rows.reverse()
    readiness_history = [
        {"value": item.overall_score, "created_at": item.created_at}
        for item in readiness_rows
    ]

    task_stmt = (
        select(RoadmapTask)
        .join(Roadmap, Roadmap.id == RoadmapTask.roadmap_id)
        .where(Roadmap.profile_id == profile.id, RoadmapTask.status == "completed")
        .order_by(RoadmapTask.updated_at.desc())
        .limit(100)
        .options(selectinload(RoadmapTask.skill), selectinload(RoadmapTask.week))
    )
    completed_tasks = (await db.execute(task_stmt)).scalars().all()

    completion_stmt = (
        select(TaskProgress)
        .join(RoadmapTask, RoadmapTask.id == TaskProgress.task_id)
        .join(Roadmap, Roadmap.id == RoadmapTask.roadmap_id)
        .where(
            Roadmap.profile_id == profile.id,
            TaskProgress.completed_at.is_not(None),
            TaskProgress.completed_at >= one_year_ago,
        )
        .order_by(TaskProgress.completed_at.desc())
        .limit(1000)
    )
    progress_rows = list((await db.execute(completion_stmt)).scalars().all())
    progress_rows.reverse()
    completed_by_week: dict[date, int] = defaultdict(int)
    for item in progress_rows:
        if item.completed_at:
            completed_by_week[_week_start(item.completed_at)] += 1
    task_completion = [
        {"week_start": start.isoformat(), "tasks_completed": count}
        for start, count in sorted(completed_by_week.items())
    ]

    interview_stmt = (
        select(InterviewScore, MockInterview)
        .join(MockInterview, MockInterview.id == InterviewScore.interview_id)
        .where(MockInterview.profile_id == profile.id)
        .order_by(InterviewScore.created_at.desc())
        .limit(100)
    )
    interview_rows = list((await db.execute(interview_stmt)).all())
    interview_rows.reverse()
    interview_performance = [
        {
            "score": score.overall_score,
            "interview_type": interview.interview_type,
            "difficulty": interview.difficulty,
            "created_at": score.created_at,
        }
        for score, interview in interview_rows
    ]

    evidence_stmt = (
        select(SkillEvidence, Skill, UserSkill.proficiency)
        .join(UserSkill, UserSkill.id == SkillEvidence.user_skill_id)
        .join(Skill, Skill.id == UserSkill.skill_id)
        .where(UserSkill.profile_id == profile.id)
        .order_by(SkillEvidence.created_at.desc())
        .limit(1000)
    )
    evidence_rows = list((await db.execute(evidence_stmt)).all())
    evidence_rows.reverse()
    evidence_by_day: dict[date, list[str]] = defaultdict(list)
    evidence_history = []
    for evidence, skill, proficiency in evidence_rows:
        created = evidence.created_at
        evidence_by_day[created.date()].append(skill.name)
        evidence_history.append({
            "skill": skill.name,
            "proficiency": proficiency,
            "evidence_type": evidence.evidence_type,
            "classification": evidence.classification,
            "confidence": evidence.confidence,
            "description": evidence.description[:240],
            "created_at": created,
        })

    known_skills: set[str] = set()
    skill_growth = []
    for created_day, skill_names in sorted(evidence_by_day.items()):
        known_skills.update(skill_names)
        skill_growth.append({
            "date": created_day.isoformat(),
            "skills_with_evidence": len(known_skills),
            "evidence_entries_added": len(skill_names),
        })

    activity_stmt = (
        select(ActivityEvent)
        .where(ActivityEvent.profile_id == profile.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(30)
    )
    activity_rows = (await db.execute(activity_stmt)).scalars().all()
    learning_stmt = (
        select(ActivityEvent.created_at, ActivityEvent.event_type)
        .where(
            ActivityEvent.profile_id == profile.id,
            ActivityEvent.event_type.in_(LEARNING_EVENTS),
            ActivityEvent.created_at >= one_year_ago,
        )
        .order_by(ActivityEvent.created_at.desc())
        .limit(1000)
    )
    learning_events = (await db.execute(learning_stmt)).all()
    learning_dates = {
        created_at.date() for created_at, _event_type in learning_events
    }
    learning_dates.update(evidence.created_at.date() for evidence, _skill, _proficiency in evidence_rows)
    learning_dates.update(
        item.completed_at.date() for item in progress_rows if item.completed_at is not None
    )
    learning_dates.update(score.created_at.date() for score, _interview in interview_rows)
    return {
        "readiness_history": readiness_history,
        "completed_tasks": [
            {
                "id": str(task.id),
                "title": task.title,
                "skill": task.skill.name if task.skill else None,
                "week_number": task.week.week_number if task.week else None,
                "completed_at": task.updated_at,
            }
            for task in completed_tasks
        ],
        "task_completion": task_completion,
        "interview_performance": interview_performance,
        "skill_growth": skill_growth,
        "skill_evidence": list(reversed(evidence_history[-20:])),
        "learning_streak_days": _learning_streak(learning_dates, datetime.utcnow().date()),
        "activity_history": [
            {
                "id": str(item.id),
                "event_type": item.event_type,
                "metadata": item.metadata_json or {},
                "created_at": item.created_at,
            }
            for item in activity_rows[:30]
        ],
        "counts": {
            "readiness_snapshots": len(readiness_history),
            "completed_tasks": len(completed_tasks),
            "completed_interviews": len(interview_performance),
            "skills_with_evidence": len(known_skills),
        },
    }