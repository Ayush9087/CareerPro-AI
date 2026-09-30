"""Role-gated institution analytics over aggregate student records."""

from collections import defaultdict
from datetime import datetime, timedelta
import uuid

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.domain import (
    Institution,
    InstitutionMembership,
    InterviewScore,
    JobSkill,
    JobSnapshot,
    MockInterview,
    Profile,
    ReadinessScore,
    Roadmap,
    RoadmapTask,
    RoleSkill,
    Skill,
    TargetRole,
    TaskProgress,
)

READINESS_READY_THRESHOLD = 70
GAP_STATUSES = {"MISSING", "LEARNING"}


async def _authorized_institution(
    db: AsyncSession,
    user_id: str,
    institution_id: uuid.UUID,
) -> tuple[Institution, list]:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        raise ForbiddenException("Institution dashboard access is restricted to institution administrators.")

    membership_stmt = select(InstitutionMembership.id).where(
        InstitutionMembership.institution_id == institution_id,
        InstitutionMembership.profile_id == profile_id,
        InstitutionMembership.role == "institution_admin",
    )
    membership_id = (await db.execute(membership_stmt)).scalar_one_or_none()
    if membership_id is None:
        raise ForbiddenException("Institution dashboard access is restricted to institution administrators.")

    institution_stmt = select(Institution).where(Institution.id == institution_id)
    institution = (await db.execute(institution_stmt)).scalar_one_or_none()
    if institution is None:
        raise NotFoundException("Institution")

    students_stmt = select(InstitutionMembership.profile_id).where(
        InstitutionMembership.institution_id == institution.id,
        InstitutionMembership.role == "student",
    )
    student_ids = list((await db.execute(students_stmt)).scalars().all())
    return institution, student_ids


async def list_admin_institutions(db: AsyncSession, user_id: str) -> list[dict]:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        raise ForbiddenException("Institution dashboard access is restricted to institution administrators.")
    stmt = (
        select(Institution)
        .join(InstitutionMembership, InstitutionMembership.institution_id == Institution.id)
        .where(
            InstitutionMembership.profile_id == profile_id,
            InstitutionMembership.role == "institution_admin",
        )
        .order_by(Institution.name)
    )
    institutions = (await db.execute(stmt)).scalars().all()
    if not institutions:
        raise ForbiddenException("Institution dashboard access is restricted to institution administrators.")
    return [
        {"id": str(item.id), "name": item.name, "parent_institution_id": str(item.parent_institution_id) if item.parent_institution_id else None}
        for item in institutions
    ]


async def get_institution_dashboard(db: AsyncSession, user_id: str, institution_id: str) -> dict:
    institution, student_ids = await _authorized_institution(db, user_id, institution_id)
    if not student_ids:
        return _empty_dashboard(institution)

    ranked_readiness = (
        select(
            ReadinessScore.profile_id.label("profile_id"),
            ReadinessScore.overall_score.label("overall_score"),
            ReadinessScore.skill_match_summary.label("skill_match_summary"),
            ReadinessScore.created_at.label("created_at"),
            func.row_number().over(
                partition_by=ReadinessScore.profile_id,
                order_by=(ReadinessScore.created_at.desc(), ReadinessScore.id.desc()),
            ).label("row_number"),
        )
        .where(ReadinessScore.profile_id.in_(student_ids))
        .subquery()
    )
    latest_rows = (
        await db.execute(select(ranked_readiness).where(ranked_readiness.c.row_number == 1))
    ).all()
    latest_scores = {
        row.profile_id: {
            "overall_score": row.overall_score,
            "skill_match_summary": row.skill_match_summary or {},
            "created_at": row.created_at,
        }
        for row in latest_rows
    }

    readiness_values = [row["overall_score"] for row in latest_scores.values()]
    distribution_bins = [
        ("0-19", 0, 19),
        ("20-39", 20, 39),
        ("40-59", 40, 59),
        ("60-79", 60, 79),
        ("80-100", 80, 100),
    ]
    readiness_distribution = [
        {"band": label, "students": sum(low <= value <= high for value in readiness_values)}
        for label, low, high in distribution_bins
    ]

    gaps: dict[str, dict] = defaultdict(lambda: {"students": set(), "gap_students": set(), "priority_total": 0, "missing": 0, "learning": 0, "have": 0})
    for profile_id, score_row in latest_scores.items():
        for match in (score_row["skill_match_summary"].get("matches") or []):
            name = match.get("skill_name")
            if not name:
                continue
            entry = gaps[name]
            status = match.get("status")
            entry["students"].add(profile_id)
            entry["priority_total"] += int(match.get("priority_score") or 0)
            if status == "MISSING":
                entry["missing"] += 1
                entry["gap_students"].add(profile_id)
            elif status == "LEARNING":
                entry["learning"] += 1
                entry["gap_students"].add(profile_id)
            elif status == "HAVE":
                entry["have"] += 1

    gap_rows = [
        {
            "skill": name,
            "students_with_gap": len(entry["gap_students"]),
            "missing": entry["missing"],
            "learning": entry["learning"],
            "have": entry["have"],
            "average_priority": round(entry["priority_total"] / len(entry["students"])) if entry["students"] else 0,
            "students_covered": len(entry["students"]),
        }
        for name, entry in gaps.items()
        if entry["gap_students"]
    ]
    gap_rows.sort(key=lambda item: (item["missing"] + item["learning"], item["average_priority"]), reverse=True)
    top_skill_gaps = gap_rows[:10]
    skill_gap_distribution = [
        {"skill": item["skill"], "missing": item["missing"], "learning": item["learning"], "have": item["have"]}
        for item in top_skill_gaps
    ]

    ready_count = sum(value >= READINESS_READY_THRESHOLD for value in readiness_values)

    role_stmt = select(TargetRole.id, TargetRole.title).where(TargetRole.profile_id.in_(student_ids))
    personal_roles = (await db.execute(role_stmt)).all()
    personal_role_ids = [item.id for item in personal_roles]
    role_titles = {item.title.casefold() for item in personal_roles}

    demand_counts: dict[str, int] = defaultdict(int)
    posting_count = 0
    if personal_role_ids:
        posting_count_stmt = select(func.count(func.distinct(JobSnapshot.id))).where(
            JobSnapshot.target_role_id.in_(personal_role_ids),
            JobSnapshot.source == "adzuna",
        )
        posting_count = (await db.execute(posting_count_stmt)).scalar_one()
        posting_stmt = (
            select(JobSnapshot.id, Skill.name)
            .join(JobSkill, JobSkill.job_id == JobSnapshot.id)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(JobSnapshot.target_role_id.in_(personal_role_ids), JobSnapshot.source == "adzuna")
        )
        posting_rows = (await db.execute(posting_stmt)).all()
        posting_ids = set()
        posting_skills: dict[str, set] = defaultdict(set)
        for job_id, skill_name in posting_rows:
            posting_ids.add(job_id)
            posting_skills[skill_name].add(job_id)
        for name, job_ids in posting_skills.items():
            demand_counts[name] = len(job_ids)

    demand_source = "analyzed_job_postings" if posting_count and demand_counts else "seeded_role_requirements"
    demand_denominator = posting_count if demand_counts else 0
    if not demand_counts and role_titles:
        global_roles_stmt = select(TargetRole.id).where(
            TargetRole.profile_id.is_(None),
            func.lower(TargetRole.title).in_(role_titles),
        )
        global_role_ids = list((await db.execute(global_roles_stmt)).scalars().all())
        if global_role_ids:
            requirement_stmt = (
                select(Skill.name, func.count(func.distinct(RoleSkill.target_role_id)))
                .join(RoleSkill, RoleSkill.skill_id == Skill.id)
                .where(RoleSkill.target_role_id.in_(global_role_ids))
                .group_by(Skill.name)
            )
            for name, role_count in (await db.execute(requirement_stmt)).all():
                demand_counts[name] = int(role_count)
            demand_denominator = len(global_role_ids)
    if not demand_counts or demand_denominator == 0:
        demand_source = "unavailable"

    demand_rows = [
        {
            "skill": name,
            "demand_percent": round(count / demand_denominator * 100) if demand_denominator else None,
            "postings_or_roles": count,
        }
        for name, count in demand_counts.items()
    ]
    demand_rows.sort(key=lambda item: (item["postings_or_roles"], item["skill"]), reverse=True)
    most_in_demand = demand_rows[:10]

    readiness_by_skill: dict[str, dict[str, int]] = defaultdict(lambda: {"have": 0, "total": 0})
    for score_row in latest_scores.values():
        for match in (score_row["skill_match_summary"].get("matches") or []):
            name = match.get("skill_name")
            if name in demand_counts:
                readiness_by_skill[name]["total"] += 1
                readiness_by_skill[name]["have"] += match.get("status") == "HAVE"
    skill_demand_vs_readiness = [
        {
            "skill": item["skill"],
            "demand_percent": item["demand_percent"],
            "readiness_percent": round(
                readiness_by_skill[item["skill"]]["have"] / readiness_by_skill[item["skill"]]["total"] * 100
            ) if readiness_by_skill[item["skill"]]["total"] else None,
        }
        for item in most_in_demand
    ]

    active_roadmaps_stmt = (
        select(RoadmapTask.roadmap_id, RoadmapTask.status)
        .join(Roadmap, Roadmap.id == RoadmapTask.roadmap_id)
        .where(Roadmap.profile_id.in_(student_ids), Roadmap.active.is_(True))
    )
    roadmap_rows = (await db.execute(active_roadmaps_stmt)).all()
    roadmap_counts: dict = defaultdict(lambda: {"total": 0, "completed": 0})
    for roadmap_id, task_status in roadmap_rows:
        roadmap_counts[roadmap_id]["total"] += 1
        roadmap_counts[roadmap_id]["completed"] += task_status == "completed"
    roadmap_completion_values = [
        stats["completed"] / stats["total"] * 100
        for stats in roadmap_counts.values()
        if stats["total"]
    ]

    interview_stmt = (
        select(func.avg(InterviewScore.overall_score), func.count(InterviewScore.id))
        .join(MockInterview, MockInterview.id == InterviewScore.interview_id)
        .where(MockInterview.profile_id.in_(student_ids), MockInterview.status == "completed")
    )
    average_interview_score, interview_count = (await db.execute(interview_stmt)).one()

    progress_cutoff = datetime.utcnow() - timedelta(days=365)
    readiness_months = (
        await db.execute(
            select(
                func.date_trunc("month", ReadinessScore.created_at).label("month"),
                func.avg(ReadinessScore.overall_score).label("average"),
            )
            .where(ReadinessScore.profile_id.in_(student_ids), ReadinessScore.created_at >= progress_cutoff)
            .group_by("month")
            .order_by("month")
        )
    ).all()
    task_months = (
        await db.execute(
            select(
                func.date_trunc("month", TaskProgress.completed_at).label("month"),
                func.count(TaskProgress.id).label("completed"),
            )
            .join(RoadmapTask, RoadmapTask.id == TaskProgress.task_id)
            .join(Roadmap, Roadmap.id == RoadmapTask.roadmap_id)
            .where(
                Roadmap.profile_id.in_(student_ids),
                TaskProgress.completed_at.is_not(None),
                TaskProgress.completed_at >= progress_cutoff,
            )
            .group_by("month")
            .order_by("month")
        )
    ).all()
    monthly_progress = {}
    for month, average in readiness_months:
        monthly_progress[month] = {"month": month.strftime("%Y-%m"), "average_readiness": round(float(average)), "tasks_completed": 0}
    for month, completed in task_months:
        monthly_progress.setdefault(month, {"month": month.strftime("%Y-%m"), "average_readiness": None, "tasks_completed": 0})
        monthly_progress[month]["tasks_completed"] = completed

    return {
        "institution": {
            "id": str(institution.id),
            "name": institution.name,
            "parent_institution_id": str(institution.parent_institution_id) if institution.parent_institution_id else None,
        },
        "metrics": {
            "students_assessed": len(latest_scores),
            "student_members": len(student_ids),
            "average_readiness": round(sum(readiness_values) / len(readiness_values)) if readiness_values else None,
            "interview_ready": ready_count,
            "interview_ready_threshold": READINESS_READY_THRESHOLD,
            "top_skill_gaps": top_skill_gaps,
            "most_in_demand_skills": most_in_demand,
            "demand_source": demand_source,
            "analyzed_postings": posting_count,
            "roadmap_completion_percent": round(sum(roadmap_completion_values) / len(roadmap_completion_values)) if roadmap_completion_values else None,
            "roadmaps_with_tasks": len(roadmap_completion_values),
            "average_interview_score": round(float(average_interview_score)) if average_interview_score is not None else None,
            "completed_interviews": interview_count,
        },
        "charts": {
            "readiness_distribution": readiness_distribution,
            "skill_gap_distribution": skill_gap_distribution,
            "skill_demand_vs_readiness": skill_demand_vs_readiness,
            "progress_over_time": [monthly_progress[key] for key in sorted(monthly_progress)],
        },
    }


def _empty_dashboard(institution: Institution) -> dict:
    return {
        "institution": {
            "id": str(institution.id),
            "name": institution.name,
            "parent_institution_id": str(institution.parent_institution_id) if institution.parent_institution_id else None,
        },
        "metrics": {
            "students_assessed": 0,
            "student_members": 0,
            "average_readiness": None,
            "interview_ready": 0,
            "interview_ready_threshold": READINESS_READY_THRESHOLD,
            "top_skill_gaps": [],
            "most_in_demand_skills": [],
            "demand_source": "unavailable",
            "analyzed_postings": 0,
            "roadmap_completion_percent": None,
            "roadmaps_with_tasks": 0,
            "average_interview_score": None,
            "completed_interviews": 0,
        },
        "charts": {
            "readiness_distribution": [],
            "skill_gap_distribution": [],
            "skill_demand_vs_readiness": [],
            "progress_over_time": [],
        },
    }