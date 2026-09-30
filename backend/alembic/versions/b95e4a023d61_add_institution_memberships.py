"""Add institution hierarchy and explicit dashboard membership roles.

Revision ID: b95e4a023d61
Revises: e5b2f7301c9d
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b95e4a023d61"
down_revision: Union[str, Sequence[str], None] = "e5b2f7301c9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "institutions",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("parent_institution_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("length(trim(name)) > 0", name="ck_institutions_name_nonempty"),
        sa.ForeignKeyConstraint(["parent_institution_id"], ["institutions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_institutions_slug"),
    )
    op.create_index("ix_institutions_slug", "institutions", ["slug"])
    op.create_index("ix_institutions_parent_institution_id", "institutions", ["parent_institution_id"])
    op.create_table(
        "institution_memberships",
        sa.Column("institution_id", sa.UUID(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(), server_default="student", nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("role IN ('student', 'institution_admin')", name="ck_institution_membership_role"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "profile_id", name="uq_institution_membership_profile"),
    )
    op.create_index("ix_institution_memberships_institution_id", "institution_memberships", ["institution_id"])
    op.create_index("ix_institution_memberships_profile_id", "institution_memberships", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_institution_memberships_profile_id", table_name="institution_memberships")
    op.drop_index("ix_institution_memberships_institution_id", table_name="institution_memberships")
    op.drop_table("institution_memberships")
    op.drop_index("ix_institutions_parent_institution_id", table_name="institutions")
    op.drop_index("ix_institutions_slug", table_name="institutions")
    op.drop_table("institutions")