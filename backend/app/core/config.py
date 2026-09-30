from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Database
    database_url: str

    # AI
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"

    # Readiness score weights
    readiness_technical_weight: float = 0.30
    readiness_projects_weight: float = 0.20
    readiness_experience_weight: float = 0.15
    readiness_problem_solving_weight: float = 0.15
    readiness_communication_weight: float = 0.10
    readiness_interview_weight: float = 0.10

    # Job Market
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    adzuna_country: str = "us"
    adzuna_results_per_page: int = 50
    market_cache_hours: int = 24

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins or "*" in origins:
            raise ValueError("CORS must use an explicit allowlist of origins.")
        if any(not origin.startswith(("http://", "https://")) for origin in origins):
            raise ValueError("CORS origins must be absolute HTTP or HTTPS origins.")
        return ",".join(origins)

    @property
    def readiness_weights(self) -> dict[str, float]:
        return {
            "technical": self.readiness_technical_weight,
            "projects": self.readiness_projects_weight,
            "experience": self.readiness_experience_weight,
            "problem_solving": self.readiness_problem_solving_weight,
            "communication": self.readiness_communication_weight,
            "interview": self.readiness_interview_weight,
        }

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
