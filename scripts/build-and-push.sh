#!/bin/bash
# =============================================================================
# FX Weekly Lease - Docker Build and Push Script
# =============================================================================
# Follows FX homelab patterns for Nexus registry integration
#
# Usage:
#   ./scripts/build-and-push.sh [options]
#
# Options:
#   --frontend-only    Build only frontend image
#   --backend-only     Build only backend image
#   --no-push          Build images without pushing to registry
#   --env ENV          Set environment (dev|staging|prod), default: dev
#   --version VERSION  Set version tag, default: 1.0.0
#   --help             Show this help message
#
# Environment Variables:
#   NEXUS_REGISTRY     Nexus registry URL (default: nexus.strategybase.io:8082)
#   NEXUS_USERNAME     Nexus username
#   NEXUS_PASSWORD     Nexus password
# =============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Configuration - Following FX Patterns
# =============================================================================

# Registry Configuration
NEXUS_REGISTRY="${NEXUS_REGISTRY:-nexus.strategybase.io:8082}"
NEXUS_GROUP_REGISTRY="${NEXUS_GROUP_REGISTRY:-nexus.strategybase.io:18088}"
DOCKER_REPO="sb-custom-docker-images"

# Application names
APP_NAME="fx-weekly-lease"
BACKEND_IMAGE_NAME="${APP_NAME}-backend"
FRONTEND_IMAGE_NAME="${APP_NAME}-frontend"

# Version management
MAJOR_VERSION="1"
MINOR_VERSION="0"
PATCH_VERSION="${BUILD_NUMBER:-0}"
VERSION="${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}"

# Get git commit short hash
GIT_COMMIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Default options
BUILD_FRONTEND=true
BUILD_BACKEND=true
PUSH_IMAGES=true
ENVIRONMENT="dev"

# =============================================================================
# Parse command line arguments
# =============================================================================

show_help() {
    head -25 "$0" | tail -20
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend-only)
            BUILD_FRONTEND=true
            BUILD_BACKEND=false
            shift
            ;;
        --backend-only)
            BUILD_FRONTEND=false
            BUILD_BACKEND=true
            shift
            ;;
        --no-push)
            PUSH_IMAGES=false
            shift
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --help)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# =============================================================================
# Validate environment
# =============================================================================

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# =============================================================================
# Build tags following FX pattern
# =============================================================================

# Full image paths
BACKEND_IMAGE="${NEXUS_REGISTRY}/${DOCKER_REPO}/${BACKEND_IMAGE_NAME}"
FRONTEND_IMAGE="${NEXUS_REGISTRY}/${DOCKER_REPO}/${FRONTEND_IMAGE_NAME}"

# Tags: VERSION-COMMIT and latest-ENV
TAG_VERSION="${VERSION}-${GIT_COMMIT_SHORT}"
TAG_LATEST="latest-${ENVIRONMENT}"

log_info "=== FX Weekly Lease Build Configuration ==="
log_info "Environment: ${ENVIRONMENT}"
log_info "Version: ${VERSION}"
log_info "Git Commit: ${GIT_COMMIT_SHORT}"
log_info "Tag (version): ${TAG_VERSION}"
log_info "Tag (latest): ${TAG_LATEST}"
log_info "Registry: ${NEXUS_REGISTRY}"
log_info "Build Frontend: ${BUILD_FRONTEND}"
log_info "Build Backend: ${BUILD_BACKEND}"
log_info "Push to Registry: ${PUSH_IMAGES}"
echo ""

# =============================================================================
# Build Backend Image
# =============================================================================

if [ "$BUILD_BACKEND" = true ]; then
    log_info "Building backend image..."

    docker build \
        --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --build-arg VERSION="${VERSION}" \
        --build-arg GIT_COMMIT="${GIT_COMMIT_SHORT}" \
        --label "org.opencontainers.image.created=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --label "org.opencontainers.image.version=${VERSION}" \
        --label "org.opencontainers.image.revision=${GIT_COMMIT_SHORT}" \
        --label "org.opencontainers.image.title=${BACKEND_IMAGE_NAME}" \
        --label "org.opencontainers.image.description=FX Weekly Lease Backend API" \
        -t "${BACKEND_IMAGE}:${TAG_VERSION}" \
        -t "${BACKEND_IMAGE}:${TAG_LATEST}" \
        -f backend/Dockerfile \
        backend/

    log_success "Backend image built: ${BACKEND_IMAGE}:${TAG_VERSION}"
fi

# =============================================================================
# Build Frontend Image
# =============================================================================

if [ "$BUILD_FRONTEND" = true ]; then
    log_info "Building frontend image..."

    docker build \
        --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --build-arg VERSION="${VERSION}" \
        --build-arg GIT_COMMIT="${GIT_COMMIT_SHORT}" \
        --build-arg NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-}" \
        --label "org.opencontainers.image.created=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --label "org.opencontainers.image.version=${VERSION}" \
        --label "org.opencontainers.image.revision=${GIT_COMMIT_SHORT}" \
        --label "org.opencontainers.image.title=${FRONTEND_IMAGE_NAME}" \
        --label "org.opencontainers.image.description=FX Weekly Lease Frontend" \
        -t "${FRONTEND_IMAGE}:${TAG_VERSION}" \
        -t "${FRONTEND_IMAGE}:${TAG_LATEST}" \
        -f frontend/Dockerfile \
        frontend/

    log_success "Frontend image built: ${FRONTEND_IMAGE}:${TAG_VERSION}"
fi

# =============================================================================
# Push Images to Nexus Registry
# =============================================================================

if [ "$PUSH_IMAGES" = true ]; then
    log_info "Logging in to Nexus registry..."

    if [ -n "$NEXUS_USERNAME" ] && [ -n "$NEXUS_PASSWORD" ]; then
        echo "$NEXUS_PASSWORD" | docker login -u "$NEXUS_USERNAME" --password-stdin "${NEXUS_REGISTRY}"
    else
        log_warning "NEXUS_USERNAME or NEXUS_PASSWORD not set. Assuming already logged in."
    fi

    if [ "$BUILD_BACKEND" = true ]; then
        log_info "Pushing backend images..."
        docker push "${BACKEND_IMAGE}:${TAG_VERSION}"
        docker push "${BACKEND_IMAGE}:${TAG_LATEST}"
        log_success "Backend images pushed to Nexus"
    fi

    if [ "$BUILD_FRONTEND" = true ]; then
        log_info "Pushing frontend images..."
        docker push "${FRONTEND_IMAGE}:${TAG_VERSION}"
        docker push "${FRONTEND_IMAGE}:${TAG_LATEST}"
        log_success "Frontend images pushed to Nexus"
    fi
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
log_success "=== Build Complete ==="
if [ "$BUILD_BACKEND" = true ]; then
    log_info "Backend:  ${BACKEND_IMAGE}:${TAG_VERSION}"
fi
if [ "$BUILD_FRONTEND" = true ]; then
    log_info "Frontend: ${FRONTEND_IMAGE}:${TAG_VERSION}"
fi
if [ "$PUSH_IMAGES" = true ]; then
    log_info "Images pushed to: ${NEXUS_REGISTRY}"
fi

# Output image info as JSON (useful for CI/CD)
cat << EOF
{
  "backend": {
    "image": "${BACKEND_IMAGE}",
    "tag_version": "${TAG_VERSION}",
    "tag_latest": "${TAG_LATEST}"
  },
  "frontend": {
    "image": "${FRONTEND_IMAGE}",
    "tag_version": "${TAG_VERSION}",
    "tag_latest": "${TAG_LATEST}"
  },
  "registry": "${NEXUS_REGISTRY}",
  "environment": "${ENVIRONMENT}",
  "git_commit": "${GIT_COMMIT_SHORT}"
}
EOF
