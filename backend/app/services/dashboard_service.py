"""Build the dashboard view from persisted career evidence."""

from datetime import datetime, timedelta

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
    TargetRole,
)
from app.services.readiness_engine import calculate_readiness, persist_readiness


async def get_dashboard_summary(db: AsyncSession, user_id: str) -> dict:
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    readiness = await calculate_readiness(db, profile.id)
    snapshot = await persist_readiness(db, profile.id, readiness, readiness.target_role_id)

    target_role = None
    if readiness.target_role_id:
        target_role = (
            await db.execute(select(TargetRole).where(TargetRole.id == readiness.target_role_id))
        ).scalar_one_or_none()

    history_stmt = (
        select(ReadinessScore)
        .where(ReadinessScore.profile_id == profile.id)
        .order_by(ReadinessScore.created_at.asc())
    )
    history_rows = (await db.execute(history_stmt)).scalars().all()
    history = [
        {"value": item.overall_score, "created_at": item.created_at}
        for item in history_rows
    ]
    month_ago = datetime.utcnow() - timedelta(days=30)
    prior_month_score = next(
        (item.overall_score for item in history_rows if item.created_at >= month_ago and item.id != snapshot.id),
        None,
    )
    change_this_month = snapshot.overall_score - prior_month_score if prior_month_score is not None else 0

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
    all_tasks = [task for week in roadmap.weeks for task in week.tasks] if roadmap else []
    pending_tasks = [task for task in all_tasks if task.status in {"not_started", "in_progress"}]
    pending_tasks.sort(key=lambda task: (task.status != "in_progress", -task.priority_score, task.rank_index))
    todays_priorities = [
        {
            "id": str(task.id),
            "title": task.title,
            "skill": task.skill.name if task.skill else None,
            "estimated_minutes": task.estimated_minutes,
            "status": task.status,
            "priority_score": task.priority_score,
        }
        for task in pending_tasks[:3]
    ]

    total_tasks = len(all_tasks)
    completed_tasks = sum(task.status == "completed" for task in all_tasks)
    roadmap_progress = {
        "completed": completed_tasks,
        "total": total_tasks,
        "percent": round(completed_tasks / total_tasks * 100) if total_tasks else 0,
        "title": roadmap.title if roadmap else None,
        "week_count": len(roadmap.weeks) if roadmap else 0,
    }

    strengths = [
        {
            "skill": match.skill_name,
            "proficiency": match.proficiency,
            "confidence": match.confidence,
        }
        for match in readiness.skill_matches
        if match.status == "HAVE"
    ]
    strengths.sort(key=lambda item: (item["proficiency"], item["confidence"]), reverse=True)
    all_critical_gaps = [
        {
            "skill": match.skill_name,
            "status": match.status,
            "priority_score": match.priority_score,
            "gap_severity": match.gap_severity,
            "market_demand": match.market_demand,
        }
        for match in sorted(readiness.skill_matches, key=lambda item: item.priority_score, reverse=True)
        if match.status != "HAVE"
    ]
    critical_gaps = all_critical_gaps[:5]

    interview_stmt = (
        select(InterviewScore)
        .join(MockInterview, InterviewScore.interview_id == MockInterview.id)
        .where(MockInterview.profile_id == profile.id, MockInterview.status == "completed")
        .order_by(InterviewScore.created_at.desc())
    )
    interview_scores = (await db.execute(interview_stmt)).scalars().all()
    interview_performance = {
        "completed_count": len(interview_scores),
        "average_score": round(sum(item.overall_score for item in interview_scores) / len(interview_scores)) if interview_scores else None,
        "latest_score": interview_scores[0].overall_score if interview_scores else None,
        "latest_feedback": interview_scores[0].feedback_summary if interview_scores else None,
    }

    activity_stmt = (
        select(ActivityEvent)
        .where(ActivityEvent.profile_id == profile.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(6)
    )
    activities = (await db.execute(activity_stmt)).scalars().all()
    recent_activity = [
        {
            "id": str(item.id),
            "event_type": item.event_type,
            "metadata": item.metadata_json or {},
            "created_at": item.created_at,
        }
        for item in activities
    ]

    if todays_priorities:
        first_task = todays_priorities[0]
        skill_context = f" for {first_task['skill']}" if first_task["skill"] else ""
        recommendation = {
            "title": f"Start with {first_task['title']}",
            "description": f"This is your highest-priority open roadmap task{skill_context}.",
            "task_id": first_task["id"],
        }
    elif critical_gaps:
        first_gap = critical_gaps[0]
        recommendation = {
            "title": f"Build evidence for {first_gap['skill']}",
            "description": "This is your highest-priority role skill gap. Generate a roadmap task to address it.",
            "task_id": None,
        }
    else:
        recommendation = {
            "title": "Generate your personalized roadmap",
            "description": "A roadmap will turn your target role and readiness evidence into concrete next steps.",
            "task_id": None,
        }

    return {
        "name": profile.full_name,
        "target_role": target_role.title if target_role else None,
        "readiness": {
            "score": readiness.overall_score,
            "change_this_month": change_this_month,
            "categories": [
                {
                    "category": item.category,
                    "value": item.score,
                    "weight": item.weight,
                    "evidence": item.evidence,
                    "explanation": item.explanation,
                }
                for item in readiness.categories
            ],
            "history": history,
            "as_of": snapshot.created_at,
        },
        "skill_gaps": {
            "have_count": len(strengths),
            "gap_count": len(all_critical_gaps),
            "strengths": strengths[:5],
            "critical": critical_gaps,
        },
        "todays_priorities": todays_priorities,
        "roadmap_progress": roadmap_progress,
        "interview_performance": interview_performance,
        "recommendation": recommendation,
        "recent_activity": recent_activity,
    }