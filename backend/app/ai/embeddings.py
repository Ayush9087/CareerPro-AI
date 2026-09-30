"""
Embeddings — Text embedding generation using Gemini for semantic search.

Responsibilities:
  - Generate text embeddings for skills, job descriptions, resumes
  - Used for semantic matching between user skills and job requirements
"""

import asyncio
import logging
from google.genai import types

from app.ai.client import get_genai_client
from app.core.config import get_settings

logger = logging.getLogger("careerpro_ai.embeddings")
EMBEDDING_DIMENSIONS = 768


def _generate_embedding_sync(text: str, task_type: str) -> list[float]:
    """Generate a text embedding synchronously."""
    settings = get_settings()
    client = get_genai_client()

    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )

    if not response.embeddings or not response.embeddings[0].values:
        raise ValueError("Gemini returned no embedding.")
    values = response.embeddings[0].values
    if len(values) != EMBEDDING_DIMENSIONS:
        raise ValueError("Gemini returned an embedding with an unexpected dimension.")

    return list(values)


async def generate_embedding(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    """Generate a text embedding (async wrapper)."""
    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Embedding input cannot be empty.")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _generate_embedding_sync, clean_text, task_type)


async def generate_embeddings_batch(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
    concurrency: int = 4,
) -> list[list[float]]:
    """Generate a bounded-concurrency batch of embeddings."""
    semaphore = asyncio.Semaphore(max(1, concurrency))

    async def embed(text: str) -> list[float]:
        async with semaphore:
            return await generate_embedding(text, task_type)

    return await asyncio.gather(*(embed(text) for text in texts))


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = sum(a * a for a in vec_a) ** 0.5
    mag_b = sum(b * b for b in vec_b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
