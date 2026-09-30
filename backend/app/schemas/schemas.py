"""
Pydantic schemas for user profiles and onboarding.
"""

from uuid import UUID
from datetime import datetime
from typing import Literal, Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ─── Profile ───────────────────────────────────────────
class ProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    headline: Optional[str] = Field(None, max_length=240)
    bio: Optional[str] = Field(None, max_length=2000)
    college: Optional[str] = Field(None, max_length=200)
    degree: Optional[str] = Field(None, max_length=120)
    branch: Optional[str] = Field(None, max_length=120)
    graduation_year: Optional[int] = Field(None, ge=1950, le=2100)
    city: Optional[str] = Field(None, max_length=120)
    state: Optional[str] = Field(None, max_length=120)
    experience_level: Optional[str] = None
    career_preferences: Optional[dict] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=120)
    headline: Optional[str] = Field(None, max_length=240)
    bio: Optional[str] = Field(None, max_length=2000)
    college: Optional[str] = Field(None, max_length=200)
    degree: Optional[str] = Field(None, max_length=120)
    branch: Optional[str] = Field(None, max_length=120)
    graduation_year: Optional[int] = Field(None, ge=1950, le=2100)
    city: Optional[str] = Field(None, max_length=120)
    state: Optional[str] = Field(None, max_length=120)
    experience_level: Optional[str] = None
    career_preferences: Optional[dict] = None
    target_role: Optional[str] = Field(None, min_length=1, max_length=160)

class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: str
    full_name: str
    headline: Optional[str] = None
    bio: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    experience_level: Optional[str] = None
    career_preferences: Optional[dict] = None
    created_at: datetime
    updated_at: datetime


# ─── Resume ────────────────────────────────────────────
class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    profile_id: UUID
    file_path: str
    parsed_text: Optional[str] = None
    created_at: datetime

class ResumeAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    resume_id: UUID
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    ats_score: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime


# ─── Target Role ───────────────────────────────────────
class TargetRoleCreate(BaseModel):
    title: str
    industry: Optional[str] = None
    experience_level: Optional[str] = None

class TargetRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    profile_id: UUID
    title: str
    industry: Optional[str] = None
    experience_level: Optional[str] = None
    created_at: datetime


# ─── Skills ────────────────────────────────────────────
class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    category: Optional[str] = None

class UserSkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    skill: SkillOut
    proficiency: int

class SkillGapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    missing_skill: SkillOut
    priority: int


# ─── Readiness ─────────────────────────────────────────
class ReadinessBreakdownOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    category: str
    score: int

class ReadinessScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    overall_score: int
    breakdowns: List[ReadinessBreakdownOut] = []
    created_at: datetime


# ─── Roadmap ───────────────────────────────────────────
class RoadmapTaskOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    why_it_matters: Optional[str] = None
    estimated_minutes: Optional[int] = None
    difficulty: Optional[int] = None
    skill: Optional[str] = None
    resource: Optional[str] = None
    evidence_requirement: Optional[str] = None
    status: Literal["not_started", "in_progress", "completed", "skipped"]
    priority_score: int = 0
    evidence: Optional[str] = None

class RoadmapWeekOut(BaseModel):
    week_number: int
    objective: str
    skills: List[str]
    estimated_hours: float
    tasks: List[RoadmapTaskOut] = []

class RoadmapOut(BaseModel):
    id: UUID
    title: str
    target_role_id: Optional[UUID] = None
    readiness_score_id: Optional[UUID] = None
    weeks: List[RoadmapWeekOut] = []
    created_at: datetime

class RoadmapTaskStatusUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed", "skipped"]
    evidence: Optional[str] = Field(None, min_length=20, max_length=4000)


# ─── Interview ─────────────────────────────────────────
class InterviewStartIn(BaseModel):
    target_role_id: UUID
    interview_type: Literal["technical", "behavioral", "mixed"] = "mixed"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_count: int = Field(default=5, ge=3, le=10)

class InterviewAnswerIn(BaseModel):
    answer_text: str = Field(..., min_length=20, max_length=10000)

class InterviewAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    answer_text: str
    feedback: Optional[str] = None

class InterviewQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    question_text: str
    order_index: int
    answer: Optional[InterviewAnswerOut] = None

class InterviewScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    overall_score: int
    feedback_summary: Optional[str] = None

class MockInterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    status: str
    questions: List[InterviewQuestionOut] = []
    score: Optional[InterviewScoreOut] = None
    created_at: datetime


# ─── Chat ──────────────────────────────────────────────
class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    role: str
    content: str
    created_at: datetime

class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    created_at: datetime

class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=2, max_length=4000)
    session_id: Optional[UUID] = None


# ─── Activity ──────────────────────────────────────────
class ActivityEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    event_type: str
    metadata_json: Optional[dict] = None
    created_at: datetime
