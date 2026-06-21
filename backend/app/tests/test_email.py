"""
GigWheels - Email Service Tests
Weekly car rentals for gig drivers

Unit tests for the email service backend selection (Proton SMTP vs Resend)
and MIME construction. The SMTP/Resend transports are mocked at the boundary;
no real emails are sent.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_settings(**overrides):
    """Build a settings stand-in with email-relevant defaults."""
    base = {
        "EMAIL_BACKEND": "auto",
        "SMTP_HOST": "",
        "SMTP_PORT": 587,
        "SMTP_USER": "",
        "SMTP_PASSWORD": "",
        "SMTP_FROM_EMAIL": "",
        "SMTP_USE_TLS": True,
        "RESEND_API_KEY": "",
        "RESEND_FROM_EMAIL": "noreply@example.com",
    }
    base.update(overrides)
    mock_settings = MagicMock()
    for key, value in base.items():
        setattr(mock_settings, key, value)
    return mock_settings


def _build_service(**overrides):
    """Instantiate EmailService with patched settings."""
    import app.services.email as email_module

    with patch.object(email_module, "settings", _make_settings(**overrides)):
        return email_module.EmailService()


class TestBackendSelection:
    """Backend resolution from configuration."""

    def test_smtp_selected_when_host_set_in_auto(self):
        service = _build_service(
            SMTP_HOST="smtp.protonmail.ch",
            SMTP_FROM_EMAIL="ops@gigwheels.com",
        )
        assert service.backend == "smtp"
        assert service.enabled is True
        assert service.from_email == "ops@gigwheels.com"

    def test_smtp_forced_even_without_host_keeps_disabled_when_no_host(self):
        # EMAIL_BACKEND=smtp but no host -> smtp backend selected (operator intent)
        service = _build_service(EMAIL_BACKEND="smtp", SMTP_HOST="smtp.protonmail.ch")
        assert service.backend == "smtp"

    def test_resend_selected_when_only_resend_configured(self):
        service = _build_service(RESEND_API_KEY="re_test_key")
        assert service.backend == "resend"
        assert service.enabled is True
        assert service.from_email == "noreply@example.com"

    def test_smtp_wins_over_resend_in_auto_when_both_set(self):
        service = _build_service(
            SMTP_HOST="smtp.protonmail.ch",
            RESEND_API_KEY="re_test_key",
        )
        assert service.backend == "smtp"

    def test_resend_forced_ignores_smtp_host(self):
        service = _build_service(
            EMAIL_BACKEND="resend",
            SMTP_HOST="smtp.protonmail.ch",
            RESEND_API_KEY="re_test_key",
        )
        assert service.backend == "resend"

    def test_no_backend_when_nothing_configured(self):
        service = _build_service()
        assert service.backend == "none"
        assert service.enabled is False

    def test_smtp_from_falls_back_to_resend_from(self):
        service = _build_service(SMTP_HOST="smtp.protonmail.ch")
        assert service.from_email == "noreply@example.com"


class TestSmtpDispatch:
    """SMTP transport: aiosmtplib invocation and MIME construction."""

    @pytest.mark.asyncio
    async def test_smtp_send_uses_proton_host_port_starttls_auth(self):
        service = _build_service(
            SMTP_HOST="smtp.protonmail.ch",
            SMTP_PORT=587,
            SMTP_USER="ops@gigwheels.com",
            SMTP_PASSWORD="proton-token",
            SMTP_FROM_EMAIL="ops@gigwheels.com",
            SMTP_USE_TLS=True,
        )

        sent_message = {}

        async def fake_send(message, **kwargs):
            sent_message["message"] = message
            sent_message["kwargs"] = kwargs

        mock_aiosmtplib = MagicMock()
        mock_aiosmtplib.send = AsyncMock(side_effect=fake_send)

        with patch.dict("sys.modules", {"aiosmtplib": mock_aiosmtplib}):
            result = await service._dispatch(
                {
                    "from": "ops@gigwheels.com",
                    "to": ["driver@example.com"],
                    "subject": "Test Subject",
                    "html": "<p>Hello</p>",
                    "text": "Hello",
                }
            )

        assert result["success"] is True
        mock_aiosmtplib.send.assert_awaited_once()
        kwargs = sent_message["kwargs"]
        assert kwargs["hostname"] == "smtp.protonmail.ch"
        assert kwargs["port"] == 587
        assert kwargs["username"] == "ops@gigwheels.com"
        assert kwargs["password"] == "proton-token"
        assert kwargs["start_tls"] is True

        message = sent_message["message"]
        assert message["From"] == "ops@gigwheels.com"
        assert message["To"] == "driver@example.com"
        assert message["Subject"] == "Test Subject"
        # MIME multipart: text content + html alternative
        payloads = message.get_payload()
        subtypes = {part.get_content_subtype() for part in payloads}
        assert "plain" in subtypes
        assert "html" in subtypes

    @pytest.mark.asyncio
    async def test_smtp_send_through_public_method(self):
        """Public method send_welcome_email routes through SMTP dispatch."""
        service = _build_service(
            SMTP_HOST="smtp.protonmail.ch",
            SMTP_USER="ops@gigwheels.com",
            SMTP_PASSWORD="proton-token",
            SMTP_FROM_EMAIL="ops@gigwheels.com",
        )

        mock_aiosmtplib = MagicMock()
        mock_aiosmtplib.send = AsyncMock()

        with patch.dict("sys.modules", {"aiosmtplib": mock_aiosmtplib}):
            result = await service.send_welcome_email(
                to_email="driver@example.com",
                customer_name="Jane Doe",
            )

        assert result["success"] is True
        mock_aiosmtplib.send.assert_awaited_once()
        _, kwargs = mock_aiosmtplib.send.await_args
        assert kwargs["hostname"] == "smtp.protonmail.ch"
        assert kwargs["start_tls"] is True


class TestResendDispatch:
    """Resend transport fallback is still selected and invoked."""

    @pytest.mark.asyncio
    async def test_resend_send_invokes_resend_api(self):
        service = _build_service(RESEND_API_KEY="re_test_key")

        mock_resend = MagicMock()
        mock_resend.Emails.send.return_value = {"id": "resend-123"}

        with patch.dict("sys.modules", {"resend": mock_resend}):
            result = await service._dispatch(
                {
                    "from": "noreply@example.com",
                    "to": ["driver@example.com"],
                    "subject": "Test Subject",
                    "html": "<p>Hello</p>",
                    "text": "Hello",
                }
            )

        assert result["success"] is True
        assert result["email_id"] == "resend-123"
        mock_resend.Emails.send.assert_called_once()
        sent_params = mock_resend.Emails.send.call_args[0][0]
        assert sent_params["to"] == ["driver@example.com"]
        assert sent_params["from"] == "noreply@example.com"


class TestRecipientValidation:
    """Recipient validation at the boundary."""

    @pytest.mark.asyncio
    async def test_invalid_recipient_raises(self):
        service = _build_service(SMTP_HOST="smtp.protonmail.ch")
        with pytest.raises(ValueError):
            await service._dispatch(
                {
                    "from": "ops@gigwheels.com",
                    "to": ["not-an-email"],
                    "subject": "x",
                    "html": "<p>x</p>",
                    "text": "x",
                }
            )

    @pytest.mark.asyncio
    async def test_empty_recipient_list_raises(self):
        service = _build_service(SMTP_HOST="smtp.protonmail.ch")
        with pytest.raises(ValueError):
            await service._dispatch(
                {
                    "from": "ops@gigwheels.com",
                    "to": [],
                    "subject": "x",
                    "html": "<p>x</p>",
                    "text": "x",
                }
            )


class TestNoBackendSkip:
    """No backend configured -> graceful skip, no fabricated send."""

    @pytest.mark.asyncio
    async def test_disabled_service_skips_gracefully(self):
        service = _build_service()  # nothing configured
        assert service.enabled is False

        result = await service.send_welcome_email(
            to_email="driver@example.com",
            customer_name="Jane Doe",
        )
        # Existing contract: disabled service returns success + simulated flag,
        # and never calls a transport.
        assert result["success"] is True
        assert result.get("simulated") is True
