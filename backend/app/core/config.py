"""
GigWheels - Configuration
Weekly car rentals for gig drivers

Application settings loaded from environment variables.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Application
    APP_NAME: str = "GigWheels"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "dev"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # API
    API_BASE_URL: str = "http://localhost:8000"
    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:8000",
        "http://localhost:8100",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/gigwheels"

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
    S3_BUCKET_PAYMENTS: str = "gigwheels-payments"
    S3_BUCKET_INSURANCE: str = "gigwheels-insurance"
    S3_BUCKET_INCIDENTS: str = "gigwheels-incidents"
    S3_BUCKET_CONDITION_REPORTS: str = "gigwheels-condition-reports"
    S3_BUCKET_VEHICLES: str = "gigwheels-vehicles"
    # Public-read bucket for marketing vehicle gallery photos (not KYC/private docs)
    S3_BUCKET_VEHICLE_IMAGES: str = "gigwheels-vehicle-images"
    # Optional public base URL for the vehicle-images bucket (e.g. CDN / MinIO public host).
    # When set, public gallery URLs are built as f"{S3_PUBLIC_BASE_URL}/{bucket}/{key}".
    # When empty, the storage service falls back to presigned GETs or the local file route.
    S3_PUBLIC_BASE_URL: str = ""
    S3_SIGNED_URL_TTL_SECONDS: int = 300

    # Vault
    VAULT_ADDR: str = ""
    VAULT_AUTH_METHOD: str = "token"
    VAULT_TOKEN: str = ""
    VAULT_TRANSIT_KEY_NAME: str = "gigwheels-dev-transit"
    VAULT_KV_PATH_PREFIX: str = "secret/gigwheels/dev"

    # Email backend selection
    # "auto" -> use SMTP when SMTP_HOST is set, else Resend, else log-and-skip
    # "smtp" -> force SMTP backend
    # "resend" -> force Resend backend
    EMAIL_BACKEND: str = "auto"

    # SMTP Email (e.g. Proton SMTP submission / Proton Mail Bridge)
    # Proton defaults: host smtp.protonmail.ch, port 587, STARTTLS,
    # auth = SMTP username + Proton Business SMTP token (or Bridge password).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True  # STARTTLS on the submission port

    # Resend Email (legacy / back-compat)
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
