"""
Profile service — business logic for user profiles.
Keeps route handlers thin.
"""

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.domain import Profile, Resume, TargetRole, UserSkill
from app.schemas.schemas import ProfileCreate, ProfileUpdate
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException


async def get_profile_by_user_id(db: AsyncSession, user_id: str) -> Profile | None:
    stmt = select(Profile).where(Profile.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_profile(db: AsyncSession, user_id: str, data: ProfileCreate) -> Profile:
    existing = await get_profile_by_user_id(db, user_id)
    if existing:
        raise ConflictException("Profile already exists for this user.")

    profile = Profile(
        user_id=user_id,
        full_name=data.full_name,
        headline=data.headline,
        bio=data.bio,
        college=data.college,
        degree=data.degree,
        branch=data.branch,
        graduation_year=data.graduation_year,
        city=data.city,
        state=data.state,
        experience_level=data.experience_level,
        career_preferences=data.career_preferences,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def update_profile(db: AsyncSession, user_id: str, data: ProfileUpdate) -> Profile:
    profile = await get_profile_by_user_id(db, user_id)
    if not profile:
        raise NotFoundException("Profile")

    update_data = data.model_dump(exclude_unset=True)
    target_role_title = update_data.pop("target_role", None)
    for field, value in update_data.items():
        setattr(profile, field, value)

    if target_role_title is not None:
        global_role_stmt = select(TargetRole).where(
            TargetRole.profile_id.is_(None),
            func.lower(TargetRole.title) == target_role_title.strip().lower(),
        )
        global_role = (await db.execute(global_role_stmt)).scalar_one_or_none()
        if global_role is None:
            raise BadRequestException("Choose a target role from the available role list.")

        personal_role_stmt = (
            select(TargetRole)
            .where(TargetRole.profile_id == profile.id)
            .order_by(TargetRole.created_at.desc())
            .limit(1)
        )
        personal_role = (await db.execute(personal_role_stmt)).scalar_one_or_none()
        if personal_role is None:
            db.add(TargetRole(profile_id=profile.id, title=global_role.title))
        else:
            personal_role.title = global_role.title

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def get_career_profile(db: AsyncSession, user_id: str) -> dict:
    profile = await get_profile_by_user_id(db, user_id)
    if profile is None:
        raise NotFoundException("Profile")

    role_stmt = (
        select(TargetRole)
        .where(TargetRole.profile_id == profile.id)
        .order_by(TargetRole.created_at.desc())
        .limit(1)
    )
    target_role = (await db.execute(role_stmt)).scalar_one_or_none()

    skills_stmt = (
        select(UserSkill)
        .where(UserSkill.profile_id == profile.id)
        .options(selectinload(UserSkill.skill), selectinload(UserSkill.evidence))
        .order_by(UserSkill.updated_at.desc())
    )
    skills = (await db.execute(skills_stmt)).scalars().all()

    resume_stmt = (
        select(Resume)
        .where(Resume.profile_id == profile.id)
        .order_by(Resume.created_at.desc())
        .limit(1)
        .options(selectinload(Resume.analysis))
    )
    resume = (await db.execute(resume_stmt)).scalar_one_or_none()
    extracted = (resume.extracted_data or {}) if resume else {}
    analysis = resume.analysis if resume else None

    return {
        "profile": {
            "id": str(profile.id),
            "full_name": profile.full_name,
            "headline": profile.headline,
            "bio": profile.bio,
            "college": profile.college,
            "degree": profile.degree,
            "branch": profile.branch,
            "graduation_year": profile.graduation_year,
            "city": profile.city,
            "state": profile.state,
            "experience_level": profile.experience_level,
            "career_preferences": profile.career_preferences or {},
            "updated_at": profile.updated_at,
        },
        "target_role": {"id": str(target_role.id), "title": target_role.title} if target_role else None,
        "skills": [
            {
                "name": item.skill.name,
                "category": item.skill.category,
                "proficiency": item.proficiency,
                "evidence": [
                    {
                        "type": evidence.evidence_type,
                        "classification": evidence.classification,
                        "confidence": evidence.confidence,
                        "description": evidence.description,
                        "created_at": evidence.created_at,
                    }
                    for evidence in item.evidence
                ],
            }
            for item in skills
        ],
        "resume": None if resume is None else {
            "status": resume.status,
            "created_at": resume.created_at,
            "ats_score": analysis.ats_score if analysis else None,
            "strengths": (analysis.strengths or []) if analysis else [],
            "weaknesses": (analysis.weaknesses or []) if analysis else [],
            "feedback": analysis.feedback if analysis else None,
            "projects": [str(item) for item in extracted.get("projects", [])],
            "experience": [str(item) for item in extracted.get("experience", [])],
        },
    }
