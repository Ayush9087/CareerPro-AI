import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, Boolean, ForeignKey, JSON, Enum, DateTime, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from typing import List, Optional
import enum

from .base import Base, UUIDMixin, TimestampMixin

class Profile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "profiles"
    user_id: Mapped[str] = mapped_column(String, unique=True, index=True) # From Supabase Auth
    full_name: Mapped[str] = mapped_column(String)
    headline: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Onboarding Fields
    college: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    degree: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    graduation_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    experience_level: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    career_preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    resumes = relationship("Resume", back_populates="profile", cascade="all, delete-orphan")
    target_roles = relationship("TargetRole", back_populates="profile", cascade="all, delete-orphan")
    user_skills = relationship("UserSkill", back_populates="profile", cascade="all, delete-orphan")
    readiness_scores = relationship("ReadinessScore", back_populates="profile", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="profile", cascade="all, delete-orphan")
    interviews = relationship("MockInterview", back_populates="profile", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="profile", cascade="all, delete-orphan")

class Resume(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "resumes"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    file_path: Mapped[str] = mapped_column(String)
    parsed_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="uploaded") # uploaded, processing, parsed, analyzing, completed, failed
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    profile = relationship("Profile", back_populates="resumes")
    analysis = relationship("ResumeAnalysis", back_populates="resume", uselist=False, cascade="all, delete-orphan")

class ResumeAnalysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "resume_analysis"
    resume_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), unique=True, index=True)
    strengths: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    weaknesses: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    ats_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    resume = relationship("Resume", back_populates="analysis")

class TargetRole(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "target_roles"
    profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    experience_level: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    market_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    market_data_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    market_location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    profile = relationship("Profile", back_populates="target_roles")
    role_skills = relationship("RoleSkill", back_populates="target_role", cascade="all, delete-orphan")

class Skill(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "skills"
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aliases: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    importance: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(768), nullable=True)
    embedding_content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    embedding_model: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class RoleSkill(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "role_skills"
    target_role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("target_roles.id", ondelete="CASCADE"))
    skill_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    importance_level: Mapped[int] = mapped_column(Integer, default=1) # e.g. 1-5
    
    target_role = relationship("TargetRole", back_populates="role_skills")
    skill = relationship("Skill")

class UserSkill(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_skills"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    skill_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    proficiency: Mapped[int] = mapped_column(Integer, default=1) # e.g. 1-5
    
    profile = relationship("Profile", back_populates="user_skills")
    skill = relationship("Skill")
    evidence = relationship("SkillEvidence", back_populates="user_skill", cascade="all, delete-orphan")

class SkillEvidence(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "skill_evidence"
    user_skill_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_skills.id", ondelete="CASCADE"))
    evidence_type: Mapped[str] = mapped_column(String) # e.g. "resume", "interview", "project"
    description: Mapped[str] = mapped_column(Text)
    classification: Mapped[Optional[str]] = mapped_column(String, nullable=True) # DECLARED, SUPPORTED, STRONGLY_SUPPORTED
    confidence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # 0-100
    recency: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    user_skill = relationship("UserSkill", back_populates="evidence")

class ReadinessScore(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "readiness_scores"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    overall_score: Mapped[int] = mapped_column(Integer)
    target_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("target_roles.id", ondelete="SET NULL"), nullable=True)
    skill_match_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {have: [], learning: [], missing: []}
    weights_used: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    profile = relationship("Profile", back_populates="readiness_scores")
    breakdowns = relationship("ReadinessBreakdown", back_populates="readiness_score", cascade="all, delete-orphan")

class ReadinessBreakdown(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "readiness_breakdowns"
    score_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("readiness_scores.id", ondelete="CASCADE"))
    category: Mapped[str] = mapped_column(String)  # technical, projects, experience, problem_solving, communication, interview
    score: Mapped[int] = mapped_column(Integer)
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # list of evidence snippets
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    readiness_score = relationship("ReadinessScore", back_populates="breakdowns")

class SkillGap(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "skill_gaps"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    target_role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("target_roles.id", ondelete="CASCADE"))
    missing_skill_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    priority: Mapped[int] = mapped_column(Integer) # e.g. 1-5
    
    profile = relationship("Profile", back_populates="skill_gaps") if False else None # Optional backpop
    target_role = relationship("TargetRole")
    missing_skill = relationship("Skill")

class Roadmap(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roadmaps"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    target_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("target_roles.id", ondelete="SET NULL"), nullable=True)
    readiness_score_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("readiness_scores.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    context_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    profile = relationship("Profile", back_populates="roadmaps")
    weeks = relationship("RoadmapWeek", back_populates="roadmap", cascade="all, delete-orphan", order_by="RoadmapWeek.week_number")
    tasks = relationship("RoadmapTask", back_populates="roadmap", cascade="all, delete-orphan")

class RoadmapWeek(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roadmap_weeks"
    roadmap_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"), index=True)
    week_number: Mapped[int] = mapped_column(Integer)
    objective: Mapped[str] = mapped_column(Text)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    estimated_hours: Mapped[float] = mapped_column(Float)

    roadmap = relationship("Roadmap", back_populates="weeks")
    tasks = relationship("RoadmapTask", back_populates="week", cascade="all, delete-orphan", order_by="RoadmapTask.rank_index")

class RoadmapTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roadmap_tasks"
    roadmap_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"))
    week_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("roadmap_weeks.id", ondelete="CASCADE"), nullable=True)
    skill_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    why_it_matters: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resource: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_requirement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="not_started", server_default="not_started")
    rank_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    priority_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    
    roadmap = relationship("Roadmap", back_populates="tasks")
    week = relationship("RoadmapWeek", back_populates="tasks")
    skill = relationship("Skill")
    progress = relationship("TaskProgress", back_populates="task", cascade="all, delete-orphan")

class TaskProgress(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "task_progress"
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roadmap_tasks.id", ondelete="CASCADE"))
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    task = relationship("RoadmapTask", back_populates="progress")

class MockInterview(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "mock_interviews"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    target_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("target_roles.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="scheduled") # scheduled, completed
    interview_type: Mapped[str] = mapped_column(String, default="mixed", server_default="mixed")
    difficulty: Mapped[str] = mapped_column(String, default="medium", server_default="medium")
    
    profile = relationship("Profile", back_populates="interviews")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    score = relationship("InterviewScore", back_populates="interview", uselist=False, cascade="all, delete-orphan")

class InterviewQuestion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "interview_questions"
    interview_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_interviews.id", ondelete="CASCADE"))
    question_text: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    interview = relationship("MockInterview", back_populates="questions")
    answer = relationship("InterviewAnswer", back_populates="question", uselist=False, cascade="all, delete-orphan")

class InterviewAnswer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "interview_answers"
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("interview_questions.id", ondelete="CASCADE"), unique=True)
    answer_text: Mapped[str] = mapped_column(Text)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    technical_accuracy: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completeness: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clarity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    structure: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    communication: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    overall_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    what_went_well: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    what_was_missing: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    how_to_improve: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    recommended_answer_structure: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    question = relationship("InterviewQuestion", back_populates="answer")

class InterviewScore(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "interview_scores"
    interview_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_interviews.id", ondelete="CASCADE"), unique=True)
    overall_score: Mapped[int] = mapped_column(Integer)
    feedback_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strong_areas: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    weak_areas: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    recommended_practice: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    
    interview = relationship("MockInterview", back_populates="score")

class ChatSession(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_sessions"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String, default="New Chat")
    
    profile = relationship("Profile", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_messages"
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String) # user, assistant
    content: Mapped[str] = mapped_column(Text)
    
    session = relationship("ChatSession", back_populates="messages")

class Resource(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "resources"
    title: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(768), nullable=True)
    embedding_content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    embedding_model: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class JobSnapshot(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "job_snapshots"
    target_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("target_roles.id", ondelete="CASCADE"), index=True, nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    company: Mapped[str] = mapped_column(String)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String)
    salary_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    salary_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    salary_currency: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    experience_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    job_skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")

class JobSkill(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "job_skills"
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("job_snapshots.id", ondelete="CASCADE"))
    skill_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    
    job = relationship("JobSnapshot", back_populates="job_skills")
    skill = relationship("Skill")

class ActivityEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "activity_events"
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String) # e.g. "resume_uploaded", "interview_completed"
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

class Institution(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "institutions"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_institutions_slug"),
        CheckConstraint("length(trim(name)) > 0", name="ck_institutions_name_nonempty"),
    )

    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, index=True)
    parent_institution_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    parent = relationship("Institution", remote_side="Institution.id", back_populates="children")
    children = relationship("Institution", back_populates="parent")
    memberships = relationship("InstitutionMembership", back_populates="institution", cascade="all, delete-orphan")

class InstitutionMembership(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "institution_memberships"
    __table_args__ = (
        UniqueConstraint("institution_id", "profile_id", name="uq_institution_membership_profile"),
        CheckConstraint("role IN ('student', 'institution_admin')", name="ck_institution_membership_role"),
    )

    institution_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("institutions.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String, default="student", server_default="student")

    institution = relationship("Institution", back_populates="memberships")
    profile = relationship("Profile")
