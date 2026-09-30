import json
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, status
from typing import Annotated
from pydantic import ValidationError
from sqlalchemy import func, select

from app.api.deps import DbSession, CurrentUser
from app.schemas.schemas import ProfileOut, ProfileCreate
from app.services import profile_service
from app.models.domain import TargetRole, Resume
from app.services.resume_service import process_resume_background
from app.core.file_validation import MAX_RESUME_SIZE_BYTES, validate_resume_file
import uuid

router = APIRouter()

@router.post("/complete")
async def complete_onboarding(
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
    profile_data: Annotated[str, Form(...)],
    resume: Annotated[UploadFile, File(...)],
):
    """
    Handles the complete onboarding flow.
    Expects profile_data as a JSON string, and a resume file.
    """
    try:
        data_dict = json.loads(profile_data)
        profile_create = ProfileCreate(
            full_name=data_dict.get("full_name"),
            college=data_dict.get("college"),
            degree=data_dict.get("degree"),
            branch=data_dict.get("branch"),
            graduation_year=data_dict.get("graduation_year"),
            city=data_dict.get("city"),
            state=data_dict.get("state"),
            experience_level=data_dict.get("experience_level"),
            career_preferences={
                "available_study_time": data_dict.get("available_study_time"),
                "learning_style": data_dict.get("learning_style"),
                "confidence": data_dict.get("confidence"),
            },
        )
    except (json.JSONDecodeError, ValidationError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid onboarding profile data.")

    target_role_title = data_dict.get("target_role")
    global_role = None
    if target_role_title:
        role_stmt = select(TargetRole).where(
            TargetRole.profile_id.is_(None),
            func.lower(TargetRole.title) == str(target_role_title).strip().lower(),
        )
        global_role = (await db.execute(role_stmt)).scalar_one_or_none()
        if global_role is None:
            raise HTTPException(status_code=422, detail="Choose a target role from the available role list.")

    if resume.size is not None and resume.size > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="Resume must be 5 MB or smaller.")
    file_bytes = await resume.read(MAX_RESUME_SIZE_BYTES + 1)
    validate_resume_file(file_bytes, resume.filename, resume.content_type)

    # Persist only after all client-supplied data and file contents are validated.
    profile = await profile_service.create_profile(db, current_user.id, profile_create)

    if global_role:
        role = TargetRole(
            profile_id=profile.id,
            title=global_role.title,
        )
        db.add(role)
        await db.flush()

    # Create initial resume record
    resume_record = Resume(
        profile_id=profile.id,
        file_path="",
        status="uploaded"
    )
    db.add(resume_record)
    await db.commit()
    await db.refresh(resume_record)
    
    # Start background task to process resume
    background_tasks.add_task(
        process_resume_background,
        resume_id=resume_record.id,
        file_bytes=file_bytes,
        filename=resume.filename,
        content_type=resume.content_type,
        profile_id=profile.id
    )

    return {
        "message": "Onboarding completed successfully. Resume processing started.",
        "profile": ProfileOut.model_validate(profile),
        "resume_id": str(resume_record.id)
    }
