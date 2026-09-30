"""Expand roadmap storage for weekly objectives and validated tasks.

Revision ID: aa61d30f8c4e
Revises: f3a9d126c802
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "aa61d30f8c4e"
down_revision: Union[str, Sequence[str], None] = "f3a9d126c802"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("roadmaps", sa.Column("target_role_id", sa.UUID(), nullable=True))
    op.add_column("roadmaps", sa.Column("readiness_score_id", sa.UUID(), nullable=True))
    op.add_column("roadmaps", sa.Column("active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("roadmaps", sa.Column("context_snapshot", sa.JSON(), nullable=True))
    op.create_foreign_key("fk_roadmaps_target_role_id", "roadmaps", "target_roles", ["target_role_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_roadmaps_readiness_score_id", "roadmaps", "readiness_scores", ["readiness_score_id"], ["id"], ondelete="SET NULL")

    op.create_table(
        "roadmap_weeks",
        sa.Column("roadmap_id", sa.UUID(), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("estimated_hours", sa.Float(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["roadmap_id"], ["roadmaps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roadmap_weeks_roadmap_id", "roadmap_weeks", ["roadmap_id"])

    op.add_column("roadmap_tasks", sa.Column("week_id", sa.UUID(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("skill_id", sa.UUID(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("why_it_matters", sa.Text(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("estimated_minutes", sa.Integer(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("difficulty", sa.Integer(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("resource", sa.Text(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("evidence_requirement", sa.Text(), nullable=True))
    op.add_column("roadmap_tasks", sa.Column("rank_index", sa.Integer(), server_default="0", nullable=False))
    op.add_column("roadmap_tasks", sa.Column("priority_score", sa.Integer(), server_default="0", nullable=False))
    op.alter_column("roadmap_tasks", "status", server_default="not_started")
    op.execute("UPDATE roadmap_tasks SET status = 'not_started' WHERE status = 'pending'")
    op.create_foreign_key("fk_roadmap_tasks_week_id", "roadmap_tasks", "roadmap_weeks", ["week_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_roadmap_tasks_skill_id", "roadmap_tasks", "skills", ["skill_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_roadmap_tasks_skill_id", "roadmap_tasks", type_="foreignkey")
    op.drop_constraint("fk_roadmap_tasks_week_id", "roadmap_tasks", type_="foreignkey")
    op.drop_column("roadmap_tasks", "priority_score")
    op.drop_column("roadmap_tasks", "rank_index")
    op.drop_column("roadmap_tasks", "evidence_requirement")
    op.drop_column("roadmap_tasks", "resource")
    op.drop_column("roadmap_tasks", "difficulty")
    op.drop_column("roadmap_tasks", "estimated_minutes")
    op.drop_column("roadmap_tasks", "why_it_matters")
    op.drop_column("roadmap_tasks", "skill_id")
    op.drop_column("roadmap_tasks", "week_id")
    op.drop_table("roadmap_weeks")
    op.drop_constraint("fk_roadmaps_readiness_score_id", "roadmaps", type_="foreignkey")
    op.drop_constraint("fk_roadmaps_target_role_id", "roadmaps", type_="foreignkey")
    op.drop_column("roadmaps", "context_snapshot")
    op.drop_column("roadmaps", "active")
    op.drop_column("roadmaps", "readiness_score_id")
    op.drop_column("roadmaps", "target_role_id")