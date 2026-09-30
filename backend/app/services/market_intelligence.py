"""Role-scoped job market analysis with cached Adzuna snapshots."""

import logging
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.domain import JobSkill, JobSnapshot, RoleSkill, Skill, TargetRole

logger = logging.getLogger(__name__)

COUNTRY_CURRENCY = {
    "au": "AUD",
    "br": "BRL",
    "ca": "CAD",
    "de": "EUR",
    "fr": "EUR",
    "gb": "GBP",
    "in": "INR",
    "nl": "EUR",
    "nz": "NZD",
    "pl": "PLN",
    "us": "USD",
    "za": "ZAR",
}


def _extract_experience(description: str) -> str | None:
    expressions = (
        r"\b\d{1,2}\+?\s+years?(?:\s+of)?\s+(?:relevant\s+)?experience\b",
        r"\bexperience\s+of\s+\d{1,2}\+?\s+years?\b",
    )
    found = []
    for expression in expressions:
        found.extend(re.findall(expression, description, flags=re.IGNORECASE))
    return "; ".join(dict.fromkeys(found)) or None


def _extract_skill_ids(text: str, skills: list[Skill]) -> list[Skill]:
    matches = []
    for skill in skills:
        terms = {skill.name, *(skill.aliases or [])}
        if any(
            re.search(
                rf"(?<![A-Za-z0-9]){re.escape(term.strip())}(?![A-Za-z0-9])",
                text,
                flags=re.IGNORECASE,
            )
            for term in terms
            if term and term.strip()
        ):
            matches.append(skill)
    return matches


async def _global_role(db: AsyncSession, title: str) -> TargetRole | None:
    stmt = select(TargetRole).where(
        func.lower(TargetRole.title) == title.strip().lower(),
        TargetRole.profile_id.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _seeded_fallback(db: AsyncSession, target_role: TargetRole) -> dict[str, Any]:
    role = await _global_role(db, target_role.title)
    skills: list[dict[str, Any]] = []
    if role:
        stmt = (
            select(RoleSkill)
            .where(RoleSkill.target_role_id == role.id)
            .options(selectinload(RoleSkill.skill))
            .order_by(RoleSkill.importance_level.desc(), RoleSkill.id)
        )
        role_skills = (await db.execute(stmt)).scalars().all()
        skills = [
            {
                "name": item.skill.name,
                "demand_percent": None,
                "requirement_strength": max(0, min(100, item.importance_level * 20)),
                "posting_count": 0,
            }
            for item in role_skills
        ]

    return {
        "target_role": target_role.title,
        "data_source": "seeded",
        "basis_label": "Seeded role-skill requirements",
        "market_demand_available": False,
        "analyzed_postings": 0,
        "analyzed_at": target_role.market_checked_at,
        "skills": skills,
        "jobs": [],
    }


async def _cached_postings(db: AsyncSession, target_role: TargetRole) -> dict[str, Any]:
    stmt = (
        select(JobSnapshot)
        .where(JobSnapshot.target_role_id == target_role.id)
        .options(selectinload(JobSnapshot.job_skills).selectinload(JobSkill.skill))
        .order_by(JobSnapshot.created_at.desc())
    )
    postings = (await db.execute(stmt)).scalars().all()
    skill_counts: Counter[str] = Counter()
    jobs = []
    for posting in postings:
        required_skills = sorted({link.skill.name for link in posting.job_skills})
        skill_counts.update(required_skills)
        jobs.append(
            {
                "title": posting.title,
                "company": posting.company,
                "location": posting.location,
                "description": posting.description,
                "url": posting.url,
                "required_skills": required_skills,
                "experience_requirements": posting.experience_requirements,
                "salary_min": posting.salary_min,
                "salary_max": posting.salary_max,
                "salary_currency": posting.salary_currency,
            }
        )

    posting_count = len(postings)
    skills = [
        {
            "name": name,
            "demand_percent": round(count / posting_count * 100) if posting_count else 0,
            "requirement_strength": None,
            "posting_count": count,
        }
        for name, count in skill_counts.most_common()
    ]
    return {
        "target_role": target_role.title,
        "data_source": "adzuna",
        "basis_label": "Based on analyzed job postings",
        "market_demand_available": True,
        "analyzed_postings": posting_count,
        "analyzed_at": target_role.market_checked_at,
        "skills": skills,
        "jobs": jobs,
    }


def _parse_number(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def _fetch_adzuna(target_role: TargetRole, location: str | None) -> list[dict[str, Any]]:
    settings = get_settings()
    url = (
        f"https://api.adzuna.com/v1/api/jobs/"
        f"{settings.adzuna_country.lower()}/search/1"
    )
    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": settings.adzuna_results_per_page,
        "what": target_role.title,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()
    results = payload.get("results", [])
    if not isinstance(results, list):
        raise ValueError("Adzuna returned an invalid results payload.")
    return results


async def _replace_snapshots(
    db: AsyncSession,
    target_role: TargetRole,
    raw_postings: list[dict[str, Any]],
) -> None:
    old_stmt = (
        select(JobSnapshot)
        .where(JobSnapshot.target_role_id == target_role.id)
        .options(selectinload(JobSnapshot.job_skills))
    )
    old_postings = (await db.execute(old_stmt)).scalars().all()
    for posting in old_postings:
        await db.delete(posting)
    await db.flush()

    all_skills = (await db.execute(select(Skill))).scalars().all()
    settings = get_settings()
    currency = COUNTRY_CURRENCY.get(settings.adzuna_country.lower())
    seen: set[str] = set()

    for raw in raw_postings:
        company_data = raw.get("company") or {}
        location_data = raw.get("location") or {}
        external_id = str(raw.get("id") or "").strip() or None
        title = str(raw.get("title") or target_role.title).strip()
        company = str(company_data.get("display_name") or "Company not listed").strip()
        description = str(raw.get("description") or "").strip()
        posting_url = str(raw.get("redirect_url") or "").strip()
        identity = external_id or posting_url or f"{title.lower()}|{company.lower()}"
        if identity in seen:
            continue
        seen.add(identity)

        posting = JobSnapshot(
            target_role_id=target_role.id,
            external_id=external_id,
            title=title,
            company=company,
            location=str(location_data.get("display_name") or "").strip() or None,
            description=description,
            url=posting_url,
            salary_min=_parse_number(raw.get("salary_min")),
            salary_max=_parse_number(raw.get("salary_max")),
            salary_currency=currency if raw.get("salary_min") or raw.get("salary_max") else None,
            experience_requirements=_extract_experience(description),
            source="adzuna",
        )
        db.add(posting)
        await db.flush()

        for skill in _extract_skill_ids(f"{title}\n{description}", all_skills):
            db.add(JobSkill(job_id=posting.id, skill_id=skill.id))


async def get_market_intelligence(
    db: AsyncSession,
    target_role: TargetRole,
    location: str | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    settings = get_settings()
    now = datetime.utcnow()
    is_fresh = (
        target_role.market_checked_at is not None
        and target_role.market_checked_at >= now - timedelta(hours=settings.market_cache_hours)
        and (target_role.market_location or "").casefold() == (location or "").casefold()
    )
    if is_fresh and not force_refresh:
        if target_role.market_data_source == "adzuna":
            return await _cached_postings(db, target_role)
        return await _seeded_fallback(db, target_role)

    has_credentials = bool(settings.adzuna_app_id and settings.adzuna_app_key)
    if has_credentials:
        try:
            raw_postings = await _fetch_adzuna(target_role, location)
            if raw_postings:
                await _replace_snapshots(db, target_role, raw_postings)
                target_role.market_data_source = "adzuna"
            else:
                target_role.market_data_source = "seeded"
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError) as error:
            role_id = target_role.id
            await db.rollback()
            target_role = (
                await db.execute(select(TargetRole).where(TargetRole.id == role_id))
            ).scalar_one()
            logger.warning(
                "Adzuna refresh failed for target role %s (%s)",
                target_role.id,
                type(error).__name__,
            )
            target_role.market_data_source = "seeded"
    else:
        target_role.market_data_source = "seeded"

    target_role.market_checked_at = now
    target_role.market_location = location
    db.add(target_role)
    await db.commit()
    await db.refresh(target_role)

    if target_role.market_data_source == "adzuna":
        return await _cached_postings(db, target_role)
    return await _seeded_fallback(db, target_role)