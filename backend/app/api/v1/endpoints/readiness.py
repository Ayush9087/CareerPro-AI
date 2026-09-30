"""Readiness score endpoints for the authenticated profile."""

from dataclasses import asdict

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundException
from app.models.domain import Profile, ReadinessScore
from app.services.readiness_engine import calculate_readiness, persist_readiness

router = APIRouter()


async def _current_readiness(db: DbSession, user_id: str):
    profile_stmt = select(Profile).where(Profile.user_id == user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if profile is None:
        raise NotFoundException("Profile")

    result = await calculate_readiness(db, profile.id)
    snapshot = await persist_readiness(db, profile.id, result, result.target_role_id)
    return result, snapshot


def _score_payload(category, key: str | None = None) -> dict:
    return {
        "value": category.score,
        "weight": category.weight,
        "evidence": category.evidence,
        "explanation": category.explanation,
        **({"key": key or category.category}),
    }


def _readiness_payload(result) -> dict:
    category_by_name = {category.category: category for category in result.categories}
    overall_evidence = [
        f"{category.category.replace('_', ' ').title()}: {category.score}/100"
        for category in result.categories
    ]
    payload = {
        "overall_score": {
            "value": result.overall_score,
            "weight": 1.0,
            "evidence": overall_evidence,
            "explanation": "Weighted deterministic score using the configured category weights.",
        },
        "weights": result.weights_used,
        "target_role_id": str(result.target_role_id) if result.target_role_id else None,
    }
    for category_name in result.weights_used:
        category = category_by_name[category_name]
        payload[f"{category_name}_score"] = _score_payload(category)
    return payload


@router.get("")
async def get_readiness(current_user: CurrentUser, db: DbSession):
    result, snapshot = await _current_readiness(db, current_user.id)
    return {**_readiness_payload(result), "id": str(snapshot.id), "created_at": snapshot.created_at}


@router.get("/history")
async def get_readiness_history(current_user: CurrentUser, db: DbSession):
    result, _ = await _current_readiness(db, current_user.id)
    profile_stmt = select(Profile.id).where(Profile.user_id == current_user.id)
    profile_id = (await db.execute(profile_stmt)).scalar_one()
    history_stmt = (
        select(ReadinessScore)
        .where(ReadinessScore.profile_id == profile_id)
        .order_by(ReadinessScore.created_at.asc())
        .options(selectinload(ReadinessScore.breakdowns))
    )
    snapshots = (await db.execute(history_stmt)).scalars().all()
    return {
        "history": [
            {
                "id": str(snapshot.id),
                "value": snapshot.overall_score,
                "created_at": snapshot.created_at,
            }
            for snapshot in snapshots
        ],
        "current_score": result.overall_score,
    }


@router.get("/breakdown")
async def get_readiness_breakdown(current_user: CurrentUser, db: DbSession):
    result, snapshot = await _current_readiness(db, current_user.id)
    payload = _readiness_payload(result)
    payload["skill_matches"] = [asdict(match) for match in result.skill_matches]
    payload["snapshot_id"] = str(snapshot.id)
    return payload