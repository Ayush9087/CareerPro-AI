"""
Resume AI — Resume understanding, skill extraction, and analysis using Gemini.

Responsibilities:
  - Full resume analysis (strengths, weaknesses, ATS score)
  - Skill extraction with evidence
  - Skill normalization to canonical names
"""

import logging
from app.ai.client import generate_structured, AIException
from app.ai.prompts import (
    RESUME_ANALYSIS_PROMPT,
    SKILL_EXTRACTION_PROMPT,
    SKILL_NORMALIZATION_PROMPT,
    CANDIDATE_EXTRACTION_PROMPT,
    SYSTEM_INSTRUCTION_CAREER,
)
from app.ai.schemas import (
    ResumeAnalysisAI,
    SkillExtractionAI,
    SkillNormalizationAI,
    CandidateExtractionAI,
)

logger = logging.getLogger("careerpro_ai.resume")

async def extract_candidate(resume_text: str) -> CandidateExtractionAI:
    """Extract a comprehensive structured candidate profile from resume text."""
    prompt = CANDIDATE_EXTRACTION_PROMPT.format(resume_text=resume_text[:8000])
    return await generate_structured(
        prompt, CandidateExtractionAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )

async def analyse_resume(
    resume_text: str, target_role: str = "General"
) -> ResumeAnalysisAI:
    """Analyse resume text and return structured ATS feedback."""
    prompt = RESUME_ANALYSIS_PROMPT.format(
        resume_text=resume_text[:8000],  # Truncate to avoid token limits
        target_role=target_role,
    )
    return await generate_structured(
        prompt, ResumeAnalysisAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )


async def extract_skills(resume_text: str) -> SkillExtractionAI:
    """Extract skills with evidence from resume text."""
    prompt = SKILL_EXTRACTION_PROMPT.format(resume_text=resume_text[:8000])
    return await generate_structured(
        prompt, SkillExtractionAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )


async def normalize_skills(raw_skills: list[str]) -> SkillNormalizationAI:
    """Normalize raw skill names to canonical forms."""
    prompt = SKILL_NORMALIZATION_PROMPT.format(raw_skills=", ".join(raw_skills))
    return await generate_structured(
        prompt, SkillNormalizationAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )
