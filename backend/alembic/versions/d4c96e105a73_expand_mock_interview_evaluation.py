"""Store interview mode and observable answer evaluations.

Revision ID: d4c96e105a73
Revises: aa61d30f8c4e
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4c96e105a73"
down_revision: Union[str, Sequence[str], None] = "aa61d30f8c4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mock_interviews", sa.Column("interview_type", sa.String(), server_default="mixed", nullable=False))
    op.add_column("mock_interviews", sa.Column("difficulty", sa.String(), server_default="medium", nullable=False))
    op.add_column("interview_questions", sa.Column("question_type", sa.String(), nullable=True))
    op.add_column("interview_questions", sa.Column("difficulty", sa.String(), nullable=True))
    for name in ("technical_accuracy", "completeness", "clarity", "structure", "communication", "overall_score"):
        op.add_column("interview_answers", sa.Column(name, sa.Integer(), nullable=True))
    for name in ("what_went_well", "what_was_missing", "how_to_improve"):
        op.add_column("interview_answers", sa.Column(name, sa.JSON(), nullable=True))
    op.add_column("interview_answers", sa.Column("recommended_answer_structure", sa.Text(), nullable=True))
    op.add_column("interview_scores", sa.Column("strong_areas", sa.JSON(), nullable=True))
    op.add_column("interview_scores", sa.Column("weak_areas", sa.JSON(), nullable=True))
    op.add_column("interview_scores", sa.Column("recommended_practice", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_scores", "recommended_practice")
    op.drop_column("interview_scores", "weak_areas")
    op.drop_column("interview_scores", "strong_areas")
    op.drop_column("interview_answers", "recommended_answer_structure")
    for name in ("how_to_improve", "what_was_missing", "what_went_well"):
        op.drop_column("interview_answers", name)
    for name in ("overall_score", "communication", "structure", "clarity", "completeness", "technical_accuracy"):
        op.drop_column("interview_answers", name)
    op.drop_column("interview_questions", "difficulty")
    op.drop_column("interview_questions", "question_type")
    op.drop_column("mock_interviews", "difficulty")
    op.drop_column("mock_interviews", "interview_type")