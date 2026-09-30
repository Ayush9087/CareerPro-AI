"""
CareerPro Readiness Engine — Deterministic scoring system.

Gemini provides: extracted evidence, semantic analysis, explanations.
FastAPI (this module) calculates the final score deterministically.

Scores change ONLY when underlying evidence changes.
"""

import uuid
import logging
from dataclasses import asdict, dataclass, field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.domain import (
    Profile, Resume, TargetRole, RoleSkill, Skill,
    UserSkill, SkillEvidence, ReadinessScore, ReadinessBreakdown,
    MockInterview, InterviewScore, JobSkill, JobSnapshot,
)

logger = logging.getLogger(__name__)

# ─── Configurable Weights ─────────────────────────────
DEFAULT_WEIGHTS = get_settings().readiness_weights


@dataclass
class SkillMatchResult:
    skill_name: str
    status: str  # HAVE, LEARNING, MISSING
    importance: int  # 1-5
    proficiency: int  # 1-5 or 0 if missing
    confidence: int  # 0-100
    evidence_classification: str  # DECLARED, SUPPORTED, STRONGLY_SUPPORTED, NONE
    relevance: int  # 0-100; required-role skills are directly relevant
    market_demand: int | None  # 0-100 posting share, unavailable without analyzed postings
    gap_severity: int  # 0=no gap, 1-5 severity
    priority_score: int  # 0-100, combines role gap/importance and market demand


@dataclass
class CategoryScore:
    category: str
    score: int  # 0-100
    weight: float
    evidence: list[str] = field(default_factory=list)
    explanation: str = ""


@dataclass
class ReadinessResult:
    overall_score: int
    categories: list[CategoryScore]
    skill_matches: list[SkillMatchResult]
    weights_used: dict
    target_role_id: uuid.UUID | None = None


# ─── Skill Matching ───────────────────────────────────

async def match_skills(
    db: AsyncSession,
    profile_id: uuid.UUID,
    target_role_id: uuid.UUID,
    market_target_role_id: uuid.UUID | None = None,
) -> list[SkillMatchResult]:
    """Match user skills against role requirements. Deterministic."""

    # Get role skills
    stmt = (
        select(RoleSkill)
        .where(RoleSkill.target_role_id == target_role_id)
        .options(selectinload(RoleSkill.skill))
    )
    result = await db.execute(stmt)
    role_skills = result.scalars().all()

    # Get user skills with evidence
    stmt = (
        select(UserSkill)
        .where(UserSkill.profile_id == profile_id)
        .options(selectinload(UserSkill.skill), selectinload(UserSkill.evidence))
    )
    result = await db.execute(stmt)
    user_skills = result.scalars().all()

    demand_counts: dict[uuid.UUID, int] = {}
    analyzed_postings = 0
    if market_target_role_id:
        market_source_stmt = select(TargetRole.market_data_source).where(
            TargetRole.id == market_target_role_id
        )
        market_source = (await db.execute(market_source_stmt)).scalar_one_or_none()
        posting_count_stmt = select(func.count(JobSnapshot.id)).where(
            JobSnapshot.target_role_id == market_target_role_id,
            JobSnapshot.source == "adzuna",
        )
        if market_source == "adzuna":
            analyzed_postings = (await db.execute(posting_count_stmt)).scalar_one()
        if analyzed_postings:
            demand_stmt = (
                select(JobSkill.skill_id, func.count(func.distinct(JobSkill.job_id)))
                .join(JobSnapshot, JobSnapshot.id == JobSkill.job_id)
                .where(
                    JobSnapshot.target_role_id == market_target_role_id,
                    JobSnapshot.source == "adzuna",
                )
                .group_by(JobSkill.skill_id)
            )
            demand_counts = dict((await db.execute(demand_stmt)).all())

    # Build lookup: normalized skill name -> user_skill
    user_skill_map: dict[str, UserSkill] = {}
    for us in user_skills:
        user_skill_map[us.skill.name.lower()] = us

    matches = []
    for rs in role_skills:
        required_name = rs.skill.name.lower()
        us = user_skill_map.get(required_name)

        if us:
            # Determine best evidence classification
            best_classification = "DECLARED"
            best_confidence = 0
            for ev in us.evidence:
                if ev.classification == "STRONGLY_SUPPORTED":
                    best_classification = "STRONGLY_SUPPORTED"
                    best_confidence = max(best_confidence, ev.confidence or 0)
                elif ev.classification == "SUPPORTED" and best_classification != "STRONGLY_SUPPORTED":
                    best_classification = "SUPPORTED"
                    best_confidence = max(best_confidence, ev.confidence or 0)
                elif best_classification == "DECLARED":
                    best_confidence = max(best_confidence, ev.confidence or 0)

            # Determine status
            if us.proficiency >= 3 and best_classification in ("SUPPORTED", "STRONGLY_SUPPORTED"):
                status = "HAVE"
            elif us.proficiency >= 1:
                status = "LEARNING"
            else:
                status = "MISSING"

            gap = max(0, rs.importance_level - us.proficiency)
            market_demand = round(demand_counts.get(rs.skill_id, 0) / analyzed_postings * 100) if analyzed_postings else None
            base_priority = (gap / 5) * (rs.importance_level / 5)
            priority_score = round(
                ((base_priority * 0.7) + ((gap / 5) * (market_demand / 100) * 0.3)) * 100
            ) if market_demand is not None else round(base_priority * 100)

            matches.append(SkillMatchResult(
                skill_name=rs.skill.name,
                status=status,
                importance=rs.importance_level,
                proficiency=us.proficiency,
                confidence=best_confidence,
                evidence_classification=best_classification,
                relevance=100,
                market_demand=market_demand,
                gap_severity=gap,
                priority_score=priority_score,
            ))
        else:
            market_demand = round(demand_counts.get(rs.skill_id, 0) / analyzed_postings * 100) if analyzed_postings else None
            base_priority = rs.importance_level / 5
            priority_score = round(
                ((base_priority * 0.7) + ((market_demand / 100) * 0.3)) * 100
            ) if market_demand is not None else round(base_priority * 100)

            matches.append(SkillMatchResult(
                skill_name=rs.skill.name,
                status="MISSING",
                importance=rs.importance_level,
                proficiency=0,
                confidence=0,
                evidence_classification="NONE",
                relevance=100,
                market_demand=market_demand,
                gap_severity=rs.importance_level,
                priority_score=priority_score,
            ))

    return matches


# ─── Category Scorers ─────────────────────────────────

def _score_technical(skill_matches: list[SkillMatchResult], extracted_data: dict | None, weight: float) -> CategoryScore:
    """Score technical skills based on skill match results."""
    if not skill_matches:
        return CategoryScore("technical", 0, weight,
                             evidence=[], explanation="No role skills defined to evaluate.")

    total_weight = 0
    weighted_score = 0
    evidence_items = []

    for m in skill_matches:
        w = m.importance
        total_weight += w

        if m.status == "HAVE":
            # Scale: proficiency (1-5) * confidence multiplier
            conf_mult = min(m.confidence / 100, 1.0)
            skill_score = (m.proficiency / 5) * 100 * conf_mult
            evidence_items.append(f"{m.skill_name}: proficiency {m.proficiency}/5, {m.evidence_classification}")
        elif m.status == "LEARNING":
            skill_score = (m.proficiency / 5) * 60  # cap at 60% for learning
            evidence_items.append(f"{m.skill_name}: learning, proficiency {m.proficiency}/5")
        else:
            skill_score = 0
            evidence_items.append(f"{m.skill_name}: missing (importance {m.importance})")

        weighted_score += skill_score * w

    raw = int(weighted_score / total_weight) if total_weight > 0 else 0
    score = max(0, min(100, raw))

    have = sum(1 for m in skill_matches if m.status == "HAVE")
    total = len(skill_matches)

    return CategoryScore(
        "technical", score, weight,
        evidence=evidence_items,
        explanation=f"{have}/{total} required skills demonstrated with evidence."
    )


def _score_projects(extracted_data: dict | None, weight: float) -> CategoryScore:
    """Score project experience from resume extraction."""
    projects = (extracted_data or {}).get("projects", [])
    evidence_items = []

    if not projects:
        return CategoryScore("projects", 0, weight,
                             evidence=[], explanation="No projects found in resume.")

    # Score based on number and implied complexity
    count = len(projects)
    base = min(count * 20, 80)  # Up to 80 for quantity

    for i, p in enumerate(projects):
        desc = p if isinstance(p, str) else str(p)
        evidence_items.append(desc[:120])
        # Bonus for longer descriptions (implies detail)
        if len(desc) > 80:
            base = min(base + 5, 100)

    return CategoryScore(
        "projects", min(base, 100), weight,
        evidence=evidence_items,
        explanation=f"{count} project(s) found. Score based on quantity and detail."
    )


def _score_experience(extracted_data: dict | None, weight: float) -> CategoryScore:
    """Score work/internship experience."""
    experience = (extracted_data or {}).get("experience", [])
    evidence_items = []

    if not experience:
        return CategoryScore("experience", 0, weight,
                             evidence=[], explanation="No work experience evidence was found.")

    count = len(experience)
    base = min(count * 25, 85)

    for exp in experience:
        desc = exp if isinstance(exp, str) else str(exp)
        evidence_items.append(desc[:120])
        if len(desc) > 100:
            base = min(base + 5, 100)

    return CategoryScore(
        "experience", min(base, 100), weight,
        evidence=evidence_items,
        explanation=f"{count} experience entry(ies) found."
    )


def _score_problem_solving(skill_matches: list[SkillMatchResult], extracted_data: dict | None, weight: float) -> CategoryScore:
    """Score problem-solving indicators."""
    score = 0
    evidence_items = []

    # Check for DSA-related skills
    dsa_keywords = {"data structures", "algorithms", "system design", "problem solving", "competitive programming"}
    for m in skill_matches:
        if m.skill_name.lower() in dsa_keywords and m.status in ("HAVE", "LEARNING"):
            score += 15
            evidence_items.append(f"{m.skill_name}: {m.status.lower()}")

    # Check achievements/certifications for competitive programming
    achievements = (extracted_data or {}).get("achievements", [])
    certs = (extracted_data or {}).get("certifications", [])

    for a in achievements:
        desc = a if isinstance(a, str) else str(a)
        lower = desc.lower()
        if any(kw in lower for kw in ["hackathon", "contest", "competitive", "leetcode", "codechef", "codeforces"]):
            score += 10
            evidence_items.append(f"Achievement: {desc[:80]}")

    for c in certs:
        desc = c if isinstance(c, str) else str(c)
        evidence_items.append(f"Certification: {desc[:80]}")
        score += 5

    return CategoryScore(
        "problem_solving", min(score, 100), weight,
        evidence=evidence_items,
        explanation=f"Based on DSA skills, achievements, and certifications."
    )


def _score_communication(extracted_data: dict | None, weight: float) -> CategoryScore:
    """Score communication indicators from resume quality."""
    score = 0
    evidence_items = []

    ed = extracted_data or {}
    # Headline present = structured thinking
    if ed.get("headline"):
        score += 15
        evidence_items.append(f"Headline: {ed['headline'][:80]}")

    # Links (portfolio, linkedin, github) show communication intent
    links = ed.get("links", [])
    if links:
        score += min(len(links) * 10, 25)
        for l in links[:3]:
            evidence_items.append(f"Link: {l}")

    # Education detail
    education = ed.get("education", [])
    if education:
        score += 10
        evidence_items.append(f"{len(education)} education entries")

    return CategoryScore(
        "communication", min(score, 100), weight,
        evidence=evidence_items,
        explanation="Based on resume structure, headline, links, and clarity."
    )


def _score_interview(interview_scores: list[int], weight: float) -> CategoryScore:
    """Use completed mock-interview scores; do not infer interview ability from a resume."""
    if not interview_scores:
        return CategoryScore(
            "interview", 0, weight, evidence=[],
            explanation="No completed mock interview scores are available.",
        )
    score = round(sum(interview_scores) / len(interview_scores))
    evidence_items = [f"Completed mock interview score: {value}/100" for value in interview_scores]
    return CategoryScore(
        "interview", max(0, min(100, score)), weight,
        evidence=evidence_items,
        explanation=f"Average score across {len(interview_scores)} completed mock interview(s).",
    )


# ─── Main Engine ──────────────────────────────────────

async def calculate_readiness(
    db: AsyncSession,
    profile_id: uuid.UUID,
    weights: dict | None = None,
) -> ReadinessResult:
    """
    Deterministic readiness calculation.
    Gemini is NOT called here — we use pre-extracted evidence only.
    """
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    if any(value < 0 for value in w.values()) or sum(w.values()) <= 0:
        raise ValueError("Readiness weights must be non-negative and have a positive total.")
    weight_total = sum(w.values())
    w = {key: value / weight_total for key, value in w.items()}

    # Get profile's target role
    stmt = select(TargetRole).where(
        TargetRole.profile_id == profile_id
    ).order_by(TargetRole.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    user_target = result.scalar_one_or_none()

    # If user has a personal target role, find the matching global role for skill requirements
    target_role_id = None
    if user_target:
        stmt = select(TargetRole).where(
            TargetRole.title == user_target.title,
            TargetRole.profile_id.is_(None),
        )
        result = await db.execute(stmt)
        global_role = result.scalar_one_or_none()
        if global_role:
            target_role_id = global_role.id

    # Get extracted data from latest resume
    stmt = select(Resume).where(
        Resume.profile_id == profile_id,
        Resume.status == "completed",
    ).order_by(Resume.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    resume = result.scalar_one_or_none()
    extracted_data = resume.extracted_data if resume else None

    interview_stmt = (
        select(InterviewScore.overall_score)
        .join(MockInterview, InterviewScore.interview_id == MockInterview.id)
        .where(MockInterview.profile_id == profile_id, MockInterview.status == "completed")
        .order_by(InterviewScore.created_at.asc())
    )
    interview_scores = list((await db.execute(interview_stmt)).scalars().all())

    # Skill matching
    skill_matches = []
    if target_role_id:
        skill_matches = await match_skills(
            db,
            profile_id,
            target_role_id,
            market_target_role_id=user_target.id if user_target else None,
        )

    # Calculate each category
    categories = [
        _score_technical(skill_matches, extracted_data, w["technical"]),
        _score_projects(extracted_data, w["projects"]),
        _score_experience(extracted_data, w["experience"]),
        _score_problem_solving(skill_matches, extracted_data, w["problem_solving"]),
        _score_communication(extracted_data, w["communication"]),
        _score_interview(interview_scores, w["interview"]),
    ]

    # Apply weights for overall score
    overall = 0.0
    for cat in categories:
        overall += cat.score * cat.weight

    overall_score = max(0, min(100, int(round(overall))))

    return ReadinessResult(
        overall_score=overall_score,
        categories=categories,
        skill_matches=skill_matches,
        weights_used=w,
        target_role_id=user_target.id if user_target else None,
    )


async def persist_readiness(
    db: AsyncSession,
    profile_id: uuid.UUID,
    result: ReadinessResult,
    target_role_id: uuid.UUID | None = None,
) -> ReadinessScore:
    """Save a readiness score snapshot to the database."""

    # Avoid recording repeated requests as artificial progress snapshots.
    have = [m.skill_name for m in result.skill_matches if m.status == "HAVE"]
    learning = [m.skill_name for m in result.skill_matches if m.status == "LEARNING"]
    missing = [m.skill_name for m in result.skill_matches if m.status == "MISSING"]
    skill_match_summary = {
        "have": have,
        "learning": learning,
        "missing": missing,
        "matches": [asdict(match) for match in result.skill_matches],
    }

    latest_stmt = (
        select(ReadinessScore)
        .where(ReadinessScore.profile_id == profile_id)
        .order_by(ReadinessScore.created_at.desc())
        .limit(1)
        .options(selectinload(ReadinessScore.breakdowns))
    )
    latest = (await db.execute(latest_stmt)).scalar_one_or_none()
    current_breakdowns = {
        item.category: (item.score, item.weight, item.evidence, item.explanation)
        for item in result.categories
    }
    if latest:
        previous_breakdowns = {
            item.category: (item.score, item.weight, item.evidence, item.explanation)
            for item in latest.breakdowns
        }
        if (
            latest.overall_score == result.overall_score
            and latest.target_role_id == (target_role_id or result.target_role_id)
            and latest.weights_used == result.weights_used
            and latest.skill_match_summary == skill_match_summary
            and previous_breakdowns == current_breakdowns
        ):
            return latest

    score_record = ReadinessScore(
        profile_id=profile_id,
        overall_score=result.overall_score,
        target_role_id=target_role_id or result.target_role_id,
        skill_match_summary=skill_match_summary,
        weights_used=result.weights_used,
    )
    db.add(score_record)
    await db.flush()

    for cat in result.categories:
        breakdown = ReadinessBreakdown(
            score_id=score_record.id,
            category=cat.category,
            score=cat.score,
            weight=cat.weight,
            evidence=cat.evidence,
            explanation=cat.explanation,
        )
        db.add(breakdown)

    await db.commit()
    await db.refresh(score_record)
    return score_record
