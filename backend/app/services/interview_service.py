"""Persisted AI mock interview workflow and evidence-based evaluation."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.interview_ai import evaluate_answer, generate_questions
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.domain import (
    ActivityEvent,
    InterviewAnswer,
    InterviewQuestion,
    InterviewScore,
    MockInterview,
    Profile,
    TargetRole,
)
from app.schemas.schemas import InterviewAnswerIn, InterviewStartIn
from app.services.readiness_engine import calculate_readiness, persist_readiness

SCORE_DIMENSIONS = (
    "technical_accuracy",
    "completeness",
    "clarity",
    "structure",
    "communication",
)


async def get_interview_options(db: AsyncSession, user_id: str) -> dict:
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    role_stmt = (
        select(TargetRole)
        .where(TargetRole.profile_id.is_(None))
        .order_by(TargetRole.title)
    )
    roles = (await db.execute(role_stmt)).scalars().all()
    selected_stmt = (
        select(TargetRole.title)
        .where(TargetRole.profile_id == profile.id)
        .order_by(TargetRole.created_at.desc())
        .limit(1)
    )
    selected_title = (await db.execute(selected_stmt)).scalar_one_or_none()
    default_role = next((role for role in roles if role.title.casefold() == (selected_title or "").casefold()), None)
    return {
        "roles": [{"id": str(role.id), "title": role.title} for role in roles],
        "default_target_role_id": str(default_role.id) if default_role else None,
        "experience_level": profile.experience_level or "Early career",
        "interview_types": ["technical", "behavioral", "mixed"],
        "difficulties": ["easy", "medium", "hard"],
    }


def _serialize_interview(interview: MockInterview) -> dict:
    questions = []
    for question in sorted(interview.questions, key=lambda item: item.order_index):
        answer = question.answer
        questions.append({
            "id": str(question.id),
            "question_text": question.question_text,
            "question_type": question.question_type,
            "difficulty": question.difficulty,
            "order_index": question.order_index,
            "answer": None if answer is None else {
                "answer_text": answer.answer_text,
                "technical_accuracy": answer.technical_accuracy,
                "completeness": answer.completeness,
                "clarity": answer.clarity,
                "structure": answer.structure,
                "communication": answer.communication,
                "overall_score": answer.overall_score,
                "what_went_well": answer.what_went_well or [],
                "what_was_missing": answer.what_was_missing or [],
                "how_to_improve": answer.how_to_improve or [],
                "recommended_answer_structure": answer.recommended_answer_structure,
            },
        })
    score = interview.score
    return {
        "id": str(interview.id),
        "target_role_id": str(interview.target_role_id) if interview.target_role_id else None,
        "interview_type": interview.interview_type,
        "difficulty": interview.difficulty,
        "status": interview.status,
        "created_at": interview.created_at,
        "questions": questions,
        "completed_questions": sum(question["answer"] is not None for question in questions),
        "score": None if score is None else {
            "overall_score": score.overall_score,
            "feedback_summary": score.feedback_summary,
            "strong_areas": score.strong_areas or [],
            "weak_areas": score.weak_areas or [],
            "recommended_practice": score.recommended_practice or [],
        },
    }


def _interview_load_options():
    question_path = selectinload(MockInterview.questions)
    return (
        question_path.selectinload(InterviewQuestion.answer),
        selectinload(MockInterview.score),
    )


async def _get_owned_interview(db: AsyncSession, interview_id: uuid.UUID, user_id: str) -> MockInterview:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        raise NotFoundException("Profile")
    interview_stmt = (
        select(MockInterview)
        .where(MockInterview.id == interview_id, MockInterview.profile_id == profile_id)
        .options(*_interview_load_options())
    )
    interview = (await db.execute(interview_stmt)).scalar_one_or_none()
    if interview is None:
        raise NotFoundException("Mock interview")
    return interview


async def start_interview(db: AsyncSession, user_id: str, data: InterviewStartIn) -> dict:
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    role_stmt = select(TargetRole).where(
        TargetRole.id == data.target_role_id,
        TargetRole.profile_id.is_(None),
    )
    target_role = (await db.execute(role_stmt)).scalar_one_or_none()
    if target_role is None:
        raise NotFoundException("Target role")

    questions = await generate_questions(
        target_role=target_role.title,
        experience_level=profile.experience_level or "Early career",
        num_questions=data.question_count,
        interview_type=data.interview_type,
        difficulty=data.difficulty,
    )
    if len(questions) != data.question_count:
        raise BadRequestException("The generated question set did not match the requested question count.")

    allowed_types = {
        "technical": {"technical", "system_design", "situational"},
        "behavioral": {"behavioral", "situational"},
        "mixed": {"technical", "system_design", "behavioral", "situational"},
    }[data.interview_type]
    if any(question.question_type not in allowed_types for question in questions):
        raise BadRequestException("The generated question set did not match the selected interview type.")
    if any(question.difficulty != data.difficulty for question in questions):
        raise BadRequestException("The generated question set did not match the selected difficulty.")

    interview = MockInterview(
        profile_id=profile.id,
        target_role_id=target_role.id,
        status="in_progress",
        interview_type=data.interview_type,
        difficulty=data.difficulty,
    )
    db.add(interview)
    await db.flush()
    for order_index, generated in enumerate(questions, start=1):
        db.add(InterviewQuestion(
            interview_id=interview.id,
            question_text=generated.question_text.strip(),
            order_index=order_index,
            question_type=generated.question_type,
            difficulty=generated.difficulty,
        ))
    await db.commit()
    return await get_interview(db, interview.id, user_id)


async def get_interview(db: AsyncSession, interview_id: uuid.UUID, user_id: str) -> dict:
    interview = await _get_owned_interview(db, interview_id, user_id)
    return _serialize_interview(interview)


async def list_interviews(db: AsyncSession, user_id: str) -> list[dict]:
    profile_stmt = select(Profile.id).where(Profile.user_id == user_id)
    profile_id = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile_id is None:
        raise NotFoundException("Profile")
    stmt = (
        select(MockInterview)
        .where(MockInterview.profile_id == profile_id)
        .order_by(MockInterview.created_at.desc())
        .limit(10)
        .options(*_interview_load_options())
    )
    interviews = (await db.execute(stmt)).scalars().all()
    return [_serialize_interview(interview) for interview in interviews]


def _aggregate_score(answers: list[InterviewAnswer]) -> tuple[int, list[str], list[str], list[str], dict[str, int]]:
    averages = {
        dimension: round(sum(getattr(answer, dimension) or 0 for answer in answers) / len(answers))
        for dimension in SCORE_DIMENSIONS
    }
    strong_areas = [f"{name.replace('_', ' ').title()} ({value}/100)" for name, value in averages.items() if value >= 75]
    weak_areas = [f"{name.replace('_', ' ').title()} ({value}/100)" for name, value in averages.items() if value < 60]
    recommended_practice = [
        f"Practice concise answers that improve {name.replace('_', ' ')}."
        for name, value in averages.items()
        if value < 70
    ]
    if not recommended_practice:
        recommended_practice.append("Continue practicing role-specific questions and explaining your reasoning with concrete examples.")
    overall = round(sum(answer.overall_score or 0 for answer in answers) / len(answers))
    return overall, strong_areas, weak_areas, recommended_practice, averages


async def submit_answer(
    db: AsyncSession,
    user_id: str,
    interview_id: uuid.UUID,
    question_id: uuid.UUID,
    data: InterviewAnswerIn,
) -> dict:
    interview = await _get_owned_interview(db, interview_id, user_id)
    if interview.status == "completed":
        raise BadRequestException("This interview has already been completed.")

    unanswered = [question for question in interview.questions if question.answer is None]
    if not unanswered:
        raise BadRequestException("There are no unanswered questions in this interview.")
    current_question = min(unanswered, key=lambda item: item.order_index)
    if current_question.id != question_id:
        raise BadRequestException("Answer the current question before moving to the next one.")

    evaluation = await evaluate_answer(
        current_question.question_text,
        current_question.question_type or interview.interview_type,
        data.answer_text,
        interview_type=interview.interview_type,
    )
    answer = InterviewAnswer(
        question=current_question,
        answer_text=data.answer_text.strip(),
        feedback=" ".join(evaluation.how_to_improve),
        technical_accuracy=evaluation.technical_accuracy,
        completeness=evaluation.completeness,
        clarity=evaluation.clarity,
        structure=evaluation.structure,
        communication=evaluation.communication,
        overall_score=evaluation.overall_score,
        what_went_well=evaluation.what_went_well,
        what_was_missing=evaluation.what_was_missing,
        how_to_improve=evaluation.how_to_improve,
        recommended_answer_structure=evaluation.recommended_answer_structure,
    )
    current_question.answer = answer
    db.add(answer)
    await db.flush()

    is_last_answer = len(unanswered) == 1
    if is_last_answer:
        interview.status = "completed"
        answers = [question.answer for question in interview.questions if question.answer is not None]
        overall, strong_areas, weak_areas, recommended_practice, averages = _aggregate_score(answers)
        interview.score = InterviewScore(
            overall_score=overall,
            feedback_summary=f"Average observable answer score across {len(answers)} questions: {overall}/100.",
            strong_areas=strong_areas,
            weak_areas=weak_areas,
            recommended_practice=recommended_practice,
        )
        db.add(interview.score)
        db.add(ActivityEvent(
            profile_id=interview.profile_id,
            event_type="interview_completed",
            metadata_json={
                "interview_id": str(interview.id),
                "target_role_id": str(interview.target_role_id) if interview.target_role_id else None,
                "overall_score": overall,
                "strong_areas": strong_areas,
                "weak_areas": weak_areas,
            },
        ))
        await db.flush()
        readiness = await calculate_readiness(db, interview.profile_id)
        await persist_readiness(db, interview.profile_id, readiness, readiness.target_role_id)

    await db.commit()
    refreshed = await get_interview(db, interview.id, user_id)
    refreshed["latest_evaluation"] = {
        "technical_accuracy": evaluation.technical_accuracy,
        "completeness": evaluation.completeness,
        "clarity": evaluation.clarity,
        "structure": evaluation.structure,
        "communication": evaluation.communication,
        "overall_score": evaluation.overall_score,
        "what_went_well": evaluation.what_went_well,
        "what_was_missing": evaluation.what_was_missing,
        "how_to_improve": evaluation.how_to_improve,
        "recommended_answer_structure": evaluation.recommended_answer_structure,
    }
    refreshed["next_question_id"] = next(
        (question["id"] for question in refreshed["questions"] if question["answer"] is None),
        None,
    )
    refreshed["completed"] = refreshed["status"] == "completed"
    return refreshed