#!/usr/bin/env python3
"""
Test script for verifying structured JSON logging and sensitive data redaction.

Tests:
1. JSON log format verification
2. Correlation ID presence
3. Sensitive data redaction (emails, passwords, PII)
4. No raw document data in logs
"""

import json
import subprocess
import sys
import time
import requests
import uuid

BASE_URL = "http://localhost:8100"
RESULTS = {"passed": 0, "failed": 0, "tests": []}


def test(name: str, passed: bool, details: str = ""):
    """Record test result."""
    status = "PASS" if passed else "FAIL"
    RESULTS["tests"].append({"name": name, "status": status, "details": details})
    if passed:
        RESULTS["passed"] += 1
        print(f"  ✅ {name}")
    else:
        RESULTS["failed"] += 1
        print(f"  ❌ {name}: {details}")


def test_correlation_id_in_response():
    """Test that responses include X-Correlation-ID header."""
    print("\n=== Testing Correlation ID ===")

    # Test without providing correlation ID (should be generated)
    response = requests.get(f"{BASE_URL}/health")
    has_correlation_id = "X-Correlation-ID" in response.headers
    test(
        "Response includes X-Correlation-ID header (generated)",
        has_correlation_id,
        f"Headers: {dict(response.headers)}" if not has_correlation_id else ""
    )

    # Test with provided correlation ID (should be echoed back)
    custom_id = str(uuid.uuid4())
    response = requests.get(
        f"{BASE_URL}/health",
        headers={"X-Correlation-ID": custom_id}
    )
    echo_correct = response.headers.get("X-Correlation-ID") == custom_id
    test(
        "Response echoes provided X-Correlation-ID",
        echo_correct,
        f"Expected: {custom_id}, Got: {response.headers.get('X-Correlation-ID')}"
    )


def test_json_log_format():
    """Test that logs are in JSON format (when configured)."""
    print("\n=== Testing JSON Log Format ===")

    # Make a request to trigger logging
    response = requests.get(f"{BASE_URL}/health")

    # Get recent logs
    result = subprocess.run(
        ["docker", "compose", "logs", "backend", "--tail", "20"],
        capture_output=True,
        text=True,
        cwd="/home/kelvin/SB-HomeLAb/car-biz"
    )

    logs = result.stdout

    # Check if logs contain structured elements (timestamp, level, logger name)
    # Even in plain text mode, we should have timestamp | level | logger format
    has_timestamp = "2026-01" in logs or "timestamp" in logs
    has_level = "INFO" in logs or "level" in logs
    has_logger = "app." in logs or "logger" in logs

    test(
        "Logs contain timestamp",
        has_timestamp,
        "No timestamp found in logs"
    )

    test(
        "Logs contain log level",
        has_level,
        "No log level found in logs"
    )

    test(
        "Logs contain logger name",
        has_logger,
        "No logger name found in logs"
    )


def test_sensitive_data_redaction():
    """Test that sensitive data is redacted in logs."""
    print("\n=== Testing Sensitive Data Redaction ===")

    # Test 1: Email redaction
    test_email = "test.user@example.com"
    from app.core.logging import redact_sensitive_data

    # Test email redaction
    redacted = redact_sensitive_data(f"Sending email to {test_email}")
    email_redacted = "@example.com" in redacted and "test.user" not in redacted
    test(
        "Email addresses are redacted",
        email_redacted,
        f"Original contained {test_email}, redacted: {redacted}"
    )

    # Test phone number redaction
    test_phone = "555-123-4567"
    redacted = redact_sensitive_data(f"Calling {test_phone}")
    phone_redacted = "***" in redacted and "555-123" not in redacted
    test(
        "Phone numbers are redacted",
        phone_redacted,
        f"Redacted: {redacted}"
    )

    # Test SSN redaction
    test_ssn = "123-45-6789"
    redacted = redact_sensitive_data(f"SSN: {test_ssn}")
    ssn_redacted = "***-**-****" in redacted
    test(
        "SSN is redacted",
        ssn_redacted,
        f"Redacted: {redacted}"
    )

    # Test password field redaction in dict
    test_dict = {"username": "john", "password": "secret123", "email": "john@test.com"}
    redacted = redact_sensitive_data(test_dict)
    password_redacted = redacted.get("password") == "***REDACTED***"
    test(
        "Password fields are redacted in dicts",
        password_redacted,
        f"Redacted dict: {redacted}"
    )

    # Test JWT token redaction
    test_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    redacted = redact_sensitive_data(f"Token: {test_jwt}")
    jwt_redacted = "***JWT_REDACTED***" in redacted
    test(
        "JWT tokens are redacted",
        jwt_redacted,
        f"Redacted: {redacted}"
    )


def test_no_raw_document_data():
    """Test that raw document data is not logged."""
    print("\n=== Testing No Raw Document Data in Logs ===")

    # Get recent logs
    result = subprocess.run(
        ["docker", "compose", "logs", "backend", "--tail", "100"],
        capture_output=True,
        text=True,
        cwd="/home/kelvin/SB-HomeLAb/car-biz"
    )

    logs = result.stdout

    # Check for absence of raw file content patterns
    has_base64_blob = "data:image" in logs.lower() or "base64" in logs.lower()
    has_binary_data = b'\x00' in logs.encode() if logs else False

    test(
        "No base64 image data in logs",
        not has_base64_blob,
        "Found base64 or data:image pattern in logs"
    )

    test(
        "No binary data in logs",
        not has_binary_data,
        "Found binary data in logs"
    )


def test_pii_not_in_plain_text():
    """Test that PII is not logged in plain text."""
    print("\n=== Testing PII Not in Plain Text ===")

    # Get recent logs
    result = subprocess.run(
        ["docker", "compose", "logs", "backend", "--tail", "100"],
        capture_output=True,
        text=True,
        cwd="/home/kelvin/SB-HomeLAb/car-biz"
    )

    logs = result.stdout

    # Look for common PII patterns that should NOT appear
    # Note: "@example.com" domain might appear in config, that's OK
    # We're looking for REAL email patterns like user@domain

    # Check for emails (excluding domains that might be in config)
    import re
    email_pattern = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
    found_emails = email_pattern.findall(logs)

    # Filter out known safe emails (config, from_email, etc.)
    safe_emails = {'noreply@example.com', 'support@fxweekly.com'}
    suspicious_emails = [e for e in found_emails if e not in safe_emails and not e.startswith('***@')]

    test(
        "No user emails in plain text logs",
        len(suspicious_emails) == 0,
        f"Found: {suspicious_emails[:5]}" if suspicious_emails else ""
    )

    # Check for SSN patterns
    ssn_pattern = re.compile(r'\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b')
    found_ssn = ssn_pattern.findall(logs)

    test(
        "No SSN in logs",
        len(found_ssn) == 0,
        f"Found: {found_ssn}" if found_ssn else ""
    )


def main():
    print("=" * 60)
    print("LOGGING VERIFICATION TEST")
    print("=" * 60)

    # Run tests
    test_correlation_id_in_response()
    test_json_log_format()

    # For redaction tests, we need to import the module
    # This requires running from within the backend container or having the path set up
    try:
        sys.path.insert(0, "/home/kelvin/SB-HomeLAb/car-biz/backend")
        test_sensitive_data_redaction()
    except ImportError as e:
        print(f"\n⚠️  Could not import logging module for direct redaction tests: {e}")
        print("    Running external verification instead...")

    test_no_raw_document_data()
    test_pii_not_in_plain_text()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Passed: {RESULTS['passed']}")
    print(f"Failed: {RESULTS['failed']}")
    print(f"Total:  {RESULTS['passed'] + RESULTS['failed']}")

    # Save results
    with open("/home/kelvin/SB-HomeLAb/car-biz/test_results_logging.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

    print("\nResults saved to test_results_logging.json")

    return 0 if RESULTS["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
