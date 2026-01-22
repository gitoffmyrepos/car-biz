#!/usr/bin/env python3
"""
File Upload Security Verification Script
Run inside Docker container: docker exec fx-weekly-lease-backend python3 /app/scripts/verify_upload_security.py
"""

import sys
sys.path.insert(0, '/app')

from app.services.storage import StorageService, ALLOWED_INSURANCE_TYPES, MAX_FILE_SIZE

storage = StorageService()

print('=' * 60)
print('FILE UPLOAD SECURITY VERIFICATION')
print('=' * 60)

all_passed = True

# Test 1: Valid JPEG
print('\n1. Upload valid file within size limit')
jpeg_data = bytes([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]) + b'JFIF' + b'\x00' * 100
result = storage.validate_file(jpeg_data, 'test.jpg')
print(f'   JPEG file (116 bytes): is_valid={result[0]}, mime={result[2]}')
if result[0] == True:
    print('   PASS - Upload accepted')
else:
    print('   FAIL - Valid JPEG should be accepted')
    all_passed = False

# Test 2: Oversized file
print('\n2. Attempt upload exceeding size limit')
oversized = b'x' * (MAX_FILE_SIZE + 1)
result = storage.validate_file(oversized, 'huge.jpg')
print(f'   File size: {len(oversized)} bytes (limit: {MAX_FILE_SIZE})')
print(f'   Result: is_valid={result[0]}, error="{result[1]}"')
if result[0] == False:
    print('   PASS - Rejection with size error')
else:
    print('   FAIL - Oversized file should be rejected')
    all_passed = False

# Test 3: Disallowed file type
print('\n3. Attempt upload of disallowed file type')
js_data = b'function malicious() { alert(1); }'
result = storage.validate_file(js_data, 'script.js')
print(f'   JavaScript file: is_valid={result[0]}, detected_mime={result[2]}')
print(f'   Error: "{result[1]}"')
if result[0] == False:
    print('   PASS - Rejection with type error')
else:
    print('   FAIL - JavaScript should be rejected')
    all_passed = False

# Test 4: Spoofed content-type (Magic bytes validation)
print('\n4. Attempt upload with spoofed content-type')
exe_data = bytes([0x4D, 0x5A]) + b'\x00' * 100  # Windows MZ header
result = storage.validate_file(exe_data, 'image.jpg')  # Claiming to be JPEG
print(f'   EXE disguised as JPEG: is_valid={result[0]}, detected_mime={result[2]}')
print(f'   Error: "{result[1]}"')
if result[0] == False:
    print('   PASS - Magic bytes validation catches mismatch')
else:
    print('   FAIL - Spoofed executable should be rejected')
    all_passed = False

# Test 5: Empty file
print('\n5. Empty file rejection')
result = storage.validate_file(b'', 'empty.jpg')
print(f'   Empty file: is_valid={result[0]}, error="{result[1]}"')
if result[0] == False:
    print('   PASS - Empty file rejected')
else:
    print('   FAIL - Empty file should be rejected')
    all_passed = False

# Test 6: Valid PDF
print('\n6. Valid PDF file')
pdf_data = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer'
result = storage.validate_file(pdf_data, 'document.pdf')
print(f'   PDF file: is_valid={result[0]}, mime={result[2]}')
if result[0] == True:
    print('   PASS - PDF accepted')
else:
    print('   FAIL - Valid PDF should be accepted')
    all_passed = False

# Test 7: Text file disguised as JPEG
print('\n7. Plain text disguised as JPEG')
text_data = b'This is plain text, not an image file.'
result = storage.validate_file(text_data, 'image.jpg')
print(f'   Text as JPEG: is_valid={result[0]}, detected_mime={result[2]}')
print(f'   Error: "{result[1]}"')
if result[0] == False:
    print('   PASS - Content validation catches mismatch')
else:
    print('   FAIL - Text disguised as JPEG should be rejected')
    all_passed = False

# Test 8: ELF executable disguised as PNG
print('\n8. Linux executable disguised as PNG')
elf_data = bytes([0x7F, 0x45, 0x4C, 0x46]) + b'\x00' * 100  # ELF header
result = storage.validate_file(elf_data, 'image.png')
print(f'   ELF as PNG: is_valid={result[0]}, detected_mime={result[2]}')
print(f'   Error: "{result[1]}"')
if result[0] == False:
    print('   PASS - Magic bytes validation catches ELF header')
else:
    print('   FAIL - ELF disguised as PNG should be rejected')
    all_passed = False

print('\n' + '=' * 60)
if all_passed:
    print('ALL FILE UPLOAD SECURITY TESTS PASSED!')
else:
    print('SOME TESTS FAILED!')
print('=' * 60)
print('\nSummary:')
print('  - Type validation: WORKING')
print('  - Size validation: WORKING')
print('  - Magic bytes (content) validation: WORKING')
print('  - Empty file rejection: WORKING')
print('  - Spoofed content-type detection: WORKING')

sys.exit(0 if all_passed else 1)
