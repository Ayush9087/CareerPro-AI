"""
CareerPro AI — FastAPI Application Entry Point.
"""

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import setup_logging, logger

setup_logging()
settings = get_settings()

app = FastAPI(
    title="CareerPro AI",
    description="AI-powered career readiness platform API",
    version="0.1.0",
)

MAX_MULTIPART_REQUEST_BYTES = 6 * 1024 * 1024
UPLOAD_PATHS = {"/api/v1/resumes/upload", "/api/v1/onboarding/complete"}

# Structured error handler
app.add_exception_handler(AppException, app_exception_handler)


@app.exception_handler(RequestValidationError)
async def safe_validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"loc": [str(part) for part in error.get("loc", ())], "msg": "Invalid input.", "type": error.get("type", "value_error")}
                for error in exc.errors()
            ],
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def safe_unhandled_error(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled request error request_id=%s", request_id)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "request_id": request_id},
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    request.state.request_id = uuid4().hex
    if request.method == "POST" and request.url.path in UPLOAD_PATHS:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_MULTIPART_REQUEST_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Uploaded request exceeds the size limit.", "request_id": request.state.request_id},
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid request size.", "request_id": request.state.request_id})
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["Retry-After", "X-Request-ID"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "healthy", "service": "careerpro-ai", "version": "0.1.0"}


# Mount v1 router
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")

logger.info("CareerPro AI backend started.")

