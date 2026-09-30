"""Selective embedding storage and pgvector cosine search."""

import hashlib
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import generate_embedding, generate_embeddings_batch
from app.core.config import get_settings
from app.models.domain import Resource, Skill


def embedding_text(entity: Skill | Resource) -> str:
    if isinstance(entity, Skill):
        parts = [entity.name, entity.category, entity.description, ", ".join(entity.aliases or [])]
    else:
        parts = [entity.title, entity.resource_type, entity.description, entity.url]
    return "\n".join(part.strip() for part in parts if part and part.strip())


class EmbeddingService:
    """Embeddings are limited to canonical skills and curated learning resources."""

    async def store_embedding(self, db: AsyncSession, entity: Skill | Resource, force: bool = False) -> bool:
        text = embedding_text(entity)
        if not text:
            return False
        settings = get_settings()
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if (
            not force
            and entity.embedding is not None
            and entity.embedding_content_hash == content_hash
            and entity.embedding_model == settings.gemini_embedding_model
        ):
            return False

        entity.embedding = await generate_embedding(text, task_type="RETRIEVAL_DOCUMENT")
        entity.embedding_content_hash = content_hash
        entity.embedding_model = settings.gemini_embedding_model
        db.add(entity)
        await db.flush()
        return True

    async def semantic_search(
        self,
        db: AsyncSession,
        query: str,
        entity_type: str = "skills",
        limit: int = 5,
        min_similarity: float = 0.45,
    ) -> list[dict]:
        limit = max(1, min(limit, 20))
        if entity_type == "skills":
            entity_model = Skill
            label = Skill.name
        elif entity_type == "resources":
            entity_model = Resource
            label = Resource.title
        else:
            raise ValueError("entity_type must be 'skills' or 'resources'.")

        async with db.begin_nested():
            has_embeddings = await db.scalar(
                select(entity_model.id).where(entity_model.embedding.is_not(None)).limit(1)
            )
        if has_embeddings is None:
            return []
        query_vector = await generate_embedding(query, task_type="RETRIEVAL_QUERY")
        distance = entity_model.embedding.cosine_distance(query_vector)

        stmt = (
            select(entity_model, label, distance.label("distance"))
            .where(entity_model.embedding.is_not(None))
            .order_by(distance)
            .limit(limit)
        )
        async with db.begin_nested():
            rows = (await db.execute(stmt)).all()
        results = []
        for entity, name, raw_distance in rows:
            similarity = max(0.0, min(1.0, 1.0 - float(raw_distance)))
            if similarity < min_similarity:
                continue
            result = {"id": str(entity.id), "name": name, "similarity": round(similarity, 4)}
            if isinstance(entity, Skill):
                result["category"] = entity.category
                result["description"] = entity.description
            else:
                result["resource_type"] = entity.resource_type
                result["url"] = entity.url
                result["description"] = entity.description
            results.append(result)
        return results

    async def backfill_catalog(self, db: AsyncSession, batch_size: int = 16) -> dict[str, int]:
        """Embed only catalog skills/resources whose source text has changed."""
        settings = get_settings()
        skills = (await db.execute(select(Skill).order_by(Skill.name))).scalars().all()
        resources = (await db.execute(select(Resource).order_by(Resource.title))).scalars().all()
        pending: list[Skill | Resource] = []
        for entity in [*skills, *resources]:
            text = embedding_text(entity)
            content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest() if text else None
            if text and (
                entity.embedding is None
                or entity.embedding_content_hash != content_hash
                or entity.embedding_model != settings.gemini_embedding_model
            ):
                pending.append(entity)

        counts = {"skills": 0, "resources": 0}
        batch_size = max(1, min(batch_size, 64))
        for start in range(0, len(pending), batch_size):
            batch: Sequence[Skill | Resource] = pending[start:start + batch_size]
            vectors = await generate_embeddings_batch(
                [embedding_text(entity) for entity in batch],
                task_type="RETRIEVAL_DOCUMENT",
                concurrency=4,
            )
            for entity, vector in zip(batch, vectors):
                text = embedding_text(entity)
                entity.embedding = vector
                entity.embedding_content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
                entity.embedding_model = settings.gemini_embedding_model
                db.add(entity)
                counts["skills" if isinstance(entity, Skill) else "resources"] += 1
            await db.flush()
        await db.commit()
        return counts


embedding_service = EmbeddingService()