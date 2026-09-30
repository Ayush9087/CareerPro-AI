"""
Structured error handling for CareerPro AI.
"""

from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi import Request


class AppException(HTTPException):
    """Base application exception."""
    def __init__(self, status_code: int, detail: str, error_code: str = "UNKNOWN"):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found.",
            error_code="NOT_FOUND",
        )


class ForbiddenException(AppException):
    def __init__(self, detail: str = "You do not have permission to access this resource."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN",
        )


class BadRequestException(AppException):
    def __init__(self, detail: str = "Bad request."):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BAD_REQUEST",
        )


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists."):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT",
        )


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
            }
        },
    )
