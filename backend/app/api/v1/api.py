from fastapi import APIRouter
from app.api.v1.endpoints import users, onboarding, resumes, roles, readiness, market, roadmap, dashboard, interviews, chat, progress, institution

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(readiness.router, prefix="/readiness", tags=["readiness"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(chat.router, prefix="/chat", tags=["career-advisor"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(institution.router, prefix="/institutions", tags=["institution-admin"])
# We will add other routers here as we implement them (roadmap, etc)
