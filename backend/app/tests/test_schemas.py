"""
Weekly Vehicle Leasing Platform - Schema Tests
Salvage-to-Lux Fleet Management

Unit tests for Pydantic schema validation.
"""

import pytest
from pydantic import ValidationError

from app.schemas.inquiry import InquiryCreate, InquiryResponse, InquirySubmitResponse


class TestInquiryCreate:
    """Tests for InquiryCreate schema validation."""

    def test_valid_inquiry_creation(self, sample_inquiry: dict):
        """Test creating an inquiry with valid data."""
        inquiry = InquiryCreate(**sample_inquiry)

        assert inquiry.full_name == "Jane Smith"
        assert inquiry.email == "jane.smith@example.com"
        assert inquiry.phone == "(555) 987-6543"
        assert inquiry.preferred_contact.value == "email"
        assert inquiry.vehicle_type.value == "suv"
        assert inquiry.timeframe.value == "this_week"
        assert inquiry.notes == "Looking for a luxury SUV for a month."

    def test_valid_inquiry_minimal_fields(self):
        """Test creating an inquiry with only required fields."""
        inquiry = InquiryCreate(
            full_name="John Doe",
            email="john@example.com"
        )

        assert inquiry.full_name == "John Doe"
        assert inquiry.email == "john@example.com"
        assert inquiry.phone is None
        assert inquiry.notes is None

    def test_invalid_email_format(self):
        """Test that invalid email format raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            InquiryCreate(
                full_name="Test User",
                email="invalid-email"
            )

        errors = exc_info.value.errors()
        assert len(errors) >= 1
        assert "email" in str(errors[0]["loc"])

    def test_name_too_short(self):
        """Test that name with less than 2 characters raises error."""
        with pytest.raises(ValidationError) as exc_info:
            InquiryCreate(
                full_name="J",
                email="test@example.com"
            )

        errors = exc_info.value.errors()
        assert any("full_name" in str(e["loc"]) for e in errors)

    def test_name_too_long(self):
        """Test that name exceeding max length raises error."""
        long_name = "A" * 300
        with pytest.raises(ValidationError) as exc_info:
            InquiryCreate(
                full_name=long_name,
                email="test@example.com"
            )

        errors = exc_info.value.errors()
        assert any("full_name" in str(e["loc"]) for e in errors)

    def test_name_whitespace_trimmed(self):
        """Test that name whitespace is trimmed."""
        inquiry = InquiryCreate(
            full_name="  John Doe  ",
            email="john@example.com"
        )

        assert inquiry.full_name == "John Doe"

    def test_valid_phone_formats(self):
        """Test various valid phone number formats."""
        valid_phones = [
            "(555) 123-4567",
            "555-123-4567",
            "5551234567",
            "+15551234567",
            "+1 555 123 4567",
        ]

        for phone in valid_phones:
            inquiry = InquiryCreate(
                full_name="Test User",
                email="test@example.com",
                phone=phone
            )
            assert inquiry.phone == phone

    def test_invalid_phone_format(self):
        """Test that invalid phone format raises error."""
        invalid_phones = [
            "123",  # Too short
            "abc-def-ghij",  # Letters
            "555-123",  # Incomplete
        ]

        for phone in invalid_phones:
            with pytest.raises(ValidationError) as exc_info:
                InquiryCreate(
                    full_name="Test User",
                    email="test@example.com",
                    phone=phone
                )

            errors = exc_info.value.errors()
            assert any("phone" in str(e["loc"]) for e in errors)

    def test_notes_max_length(self):
        """Test that notes exceeding max length raises error."""
        long_notes = "A" * 2500
        with pytest.raises(ValidationError) as exc_info:
            InquiryCreate(
                full_name="Test User",
                email="test@example.com",
                notes=long_notes
            )

        errors = exc_info.value.errors()
        assert any("notes" in str(e["loc"]) for e in errors)

    def test_valid_vehicle_types(self):
        """Test all valid vehicle types are accepted."""
        vehicle_types = ["sedan", "suv", "truck", "van", "luxury", "any"]

        for v_type in vehicle_types:
            inquiry = InquiryCreate(
                full_name="Test User",
                email="test@example.com",
                vehicle_type=v_type
            )
            assert inquiry.vehicle_type.value == v_type

    def test_valid_timeframes(self):
        """Test all valid timeframes are accepted."""
        timeframes = ["asap", "this_week", "this_month", "next_month", "just_browsing"]

        for timeframe in timeframes:
            inquiry = InquiryCreate(
                full_name="Test User",
                email="test@example.com",
                timeframe=timeframe
            )
            assert inquiry.timeframe.value == timeframe

    def test_valid_contact_methods(self):
        """Test all valid contact methods are accepted."""
        methods = ["email", "phone", "either"]

        for method in methods:
            inquiry = InquiryCreate(
                full_name="Test User",
                email="test@example.com",
                preferred_contact=method
            )
            assert inquiry.preferred_contact.value == method


class TestInquirySubmitResponse:
    """Tests for InquirySubmitResponse schema."""

    def test_successful_response(self):
        """Test successful inquiry submission response."""
        response = InquirySubmitResponse(
            success=True,
            message="Thank you for your inquiry!",
            inquiry_id=123
        )

        assert response.success is True
        assert "Thank you" in response.message
        assert response.inquiry_id == 123

    def test_failed_response(self):
        """Test failed inquiry submission response."""
        response = InquirySubmitResponse(
            success=False,
            message="An error occurred",
            inquiry_id=None
        )

        assert response.success is False
        assert response.inquiry_id is None
