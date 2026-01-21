#!/bin/bash
#
# Weekly Vehicle Leasing Platform - Development Environment Setup
# Salvage-to-Lux Fleet Management (Next.js + FastAPI)
#
# This script initializes the development environment for local development.
# It installs dependencies and starts all required services via Docker Compose.
#
# Usage: ./init.sh [options]
#   --clean     Clean rebuild (removes volumes)
#   --build     Force rebuild of images
#   --no-start  Only install dependencies, don't start services
#   --help      Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default options
CLEAN_BUILD=false
FORCE_BUILD=false
NO_START=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --no-start)
            NO_START=true
            shift
            ;;
        --help)
            echo "Usage: ./init.sh [options]"
            echo "  --clean     Clean rebuild (removes volumes)"
            echo "  --build     Force rebuild of images"
            echo "  --no-start  Only install dependencies, don't start services"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Weekly Vehicle Leasing Platform${NC}"
echo -e "${BLUE}Development Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Check Node.js (optional, for local frontend development)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed ($NODE_VERSION)${NC}"
else
    echo -e "${YELLOW}⚠ Node.js not found (optional for local frontend dev)${NC}"
fi

# Check Python (optional, for local backend development)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python installed ($PYTHON_VERSION)${NC}"
else
    echo -e "${YELLOW}⚠ Python not found (optional for local backend dev)${NC}"
fi

echo ""

# Create necessary directories
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p frontend
mkdir -p backend/app/{api,core,models,schemas,services,workers,tests}
mkdir -p docker
mkdir -p k8s/manifests
mkdir -p scripts
mkdir -p .claude/verification

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created from .env.example${NC}"
    else
        cat > .env << 'EOF'
# Weekly Vehicle Leasing Platform - Environment Configuration
# Copy this file to .env and customize for your environment

# Application
APP_ENV=dev
DEBUG=true
LOG_LEVEL=INFO

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

# Backend
API_BASE_URL=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Database (local Docker)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/weekly_lease

# Redis (local Docker)
REDIS_URL=redis://localhost:6379

# Keycloak OIDC (existing homelab instance)
OIDC_ISSUER_URL=http://keycloak.strategybase.io:8080/realms/fx-weekly-lease
OIDC_CLIENT_ID=fx-weekly-lease-app
OIDC_AUDIENCE=fx-weekly-lease-app

# MinIO/S3 (existing homelab instance)
S3_ENDPOINT=minio.strategybase.io
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_USE_SSL=true
S3_BUCKET_PAYMENTS=fx-weekly-lease-payments
S3_BUCKET_INSURANCE=fx-weekly-lease-insurance
S3_BUCKET_INCIDENTS=fx-weekly-lease-incidents
S3_SIGNED_URL_TTL_SECONDS=300

# Vault (existing homelab instance)
VAULT_ADDR=http://vault.strategybase.io:8200
VAULT_AUTH_METHOD=token
VAULT_TRANSIT_KEY_NAME=fx-weekly-lease-dev-transit
VAULT_KV_PATH_PREFIX=secret/fx-weekly-lease/dev

# Resend Email
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Nexus Registry
NEXUS_REGISTRY_HOST=nexus.strategybase.io:8082
NEXUS_REPOSITORY_PREFIX=sb-custom-docker-images

# Integration Mode
USE_EXISTING_HOMELAB_MINIO=true
USE_EXISTING_HOMELAB_VAULT=true
USE_EXISTING_HOMELAB_KEYCLOAK=true

# FX Reference Path
FX_REFERENCE_ROOT=/home/kelvin/SB-HomeLAb/FX
EOF
        echo -e "${GREEN}✓ .env file created with defaults${NC}"
    fi
    echo -e "${YELLOW}⚠ Please update .env with your actual configuration values${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    echo -e "${YELLOW}Cleaning previous build...${NC}"
    docker-compose down -v --remove-orphans 2>/dev/null || true
    echo -e "${GREEN}✓ Previous containers and volumes removed${NC}"
    echo ""
fi

# Build arguments
BUILD_ARGS=""
if [ "$FORCE_BUILD" = true ]; then
    BUILD_ARGS="--build"
fi

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
    echo -e "${YELLOW}Creating docker-compose.yml...${NC}"
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: fx-weekly-lease-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: weekly_lease
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - fx-weekly-lease-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: fx-weekly-lease-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - fx-weekly-lease-network

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fx-weekly-lease-backend
    environment:
      - APP_ENV=dev
      - DEBUG=true
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/weekly_lease
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - fx-weekly-lease-network

  # Next.js Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fx-weekly-lease-frontend
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
    env_file:
      - .env
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    networks:
      - fx-weekly-lease-network

volumes:
  postgres_data:
  redis_data:

networks:
  fx-weekly-lease-network:
    driver: bridge
EOF
    echo -e "${GREEN}✓ docker-compose.yml created${NC}"
fi

echo ""

if [ "$NO_START" = true ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Setup complete (services not started)${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "To start the services, run:"
    echo -e "  ${BLUE}docker-compose up -d${NC}"
    exit 0
fi

# Start services
echo -e "${YELLOW}Starting development services...${NC}"
echo ""

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Start only postgres and redis first (they don't need app code)
echo -e "${YELLOW}Starting database services...${NC}"
$COMPOSE_CMD up -d postgres redis

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for database services to be healthy...${NC}"
sleep 5

# Check if backend/frontend Dockerfiles exist before starting them
if [ -f backend/Dockerfile ] && [ -f frontend/Dockerfile ]; then
    echo -e "${YELLOW}Starting application services...${NC}"
    $COMPOSE_CMD up -d $BUILD_ARGS
else
    echo -e "${YELLOW}⚠ Backend/Frontend Dockerfiles not yet created${NC}"
    echo -e "${YELLOW}  Only postgres and redis are running${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Development Environment Ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Services running:"
echo -e "  ${BLUE}PostgreSQL:${NC}  localhost:5432 (user: postgres, db: weekly_lease)"
echo -e "  ${BLUE}Redis:${NC}       localhost:6379"
if [ -f backend/Dockerfile ]; then
    echo -e "  ${BLUE}Backend API:${NC} http://localhost:8000"
    echo -e "  ${BLUE}API Docs:${NC}    http://localhost:8000/docs"
fi
if [ -f frontend/Dockerfile ]; then
    echo -e "  ${BLUE}Frontend:${NC}    http://localhost:3000"
fi
echo ""
echo -e "${YELLOW}External Services (configure in .env):${NC}"
echo -e "  ${BLUE}Keycloak:${NC}    Configure OIDC_ISSUER_URL in .env"
echo -e "  ${BLUE}MinIO:${NC}       Configure S3_ENDPOINT in .env"
echo -e "  ${BLUE}Vault:${NC}       Configure VAULT_ADDR in .env"
echo ""
echo -e "Useful commands:"
echo -e "  ${BLUE}$COMPOSE_CMD logs -f${NC}           - View logs"
echo -e "  ${BLUE}$COMPOSE_CMD down${NC}              - Stop services"
echo -e "  ${BLUE}$COMPOSE_CMD ps${NC}                - Check service status"
echo -e "  ${BLUE}$COMPOSE_CMD exec postgres psql -U postgres weekly_lease${NC} - Connect to DB"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
