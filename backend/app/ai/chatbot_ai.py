"""
Chatbot AI — Conversational career coach using Gemini.

Responsibilities:
  - Multi-turn career coaching conversations
  - Context-aware responses using user profile data
  - Suggested follow-up actions
"""

import logging
import json
from app.ai.client import generate_text, generate_structured
from app.ai.prompts import CHATBOT_SYSTEM_PROMPT, CHATBOT_RESPONSE_PROMPT
from app.ai.schemas import ChatResponseAI

logger = logging.getLogger("careerpro_ai.chatbot")


async def get_chat_response(
    message: str,
    history: list[dict],
    target_role: str = "General",
    experience_level: str = "Fresher",
    skills: list[str] | None = None,
    career_context: dict | None = None,
) -> ChatResponseAI:
    """
    Get a context-aware chat response.
    
    Args:
        message: The user's latest message.
        history: List of {"role": "user"|"assistant", "content": str} dicts.
        target_role: The user's target role for context.
        experience_level: The user's experience level.
        skills: The user's current skills for context.
    """
    # Build system prompt with user context
    context = career_context or {
        "target_role": target_role,
        "experience_level": experience_level,
        "skills": skills or [],
    }
    system_prompt = CHATBOT_SYSTEM_PROMPT.format(
        career_context=json.dumps(context, ensure_ascii=True, default=str),
    )

    # Format conversation history
    history_str = ""
    for msg in history[-10:]:  # Keep last 10 messages for context window
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_str += f"{role}: {content[:4000]}\n"

    prompt = CHATBOT_RESPONSE_PROMPT.format(
        history=history_str if history_str else "(No prior messages)",
        message=message,
    )

    return await generate_structured(
        prompt, ChatResponseAI, system_instruction=system_prompt
    )
