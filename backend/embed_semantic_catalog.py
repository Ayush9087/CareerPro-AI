"""Backfill embeddings for canonical skills and curated learning resources."""

import asyncio

from app.core.db import AsyncSessionLocal
from app.services.embedding_service import embedding_service


async def main() -> None:
    async with AsyncSessionLocal() as db:
        counts = await embedding_service.backfill_catalog(db)
    print(f"Embedded {counts['skills']} skills and {counts['resources']} resources.")


if __name__ == "__main__":
    asyncio.run(main())