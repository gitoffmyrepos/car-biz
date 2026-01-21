"""
Weekly Vehicle Leasing Platform - Configuration
Salvage-to-Lux Fleet Management

Application settings loaded from environment variables.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Application
    APP_NAME: str = "FX Weekly Lease"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "dev"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # API
    API_BASE_URL: str = "http://localhost:8000"
    CORS_ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/weekly_lease"

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # OIDC (Keycloak)
    OIDC_ISSUER_URL: str = ""
    OIDC_CLIENT_ID: str = ""
    OIDC_AUDIENCE: str = ""
    OIDC_JWKS_URL: str = ""

    # MinIO/S3
    S3_ENDPOINT: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_USE_SSL: bool = True
    S3_BUCKET_PAYMENTS: str = "fx-weekly-lease-payments"
    S3_BUCKET_INSURANCE: str = "fx-weekly-lease-insurance"
    S3_BUCKET_INCIDENTS: str = "fx-weekly-lease-incidents"
    S3_BUCKET_CONDITION_REPORTS: str = "fx-weekly-lease-condition-reports"
    S3_SIGNED_URL_TTL_SECONDS: int = 300

    # Vault
    VAULT_ADDR: str = ""
    VAULT_AUTH_METHOD: str = "token"
    VAULT_TOKEN: str = ""
    VAULT_TRANSIT_KEY_NAME: str = "fx-weekly-lease-dev-transit"
    VAULT_KV_PATH_PREFIX: str = "secret/fx-weekly-lease/dev"

    # Resend Email
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@example.com"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
