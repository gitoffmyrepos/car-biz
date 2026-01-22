#!/bin/bash
# Initialize Vault for FX Weekly Lease development environment
# This script configures KV v2 secrets engine, Transit engine, and creates test secrets

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token}"

echo "Initializing Vault at $VAULT_ADDR..."

# Wait for Vault to be ready
echo "Waiting for Vault to be ready..."
until curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; do
    sleep 1
done
echo "Vault is ready!"

# Export for vault CLI
export VAULT_ADDR
export VAULT_TOKEN

# Enable KV v2 secrets engine at 'secret/' (already enabled in dev mode)
echo "Checking KV v2 secrets engine..."
if ! vault secrets list | grep -q "^secret/"; then
    echo "Enabling KV v2 secrets engine..."
    vault secrets enable -path=secret kv-v2
else
    echo "KV v2 secrets engine already enabled at secret/"
fi

# Enable Transit secrets engine for encryption
echo "Checking Transit secrets engine..."
if ! vault secrets list | grep -q "^transit/"; then
    echo "Enabling Transit secrets engine..."
    vault secrets enable transit
else
    echo "Transit secrets engine already enabled"
fi

# Create Transit encryption key for the application
echo "Creating Transit encryption key..."
vault write -f transit/keys/fx-weekly-lease-dev-transit || echo "Key may already exist"

# Create test secrets in KV v2
echo "Creating test secrets..."

# Application secrets
vault kv put secret/fx-weekly-lease/dev/app \
    app_name="FX Weekly Lease" \
    app_version="1.0.0" \
    environment="development"

# Database credentials (example - in production, these would be real secrets)
vault kv put secret/fx-weekly-lease/dev/database \
    host="postgres" \
    port="5432" \
    username="postgres" \
    password="postgres" \
    database="weekly_lease"

# API keys (example - in production, these would be real API keys)
vault kv put secret/fx-weekly-lease/dev/api-keys \
    resend_api_key="re_test_123456789" \
    stripe_secret_key="sk_test_123456789"

# S3/MinIO credentials
vault kv put secret/fx-weekly-lease/dev/s3 \
    endpoint="http://minio:9000" \
    access_key="minioadmin" \
    secret_key="minioadmin"

echo "Vault initialization complete!"
echo ""
echo "Available secrets:"
vault kv list secret/fx-weekly-lease/dev/ || echo "No secrets listed"
echo ""
echo "Transit key info:"
vault read transit/keys/fx-weekly-lease-dev-transit || echo "Could not read transit key"
echo ""
echo "Test reading a secret:"
vault kv get secret/fx-weekly-lease/dev/app
