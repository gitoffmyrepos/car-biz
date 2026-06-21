"""
GigWheels - Vault Service
Weekly car rentals for gig drivers

HashiCorp Vault integration for secrets management and Transit encryption.
"""

import base64
import logging
from typing import Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)


class VaultService:
    """
    Vault service for secrets management and Transit encryption.

    Uses HashiCorp Vault for:
    - Transit encryption/decryption of sensitive metadata
    - KV secrets storage (for production secrets)

    Falls back to local encryption for development when Vault is not configured.
    """

    def __init__(self):
        self.enabled = bool(settings.VAULT_ADDR and settings.VAULT_TOKEN)
        self._client = None
        self._transit_key = settings.VAULT_TRANSIT_KEY_NAME

        if self.enabled:
            self._init_client()
        else:
            logger.warning(
                "Vault not configured - using local fallback encryption. "
                "Set VAULT_ADDR and VAULT_TOKEN for production use."
            )

    def _init_client(self):
        """Initialize Vault client."""
        try:
            import hvac

            self._client = hvac.Client(
                url=settings.VAULT_ADDR,
                token=settings.VAULT_TOKEN,
            )

            # Verify connection and token
            if self._client.is_authenticated():
                logger.info(f"Vault client initialized successfully at {settings.VAULT_ADDR}")
            else:
                logger.error("Vault token is invalid or expired")
                self.enabled = False
                self._client = None
        except Exception as e:
            logger.error(f"Failed to initialize Vault client: {e}")
            self.enabled = False
            self._client = None

    def renew_token(self) -> Tuple[bool, str]:
        """
        Renew the Vault token to extend its TTL.

        Returns:
            Tuple of (success, message or error)
        """
        if not self.enabled or not self._client:
            return False, "Vault client not available"

        try:
            # Renew the current token
            result = self._client.auth.token.renew_self()
            ttl = result.get("auth", {}).get("lease_duration", 0)
            logger.info(f"Vault token renewed successfully, new TTL: {ttl}s")
            return True, f"Token renewed, TTL: {ttl}s"
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to renew Vault token: {error_msg}")
            # If token cannot be renewed (e.g., root token in dev mode), that's OK
            if "not renewable" in error_msg.lower() or "root" in error_msg.lower():
                return True, "Token is not renewable (root/dev token never expires)"
            return False, error_msg

    def get_token_info(self) -> Optional[dict]:
        """
        Get information about the current Vault token.

        Returns:
            Token metadata dictionary or None if unavailable
        """
        if not self.enabled or not self._client:
            return None

        try:
            result = self._client.auth.token.lookup_self()
            data = result.get("data", {})
            return {
                "id": data.get("id", "")[:8] + "...",  # Truncate for security
                "display_name": data.get("display_name"),
                "policies": data.get("policies", []),
                "ttl": data.get("ttl"),
                "renewable": data.get("renewable"),
                "creation_time": data.get("creation_time"),
                "expire_time": data.get("expire_time"),
            }
        except Exception as e:
            logger.error(f"Failed to lookup Vault token: {e}")
            return None

    def _local_encrypt(self, plaintext: str) -> str:
        """
        Local fallback encryption for development.

        Uses simple base64 encoding with a prefix marker.
        NOT secure for production - only for development/testing.
        """
        encoded = base64.b64encode(plaintext.encode("utf-8")).decode("utf-8")
        return f"dev:v1:{encoded}"

    def _local_decrypt(self, ciphertext: str) -> str:
        """
        Local fallback decryption for development.

        Reverses the simple base64 encoding.
        """
        if ciphertext.startswith("dev:v1:"):
            encoded = ciphertext[7:]  # Remove "dev:v1:" prefix
            return base64.b64decode(encoded).decode("utf-8")
        else:
            # Not a dev-encrypted value, return as-is
            return ciphertext

    def encrypt(self, plaintext: str) -> Tuple[bool, str]:
        """
        Encrypt plaintext using Vault Transit or local fallback.

        Args:
            plaintext: The string to encrypt

        Returns:
            Tuple of (success, ciphertext or error message)
        """
        if not plaintext:
            return False, "Empty plaintext"

        if self.enabled and self._client:
            try:
                # Vault Transit requires base64-encoded plaintext
                b64_plaintext = base64.b64encode(plaintext.encode("utf-8")).decode("utf-8")

                response = self._client.secrets.transit.encrypt_data(
                    name=self._transit_key,
                    plaintext=b64_plaintext,
                )

                ciphertext = response["data"]["ciphertext"]
                logger.debug(f"Encrypted data using Vault Transit key '{self._transit_key}'")
                return True, ciphertext

            except Exception as e:
                logger.error(f"Vault Transit encryption failed: {e}")
                # Fall back to local encryption
                logger.warning("Falling back to local encryption")
                return True, self._local_encrypt(plaintext)
        else:
            # Use local fallback
            return True, self._local_encrypt(plaintext)

    def decrypt(self, ciphertext: str) -> Tuple[bool, str]:
        """
        Decrypt ciphertext using Vault Transit or local fallback.

        Args:
            ciphertext: The encrypted string to decrypt

        Returns:
            Tuple of (success, plaintext or error message)
        """
        if not ciphertext:
            return False, "Empty ciphertext"

        # Check if it's a local dev-encrypted value
        if ciphertext.startswith("dev:v1:"):
            try:
                plaintext = self._local_decrypt(ciphertext)
                return True, plaintext
            except Exception as e:
                logger.error(f"Local decryption failed: {e}")
                return False, str(e)

        # Check if it's a Vault Transit encrypted value
        if ciphertext.startswith("vault:v"):
            if self.enabled and self._client:
                try:
                    response = self._client.secrets.transit.decrypt_data(
                        name=self._transit_key,
                        ciphertext=ciphertext,
                    )

                    # Vault returns base64-encoded plaintext
                    b64_plaintext = response["data"]["plaintext"]
                    plaintext = base64.b64decode(b64_plaintext).decode("utf-8")
                    logger.debug(f"Decrypted data using Vault Transit key '{self._transit_key}'")
                    return True, plaintext

                except Exception as e:
                    logger.error(f"Vault Transit decryption failed: {e}")
                    return False, str(e)
            else:
                logger.error("Cannot decrypt Vault-encrypted data without Vault connection")
                return False, "Vault not available"

        # Not encrypted, return as-is (for backwards compatibility with existing data)
        logger.debug("Data does not appear to be encrypted, returning as-is")
        return True, ciphertext

    def is_encrypted(self, value: str) -> bool:
        """Check if a value appears to be encrypted."""
        if not value:
            return False
        return value.startswith("vault:v") or value.startswith("dev:v1:")

    def rotate_key(self) -> Tuple[bool, str]:
        """
        Rotate the Transit encryption key.

        Creates a new key version. Old versions can still decrypt existing data.

        Returns:
            Tuple of (success, message or error)
        """
        if not self.enabled or not self._client:
            return False, "Vault client not available"

        try:
            self._client.secrets.transit.rotate_key(name=self._transit_key)
            logger.info(f"Rotated Transit key '{self._transit_key}'")
            return True, f"Key '{self._transit_key}' rotated successfully"
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to rotate Transit key: {error_msg}")
            return False, error_msg

    def rewrap(self, ciphertext: str) -> Tuple[bool, str]:
        """
        Re-encrypt ciphertext with the latest key version.

        Use after key rotation to update encrypted data to use the new key.

        Args:
            ciphertext: The Vault-encrypted ciphertext to rewrap

        Returns:
            Tuple of (success, new_ciphertext or error message)
        """
        if not ciphertext:
            return False, "Empty ciphertext"

        # Can only rewrap Vault-encrypted data
        if not ciphertext.startswith("vault:v"):
            return False, "Can only rewrap Vault-encrypted data"

        if not self.enabled or not self._client:
            return False, "Vault client not available"

        try:
            response = self._client.secrets.transit.rewrap_data(
                name=self._transit_key,
                ciphertext=ciphertext,
            )
            new_ciphertext = response["data"]["ciphertext"]
            logger.debug(f"Rewrapped data using Transit key '{self._transit_key}'")
            return True, new_ciphertext
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Transit rewrap failed: {error_msg}")
            return False, error_msg

    def get_key_info(self) -> Optional[dict]:
        """
        Get information about the Transit encryption key.

        Returns:
            Key metadata dictionary or None if unavailable
        """
        if not self.enabled or not self._client:
            return None

        try:
            response = self._client.secrets.transit.read_key(name=self._transit_key)
            data = response.get("data", {})
            return {
                "name": data.get("name"),
                "type": data.get("type"),
                "latest_version": data.get("latest_version"),
                "min_decryption_version": data.get("min_decryption_version"),
                "min_encryption_version": data.get("min_encryption_version"),
                "supports_encryption": data.get("supports_encryption"),
                "supports_decryption": data.get("supports_decryption"),
                "auto_rotate_period": data.get("auto_rotate_period"),
                "deletion_allowed": data.get("deletion_allowed"),
                "key_versions": len(data.get("keys", {})),
            }
        except Exception as e:
            logger.error(f"Failed to read Transit key info: {e}")
            return None

    def read_secret(self, path: str) -> Optional[dict]:
        """
        Read a secret from Vault KV v2.

        Args:
            path: Secret path (relative to KV_PATH_PREFIX)

        Returns:
            Secret data dictionary or None if not found
        """
        if not self.enabled or not self._client:
            logger.warning("Vault not available for reading secrets")
            return None

        try:
            # Parse mount point and secret path from the KV path prefix
            mount_point = settings.VAULT_KV_PATH_PREFIX.split("/")[0]
            response = self._client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point=mount_point,
            )
            return response["data"]["data"]
        except Exception as e:
            logger.error(f"Failed to read secret from Vault: {e}")
            return None


# Singleton instance
vault_service = VaultService()
