"""
Gemini AI client — Reusable AI service layer using Google GenAI SDK.

Architecture:
  Gemini → Structured response → Pydantic validation → Business validation → Database

Features:
  - Retry with exponential backoff (3 attempts)
  - Structured JSON output via response_schema
  - Centralised logging
  - Controlled failure (AIException hierarchy)
  - Thread-pool execution for async compatibility
"""

import asyncio
import logging
from typing import TypeVar, Type

from google import genai
from pydantic import BaseModel
from tenacity import (
    retry,
    wait_exponential,
    stop_after_attempt,
    retry_if_exception_type,
)

from app.core.config import get_settings

logger = logging.getLogger("careerpro_ai.gemini")

# ─── Exceptions ───────────────────────────────────────
class AIException(Exception):
    """Base exception for all AI generation errors."""
    pass

class AITimeoutException(AIException):
    """Raised when the Gemini API does not respond within the expected window."""
    pass

class AIValidationException(AIException):
    """Raised when the model output fails Pydantic validation."""
    pass


# ─── Shared Client Singleton ─────────────────────────
_client: genai.Client | None = None

def get_genai_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
        logger.info("Gemini client initialised.")
    return _client


# ─── Core Generation (sync, runs in thread-pool) ─────
T = TypeVar("T", bound=BaseModel)

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((Exception,)),
    reraise=True,
)
def _generate_structured_sync(
    prompt: str,
    response_schema: Type[T],
    system_instruction: str | None = None,
) -> T:
    """
    Synchronous structured generation call.
    Retries up to 3 times on transient failures.
    """
    settings = get_settings()
    client = get_genai_client()

    config = genai.types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=response_schema,
        temperature=0.2,
    )
    if system_instruction:
        config.system_instruction = system_instruction

    logger.info(
        "Gemini call  model=%s  schema=%s",
        settings.gemini_model,
        response_schema.__name__,
    )

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )

    if not response.text:
        raise AIException("Received empty response from Gemini.")

    try:
        result = response_schema.model_validate_json(response.text)
    except Exception as exc:
        logger.error("Pydantic validation failed: %s", exc)
        raise AIValidationException(f"AI output failed validation: {exc}") from exc

    logger.info("Gemini call succeeded  schema=%s", response_schema.__name__)
    return result


@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((Exception,)),
    reraise=True,
)
def _generate_text_sync(
    prompt: str,
    system_instruction: str | None = None,
) -> str:
    """
    Synchronous free-text generation call (for chatbot).
    """
    settings = get_settings()
    client = get_genai_client()

    config = genai.types.GenerateContentConfig(
        temperature=0.7,
    )
    if system_instruction:
        config.system_instruction = system_instruction

    logger.info("Gemini text call  model=%s", settings.gemini_model)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )

    if not response.text:
        raise AIException("Received empty text response from Gemini.")

    logger.info("Gemini text call succeeded")
    return response.text


# ─── Async Wrappers (called from FastAPI services) ────
async def generate_structured(
    prompt: str,
    response_schema: Type[T],
    system_instruction: str | None = None,
) -> T:
    """Async wrapper — runs the sync Gemini call in a thread-pool executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: _generate_structured_sync(prompt, response_schema, system_instruction),
    )


async def generate_text(
    prompt: str,
    system_instruction: str | None = None,
) -> str:
    """Async wrapper for free-text generation."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: _generate_text_sync(prompt, system_instruction),
    )
