import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.api.deps import DbSession
from app.models.domain import TargetRole, RoleSkill, Skill
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter()


class SkillOut(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    aliases: Optional[list[str]] = None
    difficulty: Optional[int] = None
    importance: Optional[int] = None

    model_config = {"from_attributes": True}


class RoleSkillOut(BaseModel):
    skill: SkillOut
    importance_level: int

    model_config = {"from_attributes": True}


class RoleOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    experience_level: Optional[str] = None

    model_config = {"from_attributes": True}


class RoleDetailOut(RoleOut):
    skills: list[RoleSkillOut] = []


@router.get("", response_model=list[RoleOut])
async def list_roles(db: DbSession):
    """List all global (system-defined) roles."""
    stmt = select(TargetRole).where(TargetRole.profile_id.is_(None)).order_by(TargetRole.title)
    result = await db.execute(stmt)
    roles = result.scalars().all()
    return [
        RoleOut(
            id=str(r.id),
            title=r.title,
            description=r.description,
            category=r.category,
            industry=r.industry,
            experience_level=r.experience_level,
        )
        for r in roles
    ]


@router.get("/{role_id}", response_model=RoleDetailOut)
async def get_role(role_id: uuid.UUID, db: DbSession):
    """Get a single role with its skill requirements."""
    stmt = (
        select(TargetRole)
        .where(TargetRole.id == role_id)
        .options(selectinload(TargetRole.role_skills).selectinload(RoleSkill.skill))
    )
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    skills_out = []
    for rs in role.role_skills:
        skills_out.append(
            RoleSkillOut(
                skill=SkillOut(
                    id=str(rs.skill.id),
                    name=rs.skill.name,
                    category=rs.skill.category,
                    description=rs.skill.description,
                    aliases=rs.skill.aliases,
                    difficulty=rs.skill.difficulty,
                    importance=rs.skill.importance,
                ),
                importance_level=rs.importance_level,
            )
        )

    return RoleDetailOut(
        id=str(role.id),
        title=role.title,
        description=role.description,
        category=role.category,
        industry=role.industry,
        experience_level=role.experience_level,
        skills=skills_out,
    )


@router.get("/{role_id}/skills", response_model=list[RoleSkillOut])
async def get_role_skills(role_id: uuid.UUID, db: DbSession):
    """Get the skill requirements for a specific role."""
    stmt = (
        select(RoleSkill)
        .where(RoleSkill.target_role_id == role_id)
        .options(selectinload(RoleSkill.skill))
    )
    result = await db.execute(stmt)
    role_skills = result.scalars().all()

    if not role_skills:
        raise HTTPException(status_code=404, detail="No skills found for this role.")

    return [
        RoleSkillOut(
            skill=SkillOut(
                id=str(rs.skill.id),
                name=rs.skill.name,
                category=rs.skill.category,
                description=rs.skill.description,
                aliases=rs.skill.aliases,
                difficulty=rs.skill.difficulty,
                importance=rs.skill.importance,
            ),
            importance_level=rs.importance_level,
        )
        for rs in role_skills
    ]
