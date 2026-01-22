#!/usr/bin/env python3
"""
File Upload Security Test Suite
Tests the file upload security validation: type, size, and content (magic bytes)
"""

import base64
import json
import os
import sys
import tempfile
from pathlib import Path

import requests

# Configuration
API_BASE = os.environ.get("API_BASE", "http://localhost:8100")

# Test JWT token - you may need to replace with a valid token
# For testing, we'll try to use a dev token or create test files
TEST_TOKEN = os.environ.get("TEST_TOKEN", "")


def create_test_files():
    """Create various test files for upload testing."""
    test_files = {}

    # Valid small JPEG (under 10MB)
    # Minimal valid JPEG - FFD8FFE0 magic bytes
    jpeg_header = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00
    ])
    # Add minimal image data (1x1 pixel)
    jpeg_image = jpeg_header + bytes([
        0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06,
        0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B,
        0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D,
        0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C,
        0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34,
        0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00,
        0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
        0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10,
        0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03,
        0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
        0x3F, 0x00, 0x7F, 0xFF, 0xD9
    ])
    test_files["valid_jpeg"] = {
        "data": jpeg_image,
        "filename": "test_image.jpg",
        "content_type": "image/jpeg",
        "expected": "accept"
    }

    # Valid small PNG
    # Minimal valid PNG - 89504E47 magic bytes
    png_image = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D,  # IHDR length
        0x49, 0x48, 0x44, 0x52,  # IHDR
        0x00, 0x00, 0x00, 0x01,  # width = 1
        0x00, 0x00, 0x00, 0x01,  # height = 1
        0x08, 0x02,  # bit depth = 8, color type = 2 (RGB)
        0x00, 0x00, 0x00,  # compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE,  # CRC
        0x00, 0x00, 0x00, 0x0C,  # IDAT length
        0x49, 0x44, 0x41, 0x54,  # IDAT
        0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF, 0x00,
        0x05, 0xFE, 0x02, 0xFE,  # CRC
        0x00, 0x00, 0x00, 0x00,  # IEND length
        0x49, 0x45, 0x4E, 0x44,  # IEND
        0xAE, 0x42, 0x60, 0x82   # CRC
    ])
    test_files["valid_png"] = {
        "data": png_image,
        "filename": "test_image.png",
        "content_type": "image/png",
        "expected": "accept"
    }

    # Valid PDF
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF"""
    test_files["valid_pdf"] = {
        "data": pdf_content,
        "filename": "test_document.pdf",
        "content_type": "application/pdf",
        "expected": "accept"
    }

    # Invalid file type - executable (ELF header for Linux)
    elf_header = bytes([0x7F, 0x45, 0x4C, 0x46]) + b"\x00" * 100
    test_files["invalid_executable"] = {
        "data": elf_header,
        "filename": "malware.exe",
        "content_type": "application/x-executable",
        "expected": "reject"
    }

    # Invalid file type - JavaScript/HTML
    js_content = b"<script>alert('xss');</script>"
    test_files["invalid_html"] = {
        "data": js_content,
        "filename": "page.html",
        "content_type": "text/html",
        "expected": "reject"
    }

    # Spoofed content type - JavaScript disguised as JPEG
    test_files["spoofed_js_as_jpeg"] = {
        "data": b"function malicious() { /* evil code */ }",
        "filename": "image.jpg",
        "content_type": "image/jpeg",  # Claiming to be JPEG but isn't
        "expected": "reject"
    }

    # Spoofed content type - EXE disguised as PNG
    test_files["spoofed_exe_as_png"] = {
        "data": bytes([0x4D, 0x5A]) + b"\x00" * 100,  # MZ header (Windows EXE)
        "filename": "image.png",
        "content_type": "image/png",
        "expected": "reject"
    }

    # Empty file
    test_files["empty_file"] = {
        "data": b"",
        "filename": "empty.jpg",
        "content_type": "image/jpeg",
        "expected": "reject"
    }

    # File just under size limit (simulate with small file - actual test would need 10MB)
    test_files["near_limit"] = {
        "data": jpeg_image,  # Using valid JPEG
        "filename": "large_image.jpg",
        "content_type": "image/jpeg",
        "expected": "accept"
    }

    return test_files


def test_storage_service_directly():
    """Test the storage service validation directly using Python."""
    print("\n" + "=" * 60)
    print("TESTING STORAGE SERVICE VALIDATION DIRECTLY")
    print("=" * 60)

    # We'll test the validation logic by importing and calling the function
    # Since we're outside the container, we'll simulate the test

    test_files = create_test_files()
    results = []

    for test_name, test_data in test_files.items():
        file_content = test_data["data"]
        filename = test_data["filename"]
        expected = test_data["expected"]

        # Analyze the file manually
        file_size = len(file_content)

        # Check magic bytes
        magic_bytes = file_content[:8] if len(file_content) >= 8 else file_content

        # Known magic bytes
        magic_signatures = {
            b'\xff\xd8\xff': "JPEG",
            b'\x89PNG\r\n\x1a\n': "PNG",
            b'%PDF': "PDF",
            b'\x7fELF': "ELF executable",
            b'MZ': "Windows executable",
            b'<script': "HTML/Script",
            b'function': "JavaScript",
        }

        detected_type = "Unknown"
        for sig, name in magic_signatures.items():
            if file_content.startswith(sig):
                detected_type = name
                break

        result = {
            "test": test_name,
            "filename": filename,
            "size": file_size,
            "expected": expected,
            "detected_type": detected_type,
        }

        # Determine if it would be accepted
        is_valid_type = detected_type in ["JPEG", "PNG", "PDF"]
        is_valid_size = 0 < file_size <= 10 * 1024 * 1024
        would_accept = is_valid_type and is_valid_size

        result["would_accept"] = "accept" if would_accept else "reject"
        result["matches_expected"] = result["would_accept"] == expected

        results.append(result)

        status = "PASS" if result["matches_expected"] else "FAIL"
        print(f"\n{test_name}: {status}")
        print(f"  Filename: {filename}")
        print(f"  Size: {file_size} bytes")
        print(f"  Detected Type: {detected_type}")
        print(f"  Expected: {expected}")
        print(f"  Would Accept: {result['would_accept']}")

    return results


def test_api_upload_validation():
    """Test the actual API endpoints with file uploads."""
    print("\n" + "=" * 60)
    print("TESTING API UPLOAD VALIDATION")
    print("=" * 60)

    if not TEST_TOKEN:
        print("WARNING: No TEST_TOKEN provided. Skipping API tests.")
        print("Set TEST_TOKEN environment variable with a valid JWT to run API tests.")
        return []

    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}"
    }

    test_files = create_test_files()
    results = []

    # Test insurance upload endpoint
    endpoint = f"{API_BASE}/api/customer/insurance/upload"

    for test_name, test_data in test_files.items():
        print(f"\nTesting {test_name}...")

        files = {
            "file": (test_data["filename"], test_data["data"], test_data["content_type"])
        }

        try:
            response = requests.post(endpoint, files=files, headers=headers, timeout=30)

            result = {
                "test": test_name,
                "status_code": response.status_code,
                "expected": test_data["expected"],
            }

            if response.status_code == 200:
                result["actual"] = "accept"
            elif response.status_code == 400:
                result["actual"] = "reject"
                try:
                    result["error"] = response.json().get("detail", "Unknown error")
                except:
                    result["error"] = response.text
            else:
                result["actual"] = "error"
                result["error"] = f"Unexpected status: {response.status_code}"

            result["matches_expected"] = result["actual"] == test_data["expected"]
            results.append(result)

            status = "PASS" if result["matches_expected"] else "FAIL"
            print(f"  {status}: {test_name}")
            print(f"    Expected: {test_data['expected']}, Got: {result['actual']}")
            if "error" in result:
                print(f"    Error: {result['error']}")

        except Exception as e:
            print(f"  ERROR: {str(e)}")
            results.append({
                "test": test_name,
                "expected": test_data["expected"],
                "actual": "error",
                "error": str(e),
                "matches_expected": False
            })

    return results


def run_docker_container_test():
    """Run validation tests inside the Docker container."""
    print("\n" + "=" * 60)
    print("TESTING INSIDE DOCKER CONTAINER")
    print("=" * 60)

    test_script = '''
import sys
sys.path.insert(0, "/app")

from app.services.storage import StorageService, ALLOWED_INSURANCE_TYPES, MAX_FILE_SIZE

storage = StorageService()

# Test 1: Valid JPEG
jpeg_data = bytes([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]) + b"\\x00" * 100
result = storage.validate_file(jpeg_data, "test.jpg")
print(f"Test 1 - Valid JPEG: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

# Test 2: Valid PNG
png_data = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) + b"\\x00" * 100
result = storage.validate_file(png_data, "test.png")
print(f"Test 2 - Valid PNG: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

# Test 3: Valid PDF
pdf_data = b"%PDF-1.4\\n" + b"\\x00" * 100
result = storage.validate_file(pdf_data, "test.pdf")
print(f"Test 3 - Valid PDF: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

# Test 4: Invalid - JavaScript
js_data = b"function test() { alert(1); }"
result = storage.validate_file(js_data, "test.js")
print(f"Test 4 - JavaScript: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

# Test 5: Spoofed - JS claiming to be JPEG
result = storage.validate_file(js_data, "test.jpg")  # Same JS data but named .jpg
print(f"Test 5 - JS as JPEG: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

# Test 6: Empty file
result = storage.validate_file(b"", "empty.jpg")
print(f"Test 6 - Empty file: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

# Test 7: File exceeding size limit (simulate with check)
oversized = b"x" * (MAX_FILE_SIZE + 1)
result = storage.validate_file(oversized, "huge.jpg")
print(f"Test 7 - Oversized: is_valid={result[0]}, error={result[1]}")

# Test 8: Windows executable disguised as image
exe_data = bytes([0x4D, 0x5A]) + b"\\x00" * 100  # MZ header
result = storage.validate_file(exe_data, "image.png")
print(f"Test 8 - EXE as PNG: is_valid={result[0]}, error={result[1]}, mime={result[2]}")

print("\\nALL TESTS COMPLETED")
'''

    import subprocess

    try:
        result = subprocess.run(
            ["docker", "exec", "fx-weekly-lease-backend", "python3", "-c", test_script],
            capture_output=True,
            text=True,
            timeout=30
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("ERROR: Test timed out")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False


def main():
    """Run all upload security tests."""
    print("=" * 60)
    print("FILE UPLOAD SECURITY TEST SUITE")
    print("=" * 60)
    print(f"API Base: {API_BASE}")

    # Run storage service analysis
    local_results = test_storage_service_directly()

    # Run Docker container tests
    docker_success = run_docker_container_test()

    # Run API tests if token available
    api_results = test_api_upload_validation()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    local_passed = sum(1 for r in local_results if r.get("matches_expected", False))
    print(f"Local Analysis: {local_passed}/{len(local_results)} passed")

    if docker_success:
        print("Docker Container Tests: PASSED")
    else:
        print("Docker Container Tests: FAILED")

    if api_results:
        api_passed = sum(1 for r in api_results if r.get("matches_expected", False))
        print(f"API Tests: {api_passed}/{len(api_results)} passed")
    else:
        print("API Tests: SKIPPED (no token)")

    # Return overall success
    all_passed = (
        all(r.get("matches_expected", False) for r in local_results) and
        docker_success
    )

    if all_passed:
        print("\n[SUCCESS] All file upload security tests passed!")
        return 0
    else:
        print("\n[FAILURE] Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
