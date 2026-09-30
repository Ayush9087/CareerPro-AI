"""
Career AI — Career readiness assessment and skill gap analysis using Gemini.

Responsibilities:
  - Career readiness scoring with category breakdowns
  - Skill gap identification with explanations and resources
"""

import logging
from app.ai.client import generate_structured
from app.ai.prompts import (
    CAREER_READINESS_PROMPT,
    SKILL_GAP_PROMPT,
    SYSTEM_INSTRUCTION_CAREER,
)
from app.ai.schemas import CareerReadinessAI, SkillGapAnalysisAI

logger = logging.getLogger("careerpro_ai.career")


async def assess_career_readiness(
    profile: dict, skills: list[str], target_role: str
) -> CareerReadinessAI:
    """Assess career readiness with category-level breakdowns."""
    prompt = CAREER_READINESS_PROMPT.format(
        profile=profile,
        skills=", ".join(skills) if skills else "None listed",
        target_role=target_role,
    )
    return await generate_structured(
        prompt, CareerReadinessAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )


async def analyse_skill_gaps(
    current_skills: list[str],
    target_role: str,
    experience_level: str = "Fresher",
) -> SkillGapAnalysisAI:
    """Identify skill gaps between the user's skills and their target role."""
    prompt = SKILL_GAP_PROMPT.format(
        current_skills=", ".join(current_skills) if current_skills else "None listed",
        target_role=target_role,
        experience_level=experience_level,
    )
    return await generate_structured(
        prompt, SkillGapAnalysisAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )
