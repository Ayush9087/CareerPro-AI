"""Add fields for role-scoped job market snapshots and cache state.

Revision ID: f3a9d126c802
Revises: 7cd2b8adcdf9
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a9d126c802"
down_revision: Union[str, Sequence[str], None] = "7cd2b8adcdf9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("target_roles", sa.Column("market_checked_at", sa.DateTime(), nullable=True))
    op.add_column("target_roles", sa.Column("market_data_source", sa.String(), nullable=True))
    op.add_column("target_roles", sa.Column("market_location", sa.String(), nullable=True))
    op.add_column("job_snapshots", sa.Column("target_role_id", sa.UUID(), nullable=True))
    op.add_column("job_snapshots", sa.Column("external_id", sa.String(), nullable=True))
    op.add_column("job_snapshots", sa.Column("salary_min", sa.Float(), nullable=True))
    op.add_column("job_snapshots", sa.Column("salary_max", sa.Float(), nullable=True))
    op.add_column("job_snapshots", sa.Column("salary_currency", sa.String(), nullable=True))
    op.add_column("job_snapshots", sa.Column("experience_requirements", sa.Text(), nullable=True))
    op.add_column("job_snapshots", sa.Column("source", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_job_snapshots_target_role_id_target_roles",
        "job_snapshots",
        "target_roles",
        ["target_role_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_job_snapshots_target_role_id", "job_snapshots", ["target_role_id"])


def downgrade() -> None:
    op.drop_index("ix_job_snapshots_target_role_id", table_name="job_snapshots")
    op.drop_constraint("fk_job_snapshots_target_role_id_target_roles", "job_snapshots", type_="foreignkey")
    op.drop_column("job_snapshots", "source")
    op.drop_column("job_snapshots", "experience_requirements")
    op.drop_column("job_snapshots", "salary_currency")
    op.drop_column("job_snapshots", "salary_max")
    op.drop_column("job_snapshots", "salary_min")
    op.drop_column("job_snapshots", "external_id")
    op.drop_column("job_snapshots", "target_role_id")
    op.drop_column("target_roles", "market_location")
    op.drop_column("target_roles", "market_data_source")
    op.drop_column("target_roles", "market_checked_at")