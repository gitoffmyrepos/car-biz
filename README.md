# Weekly Vehicle Leasing Platform

**Salvage-to-Lux Fleet Management System**

A production-grade web application for managing a weekly vehicle leasing business. Built with Next.js (App Router) + FastAPI, designed for deployment on a Kubernetes homelab infrastructure.

## Overview

This platform supports a business model that:
- Purchases body-damaged vehicles from auctions (Copart/IAAI)
- Repairs and refurbishes vehicles
- Leases vehicles to customers on a weekly payment plan ($150/week example)
- Handles manual payment verification (Zelle/CashApp)
- Manages delinquency and recovery workflows

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**

### Backend
- **FastAPI** (Python, async)
- **SQLAlchemy** (async) + Alembic
- **PostgreSQL** (primary database)
- **Redis** (caching, rate limiting, queues)

### Infrastructure
- **Docker** + Docker Compose (local development)
- **Kubernetes** (production deployment)
- **MinIO** (object storage for uploads)
- **Vault** (secrets management + encryption)
- **Keycloak** (OIDC authentication)
- **Nexus** (container registry)

## Project Structure

```
.
├── frontend/               # Next.js frontend application
│   ├── app/               # App Router pages and layouts
│   ├── components/        # React components
│   ├── lib/               # Utilities and helpers
│   └── styles/            # Global styles
├── backend/               # FastAPI backend application
│   └── app/
│       ├── api/           # API route handlers
│       ├── core/          # Core configuration and security
│       ├── models/        # SQLAlchemy models
│       ├── schemas/       # Pydantic validation schemas
│       ├── services/      # Business logic services
│       ├── workers/       # Background job workers
│       └── tests/         # Test suites
├── docker/                # Docker configuration files
├── k8s/                   # Kubernetes manifests
│   └── manifests/         # Deployment, Service, Ingress configs
├── scripts/               # Utility scripts (vault-secrets-manager.sh, etc.)
├── spec/                  # Project specifications
│   ├── app_spec.txt       # Full application specification
│   └── feature_list.json  # Feature tracking for autonomous development
├── docker-compose.yml     # Local development orchestration
├── init.sh                # Development environment setup script
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (optional, for local frontend dev)
- Python 3.11+ (optional, for local backend dev)
- Access to homelab services (Keycloak, MinIO, Vault)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd car-biz
   ```

2. **Run the setup script:**
   ```bash
   ./init.sh
   ```

3. **Configure environment:**
   ```bash
   # Edit .env with your actual configuration
   nano .env
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Setup

```bash
# Start infrastructure services
docker-compose up -d postgres redis

# Start application services (once Dockerfiles exist)
docker-compose up -d
```

## Environment Variables

### Backend Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Environment (dev/staging/prod) | `dev` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `OIDC_ISSUER_URL` | Keycloak realm URL | `http://keycloak.../realms/...` |
| `OIDC_CLIENT_ID` | OIDC client identifier | `fx-weekly-lease-app` |
| `S3_ENDPOINT` | MinIO endpoint | `minio.strategybase.io` |
| `VAULT_ADDR` | Vault server address | `http://vault...:8200` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |

### Frontend Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |

See `.env.example` for the complete list of configuration options.

## Core Features

### Customer Experience
- Marketing/SEO website (Home, How It Works, Fleet, FAQ, Contact)
- OIDC authentication via Keycloak
- Secure insurance document upload
- Vehicle request and status tracking
- Payment proof upload with 48-hour verification
- In-app notifications

### Admin Experience
- Dashboard with key metrics
- Customer management and verification
- Vehicle and tracker inventory management
- Weekly invoice generation and payment verification
- Delinquency queue with escalation workflow
- Recovery/tow process with compliance gate
- Comprehensive audit logging

### Security Features
- RBAC enforcement (admin/ops/customer roles)
- Admin MFA via Keycloak
- Vault Transit encryption for sensitive metadata
- MinIO private buckets with signed URLs
- Rate limiting on sensitive endpoints
- Audit logging for all sensitive actions
- OWASP best practices

## Homelab Integration

This application is designed to integrate with existing homelab infrastructure:

- **Keycloak**: Existing OIDC provider for authentication
- **MinIO**: Object storage for file uploads
- **Vault**: Secrets management and Transit encryption
- **Nexus**: Container image registry

Configuration follows patterns discovered in `/home/kelvin/SB-HomeLAb/FX`:
- Environment variable naming conventions
- Vault KV path structure: `secret/fx-weekly-lease/<env>/*`
- Docker image tagging: `{VERSION}-{COMMIT}`, `latest-{ENV}`
- Jenkins pipeline stage conventions

## Development Workflow

### Feature Tracking

Features are tracked in `spec/feature_list.json`. Each feature has:
- `category`: "functional" or "style"
- `description`: Detailed feature description
- `steps`: Testing steps with UI interactions
- `passes`: Boolean status (false until verified)

### Commit Conventions

```
feat: Implement feature #{ID} - {description}

- Bullet points of changes
- E2E test passed

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Running Tests

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# E2E tests (with Puppeteer)
# Documented in feature testing steps
```

## Deployment

### Local Development
```bash
docker-compose up -d
```

### Production (Kubernetes)
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/manifests/

# Images are pulled from Nexus registry
```

## Contributing

This project uses autonomous AI-assisted development. See `spec/app_spec.txt` for the full specification and `spec/feature_list.json` for feature tracking.

## License

Proprietary - All rights reserved.
