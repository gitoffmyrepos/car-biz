#!/bin/bash
# =============================================================================
# FX Weekly Lease - Vault Secrets Manager
# =============================================================================
# CLI script for managing Vault secrets following FX homelab patterns
#
# Usage:
#   ./vault-secrets-manager.sh init              - Initialize Vault structure
#   ./vault-secrets-manager.sh put KEY VALUE     - Store a secret
#   ./vault-secrets-manager.sh get KEY           - Retrieve a secret
#   ./vault-secrets-manager.sh list              - List all secrets
#   ./vault-secrets-manager.sh validate          - Validate required secrets exist
#   ./vault-secrets-manager.sh delete KEY        - Delete a secret
#
# Environment Variables:
#   VAULT_ADDR   - Vault server address (default: http://localhost:8200)
#   VAULT_TOKEN  - Vault authentication token (default: dev-root-token)
#   ENVIRONMENT  - Environment name: dev, staging, prod (default: dev)
# =============================================================================

set -e

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
SECRET_PATH="fx-weekly-lease/${ENVIRONMENT}"
TRANSIT_KEY="fx-weekly-lease-${ENVIRONMENT}-transit"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Required secrets for validation
REQUIRED_SECRETS=(
    "database/host"
    "database/port"
    "database/username"
    "database/password"
    "database/database"
    "api-keys/resend_api_key"
)

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_vault_connection() {
    log_info "Checking Vault connection at $VAULT_ADDR..."

    if ! curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
        log_error "Cannot connect to Vault at $VAULT_ADDR"
        log_info "Make sure Vault is running and VAULT_ADDR is correct"
        exit 1
    fi

    log_success "Connected to Vault"
}

check_vault_auth() {
    export VAULT_ADDR
    export VAULT_TOKEN

    if ! vault token lookup > /dev/null 2>&1; then
        log_error "Invalid Vault token. Check VAULT_TOKEN environment variable."
        exit 1
    fi

    log_success "Vault authentication valid"
}

# =============================================================================
# Command: init
# =============================================================================

cmd_init() {
    log_info "Initializing Vault for FX Weekly Lease ($ENVIRONMENT environment)..."

    check_vault_connection
    check_vault_auth

    # Enable KV v2 secrets engine
    log_info "Ensuring KV v2 secrets engine is enabled..."
    if ! vault secrets list 2>/dev/null | grep -q "^secret/"; then
        vault secrets enable -path=secret kv-v2 2>/dev/null || true
        log_success "KV v2 secrets engine enabled at secret/"
    else
        log_info "KV v2 secrets engine already enabled"
    fi

    # Enable Transit secrets engine
    log_info "Ensuring Transit secrets engine is enabled..."
    if ! vault secrets list 2>/dev/null | grep -q "^transit/"; then
        vault secrets enable transit 2>/dev/null || true
        log_success "Transit secrets engine enabled"
    else
        log_info "Transit secrets engine already enabled"
    fi

    # Create Transit encryption key
    log_info "Creating Transit encryption key: $TRANSIT_KEY..."
    vault write -f "transit/keys/$TRANSIT_KEY" 2>/dev/null || true
    log_success "Transit key created/verified"

    # Create default secret structure
    log_info "Creating default secret structure..."

    # Application metadata
    vault kv put "secret/${SECRET_PATH}/app" \
        app_name="FX Weekly Lease" \
        app_version="1.0.0" \
        environment="$ENVIRONMENT" 2>/dev/null || true

    # Database defaults (placeholder for dev)
    if [ "$ENVIRONMENT" = "dev" ]; then
        vault kv put "secret/${SECRET_PATH}/database" \
            host="postgres" \
            port="5432" \
            username="postgres" \
            password="postgres" \
            database="weekly_lease" 2>/dev/null || true

        vault kv put "secret/${SECRET_PATH}/api-keys" \
            resend_api_key="re_test_placeholder" 2>/dev/null || true

        vault kv put "secret/${SECRET_PATH}/s3" \
            endpoint="http://minio:9000" \
            access_key="minioadmin" \
            secret_key="minioadmin" 2>/dev/null || true
    fi

    echo ""
    log_success "Vault initialization complete for $ENVIRONMENT environment!"
    echo ""
    log_info "Secret path: secret/${SECRET_PATH}/"
    log_info "Transit key: $TRANSIT_KEY"
    echo ""
    log_info "Run './vault-secrets-manager.sh list' to see all secrets"
    log_info "Run './vault-secrets-manager.sh validate' to check required secrets"
}

# =============================================================================
# Command: put
# =============================================================================

cmd_put() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        log_error "Usage: $0 put KEY VALUE"
        log_info "Example: $0 put database/password mysecretpass"
        exit 1
    fi

    local key="$1"
    local value="$2"

    check_vault_connection
    check_vault_auth

    log_info "Storing secret: $key"

    # Handle nested keys (e.g., database/password)
    if [[ "$key" == *"/"* ]]; then
        local path=$(dirname "$key")
        local field=$(basename "$key")

        # Get existing values to preserve them
        local existing
        existing=$(vault kv get -format=json "secret/${SECRET_PATH}/$path" 2>/dev/null | jq -r '.data.data // {}') || existing="{}"

        # Merge with new value
        echo "$existing" | jq --arg k "$field" --arg v "$value" '. + {($k): $v}' | \
            vault kv put "secret/${SECRET_PATH}/$path" -
    else
        vault kv put "secret/${SECRET_PATH}/$key" value="$value"
    fi

    log_success "Secret stored: $key"
}

# =============================================================================
# Command: get
# =============================================================================

cmd_get() {
    if [ -z "$1" ]; then
        log_error "Usage: $0 get KEY"
        log_info "Example: $0 get database/password"
        exit 1
    fi

    local key="$1"

    check_vault_connection
    check_vault_auth

    # Handle nested keys
    if [[ "$key" == *"/"* ]]; then
        local path=$(dirname "$key")
        local field=$(basename "$key")
        vault kv get -field="$field" "secret/${SECRET_PATH}/$path" 2>/dev/null || {
            log_error "Secret not found: $key"
            exit 1
        }
    else
        vault kv get "secret/${SECRET_PATH}/$key" 2>/dev/null || {
            log_error "Secret not found: $key"
            exit 1
        }
    fi
}

# =============================================================================
# Command: list
# =============================================================================

cmd_list() {
    check_vault_connection
    check_vault_auth

    log_info "Listing secrets in secret/${SECRET_PATH}/..."
    echo ""

    local paths
    paths=$(vault kv list -format=json "secret/${SECRET_PATH}" 2>/dev/null | jq -r '.[]') || {
        log_warning "No secrets found at secret/${SECRET_PATH}/"
        return
    }

    for path in $paths; do
        echo -e "${BLUE}secret/${SECRET_PATH}/${path}${NC}"

        # List keys within each path
        local keys
        keys=$(vault kv get -format=json "secret/${SECRET_PATH}/${path%/}" 2>/dev/null | jq -r '.data.data | keys[]') || continue

        for key in $keys; do
            echo "  - $key"
        done
        echo ""
    done

    log_info "Transit key: $TRANSIT_KEY"
}

# =============================================================================
# Command: validate
# =============================================================================

cmd_validate() {
    check_vault_connection
    check_vault_auth

    log_info "Validating required secrets for $ENVIRONMENT environment..."
    echo ""

    local missing=0
    local found=0

    for secret in "${REQUIRED_SECRETS[@]}"; do
        local path=$(dirname "$secret")
        local field=$(basename "$secret")

        if vault kv get -field="$field" "secret/${SECRET_PATH}/$path" > /dev/null 2>&1; then
            echo -e "  ${GREEN}[OK]${NC} $secret"
            ((found++))
        else
            echo -e "  ${RED}[MISSING]${NC} $secret"
            ((missing++))
        fi
    done

    echo ""

    # Validate Transit key exists
    if vault read "transit/keys/$TRANSIT_KEY" > /dev/null 2>&1; then
        echo -e "  ${GREEN}[OK]${NC} Transit key: $TRANSIT_KEY"
        ((found++))
    else
        echo -e "  ${RED}[MISSING]${NC} Transit key: $TRANSIT_KEY"
        ((missing++))
    fi

    echo ""
    log_info "Found: $found, Missing: $missing"

    if [ $missing -gt 0 ]; then
        log_error "Validation failed! Some required secrets are missing."
        log_info "Run './vault-secrets-manager.sh init' to create default structure"
        exit 1
    fi

    log_success "All required secrets are present!"
    return 0
}

# =============================================================================
# Command: delete
# =============================================================================

cmd_delete() {
    if [ -z "$1" ]; then
        log_error "Usage: $0 delete KEY"
        log_info "Example: $0 delete api-keys"
        exit 1
    fi

    local key="$1"

    check_vault_connection
    check_vault_auth

    log_warning "Deleting secret: $key"

    vault kv delete "secret/${SECRET_PATH}/$key" 2>/dev/null || {
        log_error "Failed to delete secret: $key"
        exit 1
    }

    log_success "Secret deleted: $key"
}

# =============================================================================
# Command: encrypt
# =============================================================================

cmd_encrypt() {
    if [ -z "$1" ]; then
        log_error "Usage: $0 encrypt PLAINTEXT"
        exit 1
    fi

    local plaintext="$1"

    check_vault_connection
    check_vault_auth

    local encoded
    encoded=$(echo -n "$plaintext" | base64)

    vault write -field=ciphertext "transit/encrypt/$TRANSIT_KEY" plaintext="$encoded"
}

# =============================================================================
# Command: decrypt
# =============================================================================

cmd_decrypt() {
    if [ -z "$1" ]; then
        log_error "Usage: $0 decrypt CIPHERTEXT"
        exit 1
    fi

    local ciphertext="$1"

    check_vault_connection
    check_vault_auth

    local encoded
    encoded=$(vault write -field=plaintext "transit/decrypt/$TRANSIT_KEY" ciphertext="$ciphertext")

    echo "$encoded" | base64 -d
}

# =============================================================================
# Command: help
# =============================================================================

cmd_help() {
    cat << EOF
FX Weekly Lease - Vault Secrets Manager

Usage: $0 COMMAND [ARGS]

Commands:
  init              Initialize Vault structure for the environment
  put KEY VALUE     Store a secret (e.g., put database/password secret123)
  get KEY           Retrieve a secret (e.g., get database/password)
  list              List all secrets in the environment
  validate          Validate all required secrets exist
  delete KEY        Delete a secret
  encrypt TEXT      Encrypt text using Transit engine
  decrypt CIPHER    Decrypt ciphertext using Transit engine
  help              Show this help message

Environment Variables:
  VAULT_ADDR        Vault server address (default: http://localhost:8200)
  VAULT_TOKEN       Vault authentication token (default: dev-root-token)
  ENVIRONMENT       Environment: dev, staging, prod (default: dev)

Examples:
  # Initialize for development
  ./vault-secrets-manager.sh init

  # Store a secret
  ./vault-secrets-manager.sh put database/password mypassword

  # Get a secret
  ./vault-secrets-manager.sh get database/password

  # Validate production secrets
  ENVIRONMENT=prod ./vault-secrets-manager.sh validate

  # Encrypt sensitive data
  ./vault-secrets-manager.sh encrypt "sensitive-data"

EOF
}

# =============================================================================
# Main
# =============================================================================

main() {
    local command="${1:-help}"
    shift || true

    case "$command" in
        init)
            cmd_init "$@"
            ;;
        put)
            cmd_put "$@"
            ;;
        get)
            cmd_get "$@"
            ;;
        list)
            cmd_list "$@"
            ;;
        validate)
            cmd_validate "$@"
            ;;
        delete)
            cmd_delete "$@"
            ;;
        encrypt)
            cmd_encrypt "$@"
            ;;
        decrypt)
            cmd_decrypt "$@"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            log_error "Unknown command: $command"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
