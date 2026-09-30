"""
AI test endpoint — verifies Gemini integration is working end-to-end.
Protected and only available for development verification.
"""

from fastapi import APIRouter
from app.api.deps import CurrentUser
from app.ai.client import AIException

router = APIRouter()


@router.post("/test-resume-analysis")
async def test_resume_analysis(current_user: CurrentUser):
    """Quick test: Analyse a sample resume snippet."""
    from app.ai.resume_ai import analyse_resume

    sample_resume = """
    John Doe
    Software Engineering Student | B.Tech Computer Science
    
    Skills: Python, JavaScript, React, Node.js, SQL, Git
    
    Projects:
    - Built a full-stack e-commerce app with React and Express
    - Created a ML-based movie recommendation system using Python and scikit-learn
    
    Education:
    B.Tech in Computer Science, XYZ University (2024)
    GPA: 8.5/10
    
    Experience:
    Intern at TechCorp (Summer 2023) — Worked on REST API development using FastAPI.
    """

    try:
        result = await analyse_resume(sample_resume, "Full Stack Developer")
        return {
            "status": "success",
            "analysis": result.model_dump(),
        }
    except AIException as e:
        return {"status": "error", "message": str(e)}


@router.post("/test-skill-extraction")
async def test_skill_extraction(current_user: CurrentUser):
    """Quick test: Extract skills from a sample resume."""
    from app.ai.resume_ai import extract_skills

    sample_resume = """
    Experienced in Python, FastAPI, React, PostgreSQL.
    Built REST APIs and deployed them using Docker on AWS EC2.
    Strong communication and teamwork skills demonstrated in hackathon projects.
    """

    try:
        result = await extract_skills(sample_resume)
        return {
            "status": "success",
            "skills": [s.model_dump() for s in result.skills],
        }
    except AIException as e:
        return {"status": "error", "message": str(e)}


@router.post("/test-interview-questions")
async def test_interview_questions(current_user: CurrentUser):
    """Quick test: Generate interview questions."""
    from app.ai.interview_ai import generate_questions

    try:
        questions = await generate_questions("Full Stack Developer", "Fresher", 3)
        return {
            "status": "success",
            "questions": [q.model_dump() for q in questions],
        }
    except AIException as e:
        return {"status": "error", "message": str(e)}
