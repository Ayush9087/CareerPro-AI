"""
CareerPro AI — AI service layer.

Exposes all AI capabilities through clean async interfaces:
  - resume_ai: Resume analysis, skill extraction, normalization
  - career_ai: Readiness scoring, skill gap analysis
  - interview_ai: Question generation, answer evaluation
  - chatbot_ai: Conversational career coaching
  - embeddings: Semantic search via text embeddings
"""

from app.ai.client import AIException, AITimeoutException, AIValidationException

__all__ = [
    "AIException",
    "AITimeoutException",
    "AIValidationException",
]
