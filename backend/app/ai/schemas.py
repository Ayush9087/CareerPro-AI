"""
Pydantic schemas for all AI response validation.
Every Gemini result must pass through these before reaching the database.
"""

from pydantic import BaseModel, Field
from typing import List, Literal, Optional


# ─── Comprehensive Candidate Extraction ────────────────
class ExtractedSkillDetailAI(BaseModel):
    skill_name: str
    normalized_skill: str = Field(..., description="Canonical form, e.g. React.js -> React")
    evidence: str = Field(..., description="Brief snippet from resume")
    source: str = Field(..., description="E.g., Experience, Projects, Education, Summary")
    confidence: int = Field(..., ge=0, le=100, description="AI confidence in this extraction")
    proficiency_estimate: int = Field(..., ge=1, le=5, description="1=Beginner, 5=Expert")
    recency: str = Field(..., description="E.g., 2023, Recent, 5 years ago")

class CandidateExtractionAI(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    education: List[str] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list)
    skills: List[ExtractedSkillDetailAI] = Field(default_factory=list)


# ─── Resume Analysis ───────────────────────────────────
class ResumeAnalysisAI(BaseModel):
    strengths: List[str] = Field(..., min_length=1, max_length=10)
    weaknesses: List[str] = Field(..., min_length=1, max_length=10)
    ats_score: int = Field(..., ge=0, le=100)
    feedback: str


# ─── Skill Extraction ─────────────────────────────────
class ExtractedSkillAI(BaseModel):
    name: str
    category: str = Field(..., description="One of: technical, soft, tool, framework, language, domain")
    proficiency: int = Field(..., ge=1, le=5, description="1=beginner, 5=expert")
    evidence: str = Field(..., description="Brief excerpt from the resume that supports this skill")

class SkillExtractionAI(BaseModel):
    skills: List[ExtractedSkillAI]


# ─── Skill Normalization ──────────────────────────────
class NormalizedSkillAI(BaseModel):
    original: str
    normalized: str = Field(..., description="Canonical skill name, e.g. 'JS' → 'JavaScript'")
    category: str

class SkillNormalizationAI(BaseModel):
    skills: List[NormalizedSkillAI]


# ─── Skill Gap Analysis ───────────────────────────────
class SkillGapItemAI(BaseModel):
    skill_name: str
    priority: int = Field(..., ge=1, le=5)
    explanation: str = Field(..., description="Why this skill is needed and what the user is missing")
    resources: List[str] = Field(default_factory=list, description="Suggested learning resources")

class SkillGapAnalysisAI(BaseModel):
    gaps: List[SkillGapItemAI]
    summary: str


# ─── Career Readiness ─────────────────────────────────
class ReadinessBreakdownAI(BaseModel):
    category: str
    score: int = Field(..., ge=0, le=100)
    explanation: str

class CareerReadinessAI(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    breakdowns: List[ReadinessBreakdownAI]
    recommendations: List[str]


# ─── Interview ─────────────────────────────────────────
class InterviewQuestionAI(BaseModel):
    question_text: str = Field(..., min_length=12, max_length=1000)
    question_type: Literal["technical", "behavioral", "situational", "system_design"]
    difficulty: Literal["easy", "medium", "hard"]
    order_index: int = Field(..., ge=1, le=10)

class InterviewQuestionListAI(BaseModel):
    questions: List[InterviewQuestionAI] = Field(..., min_length=1, max_length=10)

class InterviewEvaluationAI(BaseModel):
    technical_accuracy: int = Field(..., ge=0, le=100)
    completeness: int = Field(..., ge=0, le=100)
    clarity: int = Field(..., ge=0, le=100)
    structure: int = Field(..., ge=0, le=100)
    communication: int = Field(..., ge=0, le=100)
    overall_score: int = Field(..., ge=0, le=100)
    what_went_well: List[str] = Field(..., min_length=1, max_length=8)
    what_was_missing: List[str] = Field(default_factory=list, max_length=8)
    how_to_improve: List[str] = Field(..., min_length=1, max_length=8)
    recommended_answer_structure: str = Field(..., min_length=8, max_length=600)

class InterviewFeedbackAI(BaseModel):
    score: int = Field(..., ge=0, le=10)
    feedback: str
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


# ─── Roadmap ──────────────────────────────────────────
class RoadmapTaskAI(BaseModel):
    title: str = Field(..., min_length=4, max_length=120)
    description: str = Field(..., min_length=12, max_length=1200)
    why_it_matters: str = Field(..., min_length=12, max_length=600)
    estimated_minutes: int = Field(..., ge=15, le=480)
    difficulty: int = Field(..., ge=1, le=5)
    skill: str = Field(..., min_length=1, max_length=100)
    resource: Optional[str] = Field(None, max_length=500)
    evidence_requirement: str = Field(..., min_length=8, max_length=500)

class RoadmapWeekAI(BaseModel):
    week_number: int = Field(..., ge=1, le=4)
    objective: str = Field(..., min_length=12, max_length=300)
    skills: List[str] = Field(..., min_length=1, max_length=10)
    estimated_hours: float = Field(..., gt=0, le=40)
    tasks: List[RoadmapTaskAI] = Field(..., min_length=2, max_length=12)

class RoadmapAI(BaseModel):
    title: str = Field(..., min_length=4, max_length=120)
    weeks: List[RoadmapWeekAI] = Field(..., min_length=4, max_length=4)


# ─── Chatbot ──────────────────────────────────────────
class ChatResponseAI(BaseModel):
    reply: str = Field(..., min_length=1, max_length=4000)
    suggested_actions: List[str] = Field(default_factory=list, max_length=3, description="Up to 3 follow-up actions the user could take")


# ─── Semantic Matching ─────────────────────────────────
class SemanticMatchAI(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0, description="Similarity score between 0 and 1")
    explanation: str
