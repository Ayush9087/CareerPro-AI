import uuid
import logging
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, status
from typing import Annotated

from app.api.deps import DbSession, CurrentUser
from app.models.domain import Resume, Profile
from sqlalchemy import select
from app.services.resume_service import process_resume_background
from app.core.file_validation import MAX_RESUME_SIZE_BYTES, validate_resume_file
from app.core.storage import create_private_signed_url

router = APIRouter()
logger = logging.getLogger("careerpro_ai.resumes")

@router.post("/upload")
async def upload_resume(
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(...)],
):
    """Upload a resume and start background processing."""
    
    if file.size is not None and file.size > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="Resume must be 5 MB or smaller.")

    file_bytes = await file.read(MAX_RESUME_SIZE_BYTES + 1)
    validate_resume_file(file_bytes, file.filename, file.content_type)
    
    # Get user profile
    stmt = select(Profile).where(Profile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    # Create initial resume record
    resume = Resume(
        profile_id=profile.id,
        file_path="", # Will be updated in background
        status="uploaded"
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    # Start background task
    background_tasks.add_task(
        process_resume_background,
        resume_id=resume.id,
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
        profile_id=profile.id
    )
    
    return {"message": "Resume uploaded successfully", "resume_id": str(resume.id)}

@router.get("/{resume_id}/status")
async def get_resume_status(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get the current processing status of a resume."""
    stmt = (
        select(Resume)
        .join(Profile, Profile.id == Resume.profile_id)
        .where(Resume.id == resume_id, Profile.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    return {
        "status": resume.status,
        "extracted_data": resume.extracted_data if resume.status == "completed" else None
    }

@router.get("/latest")
async def get_latest_resume(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get the latest parsed resume for the current user."""
    stmt = select(Profile).where(Profile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    stmt = select(Resume).where(Resume.profile_id == profile.id).order_by(Resume.created_at.desc()).limit(1)
    resume = (await db.execute(stmt)).scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="No resumes found.")
        
    return {
        "id": str(resume.id),
        "status": resume.status,
        "created_at": resume.created_at,
        "extracted_data": resume.extracted_data
    }


@router.get("/{resume_id}/download")
async def get_resume_download_url(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    stmt = (
        select(Resume, Profile.id)
        .join(Profile, Profile.id == Resume.profile_id)
        .where(Resume.id == resume_id, Profile.user_id == current_user.id)
    )
    row = (await db.execute(stmt)).first()
    if row is None or not row[0].file_path:
        raise HTTPException(status_code=404, detail="Resume not found.")
    resume, profile_id = row
    allowed_prefixes = (f"{profile_id}/", f"resumes/{profile_id}/")
    if not resume.file_path.startswith(allowed_prefixes):
        raise HTTPException(status_code=404, detail="Resume not found.")
    storage_path = resume.file_path.removeprefix("resumes/")
    try:
        signed_url = await create_private_signed_url("resumes", storage_path, expires_in=60)
    except Exception as error:
        logger.warning("Resume signed URL creation failed (%s)", type(error).__name__)
        raise HTTPException(status_code=503, detail="Resume download is temporarily unavailable.") from error
    return {"url": signed_url, "expires_in": 60}
