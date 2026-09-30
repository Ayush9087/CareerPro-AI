"""Add pgvector embeddings to canonical skills and curated resources.

Revision ID: e5b2f7301c9d
Revises: d4c96e105a73
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "e5b2f7301c9d"
down_revision: Union[str, Sequence[str], None] = "d4c96e105a73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column("skills", sa.Column("embedding", Vector(768), nullable=True))
    op.add_column("skills", sa.Column("embedding_content_hash", sa.String(length=64), nullable=True))
    op.add_column("skills", sa.Column("embedding_model", sa.String(), nullable=True))
    op.add_column("resources", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("resources", sa.Column("embedding", Vector(768), nullable=True))
    op.add_column("resources", sa.Column("embedding_content_hash", sa.String(length=64), nullable=True))
    op.add_column("resources", sa.Column("embedding_model", sa.String(), nullable=True))
    op.create_index(
        "ix_skills_embedding_hnsw",
        "skills",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.create_index(
        "ix_resources_embedding_hnsw",
        "resources",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_resources_embedding_hnsw", table_name="resources")
    op.drop_index("ix_skills_embedding_hnsw", table_name="skills")
    op.drop_column("resources", "embedding_model")
    op.drop_column("resources", "embedding_content_hash")
    op.drop_column("resources", "embedding")
    op.drop_column("resources", "description")
    op.drop_column("skills", "embedding_model")
    op.drop_column("skills", "embedding_content_hash")
    op.drop_column("skills", "embedding")