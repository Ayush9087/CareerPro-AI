"""
Interview AI — Mock interview question generation and answer evaluation using Gemini.

Responsibilities:
  - Generate role-specific interview questions with type/difficulty metadata
  - Evaluate candidate answers with scores, strengths, and improvements
"""

import logging
from app.ai.client import generate_structured
from app.ai.prompts import (
    INTERVIEW_QUESTION_PROMPT,
    INTERVIEW_FEEDBACK_PROMPT,
    SYSTEM_INSTRUCTION_CAREER,
)
from app.ai.schemas import (
    InterviewQuestionAI,
    InterviewQuestionListAI,
    InterviewEvaluationAI,
)

logger = logging.getLogger("careerpro_ai.interview")


async def generate_questions(
    target_role: str,
    experience_level: str = "Fresher",
    num_questions: int = 5,
    interview_type: str = "mixed",
    difficulty: str = "medium",
) -> list[InterviewQuestionAI]:
    """Generate interview questions tailored to the role and experience level."""
    prompt = INTERVIEW_QUESTION_PROMPT.format(
        target_role=target_role,
        experience_level=experience_level,
        num_questions=num_questions,
        interview_type=interview_type,
        difficulty=difficulty,
    )
    result = await generate_structured(
        prompt, InterviewQuestionListAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )
    return result.questions


async def evaluate_answer(
    question: str,
    question_type: str,
    answer: str,
    interview_type: str = "mixed",
) -> InterviewEvaluationAI:
    """Evaluate a candidate's interview answer."""
    prompt = INTERVIEW_FEEDBACK_PROMPT.format(
        question=question,
        question_type=question_type,
        interview_type=interview_type,
        answer=answer,
    )
    return await generate_structured(
        prompt, InterviewEvaluationAI, system_instruction=SYSTEM_INSTRUCTION_CAREER
    )
