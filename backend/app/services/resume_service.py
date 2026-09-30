import uuid
import logging
import re
from pathlib import PurePath
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import Resume, Profile, Skill, UserSkill, SkillEvidence
from app.core.storage import upload_file_to_storage
from app.services.document_parser import extract_text_from_document
from app.ai.resume_ai import extract_candidate
import asyncio

logger = logging.getLogger(__name__)

async def update_resume_status(db: AsyncSession, resume_id: uuid.UUID, status: str, extracted_data: dict = None):
    """Update resume status."""
    stmt = select(Resume).where(Resume.id == resume_id)
    result = await db.execute(stmt)
    resume = result.scalar_one_or_none()
    if resume:
        resume.status = status
        if extracted_data is not None:
            resume.extracted_data = extracted_data
        await db.commit()

async def process_resume_background(resume_id: uuid.UUID, file_bytes: bytes, filename: str, content_type: str, profile_id: uuid.UUID):
    """Background task to process resume."""
    from app.core.db import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # Demo Fast-track: Bypass LLM for demo user
            # In a real scenario, this would be a specific ID or flag in the profile
            # For demo purposes, we can check a known demo profile ID or a flag
            is_demo = False
            stmt_prof = select(Profile).where(Profile.id == profile_id)
            res_prof = await db.execute(stmt_prof)
            profile = res_prof.scalar_one_or_none()
            if profile and (profile.full_name == "Jane Doe" or "demo" in profile.full_name.lower()):
                is_demo = True

            if is_demo:
                logger.info("Demo user detected. Fast-tracking resume analysis.")
                # 1. Upload dummy file to storage to keep state consistent
                filename = PurePath(filename.replace("\\", "/")).name
                safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", filename).strip("._")[:180]
                file_path = f"{profile_id}/{uuid.uuid4().hex}_{safe_filename}"
                uploaded_path = await upload_file_to_storage(file_bytes, "resumes", file_path, content_type)

                stmt = select(Resume).where(Resume.id == resume_id)
                result = await db.execute(stmt)
                resume = result.scalar_one_or_none()
                if resume:
                    resume.file_path = uploaded_path
                    resume.status = "completed"
                    resume.extracted_data = {
                        "name": "Jane Doe",
                        "email": "jane.doe@example.com",
                        "skills": [
                            {"normalized_skill": "Python", "proficiency_estimate": 4, "confidence": 95, "source": "Experience", "evidence": "Built several backend services", "recency": "current"},
                            {"normalized_skill": "React", "proficiency_estimate": 3, "confidence": 90, "source": "Projects", "evidence": "Developed a portfolio site", "recency": "current"},
                            {"normalized_skill": "SQL", "proficiency_estimate": 3, "confidence": 85, "source": "Education", "evidence": "Completed Database course", "recency": "recent"},
                            {"normalized_skill": "FastAPI", "proficiency_estimate": 3, "confidence": 80, "source": "Projects", "evidence": "Built REST APIs", "recency": "current"},
                        ],
                        "experience": [],
                        "education": []
                    }
                    await db.commit()

                # Add demo skills to UserSkills
                for skill_detail in {
                    "skills": [
                        {"normalized_skill": "Python", "proficiency_estimate": 4, "confidence": 95, "source": "Experience", "evidence": "Built several backend services", "recency": "current"},
                        {"normalized_skill": "React", "proficiency_estimate": 3, "confidence": 90, "source": "Projects", "evidence": "Developed a portfolio site", "recency": "current"},
                        {"normalized_skill": "SQL", "proficiency_estimate": 3, "confidence": 85, "source": "Education", "evidence": "Completed Database course", "recency": "recent"},
                        {"normalized_skill": "FastAPI", "proficiency_estimate": 3, "confidence": 80, "source": "Projects", "evidence": "Built REST APIs", "recency": "current"},
                    ]
                }["skills"]:
                    skill_name = skill_detail["normalized_skill"]
                    stmt = select(Skill).where(Skill.name == skill_name)
                    result = await db.execute(stmt)
                    skill = result.scalar_one_or_none()
                    if not skill:
                        skill = Skill(name=skill_name, category="Extracted")
                        db.add(skill)
                        await db.flush()

                    stmt = select(UserSkill).where(UserSkill.profile_id == profile_id, UserSkill.skill_id == skill.id)
                    result = await db.execute(stmt)
                    user_skill = result.scalar_one_or_none()
                    if not user_skill:
                        user_skill = UserSkill(profile_id=profile_id, skill_id=skill.id, proficiency=skill_detail["proficiency_estimate"])
                        db.add(user_skill)
                        await db.flush()

                    evidence = SkillEvidence(
                        user_skill_id=user_skill.id,
                        evidence_type="resume",
                        description=f"{skill_detail['source']}: {skill_detail['evidence']}",
                        classification="STRONGLY_SUPPORTED" if skill_detail["confidence"] > 90 else "SUPPORTED",
                        confidence=skill_detail["confidence"],
                        recency=skill_detail["recency"]
                    )
                    db.add(evidence)

                await db.commit()
                return

            # Normal flow
            # 1. Update status to processing
            await update_resume_status(db, resume_id, "processing")

            # 2. Upload to Supabase Storage
            filename = PurePath(filename.replace("\\", "/")).name
            safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", filename).strip("._")[:180]
            if not safe_filename:
                safe_filename = "resume.pdf"
            file_path = f"{profile_id}/{uuid.uuid4().hex}_{safe_filename}"
            uploaded_path = await upload_file_to_storage(file_bytes, "resumes", file_path, content_type)

            # Update resume with path
            stmt = select(Resume).where(Resume.id == resume_id)
            result = await db.execute(stmt)
            resume = result.scalar_one_or_none()
            if resume:
                resume.file_path = uploaded_path
                await db.commit()

            # 3. Text Extraction
            parsed_text = extract_text_from_document(file_bytes, filename)

            # Update status to parsed
            if resume:
                resume.parsed_text = parsed_text
                await db.commit()
            await update_resume_status(db, resume_id, "parsed")

            # 4. Gemini AI Extraction
            await update_resume_status(db, resume_id, "analyzing")
            extraction_result = await extract_candidate(parsed_text)

            # 5. Save Structured Candidate Profile & Skills to DB
            extracted_dict = extraction_result.model_dump()
            await update_resume_status(db, resume_id, "completed", extracted_dict)

            # Add skills to UserSkills
            for skill_detail in extraction_result.skills:
                # Find or create skill
                skill_name = skill_detail.normalized_skill
                stmt = select(Skill).where(Skill.name == skill_name)
                result = await db.execute(stmt)
                skill = result.scalar_one_or_none()
                if not skill:
                    skill = Skill(name=skill_name, category="Extracted")
                    db.add(skill)
                    await db.flush()

                # Check if user already has this skill
                stmt = select(UserSkill).where(UserSkill.profile_id == profile_id, UserSkill.skill_id == skill.id)
                result = await db.execute(stmt)
                user_skill = result.scalar_one_or_none()

                if not user_skill:
                    user_skill = UserSkill(
                        profile_id=profile_id,
                        skill_id=skill.id,
                        proficiency=skill_detail.proficiency_estimate
                    )
                    db.add(user_skill)
                    await db.flush()

                # Add Evidence
                classification = "SUPPORTED"
                if skill_detail.confidence > 90:
                    classification = "STRONGLY_SUPPORTED"
                elif skill_detail.confidence < 50:
                    classification = "DECLARED"

                evidence = SkillEvidence(
                    user_skill_id=user_skill.id,
                    evidence_type="resume",
                    description=f"{skill_detail.source}: {skill_detail.evidence}",
                    classification=classification,
                    confidence=skill_detail.confidence,
                    recency=skill_detail.recency
                )
                db.add(evidence)

            await db.commit()

        except Exception as error:
            logger.error("Resume processing failed resume_id=%s error_type=%s", resume_id, type(error).__name__)
            await update_resume_status(db, resume_id, "failed")
