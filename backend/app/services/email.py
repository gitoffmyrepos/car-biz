"""
GigWheels - Email Service
Weekly car rentals for gig drivers

Email service for sending transactional emails.

Supports two backends:
  * SMTP  - Proton SMTP submission (smtp.protonmail.ch:587 STARTTLS) or
            Proton Mail Bridge, via aiosmtplib. Used when EMAIL_BACKEND="smtp"
            or (EMAIL_BACKEND="auto" and SMTP_HOST is set).
  * Resend - legacy HTTP API, used when a Resend API key is configured and SMTP
            is not selected.

If neither backend is configured the service logs and skips (dev mode); it
never fabricates a successful send.
"""

import logging
from email.message import EmailMessage

from app.core.config import settings


logger = logging.getLogger(__name__)

# Backend identifiers
BACKEND_SMTP = "smtp"
BACKEND_RESEND = "resend"
BACKEND_NONE = "none"


class EmailService:
    """Service for sending transactional emails via SMTP (Proton) or Resend."""

    def __init__(self):
        """Resolve the active email backend from configuration."""
        backend_setting = (settings.EMAIL_BACKEND or "auto").strip().lower()

        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_use_tls = settings.SMTP_USE_TLS
        self.resend_api_key = settings.RESEND_API_KEY

        # Select backend
        if backend_setting == BACKEND_SMTP or (
            backend_setting == "auto" and bool(self.smtp_host)
        ):
            self.backend = BACKEND_SMTP
            # Prefer the dedicated SMTP from-address; fall back to the Resend one.
            self.from_email = settings.SMTP_FROM_EMAIL or settings.RESEND_FROM_EMAIL
        elif backend_setting in (BACKEND_RESEND, "auto") and bool(self.resend_api_key):
            self.backend = BACKEND_RESEND
            self.from_email = settings.RESEND_FROM_EMAIL
        else:
            self.backend = BACKEND_NONE
            self.from_email = settings.SMTP_FROM_EMAIL or settings.RESEND_FROM_EMAIL

        self.enabled = self.backend != BACKEND_NONE

        if self.backend == BACKEND_SMTP:
            logger.info(
                "Email service initialized with SMTP backend (host=%s port=%s starttls=%s)",
                self.smtp_host,
                self.smtp_port,
                self.smtp_use_tls,
            )
        elif self.backend == BACKEND_RESEND:
            logger.info("Email service initialized with Resend backend")
        else:
            logger.warning(
                "Email service disabled - no SMTP_HOST and no RESEND_API_KEY configured"
            )

    async def _dispatch(self, params: dict) -> dict:
        """
        Send a single email described by ``params`` via the active backend.

        ``params`` uses the existing Resend-shaped contract:
            {"from", "to" (list[str]), "subject", "html", "text" (optional)}

        Returns a dict matching the callers' contract:
            {"success": bool, "message"/"error": str, "email_id": str | None}

        Raises ValueError on invalid recipients; never fabricates a send.
        """
        recipients = params.get("to") or []
        if isinstance(recipients, str):
            recipients = [recipients]
        recipients = [r for r in recipients if r and "@" in r]
        if not recipients:
            raise ValueError("No valid recipient email address provided")

        if self.backend == BACKEND_SMTP:
            return await self._dispatch_smtp(params, recipients)
        if self.backend == BACKEND_RESEND:
            return self._dispatch_resend(params, recipients)
        # Should not reach here when enabled; guard defensively.
        raise RuntimeError("No email backend configured")

    async def _dispatch_smtp(self, params: dict, recipients: list) -> dict:
        """Send via Proton SMTP submission using aiosmtplib + STARTTLS."""
        import aiosmtplib

        message = EmailMessage()
        message["From"] = params["from"]
        message["To"] = ", ".join(recipients)
        message["Subject"] = params["subject"]

        text_body = params.get("text") or "Please view this email in an HTML-capable client."
        message.set_content(text_body)
        if params.get("html"):
            message.add_alternative(params["html"], subtype="html")

        await aiosmtplib.send(
            message,
            hostname=self.smtp_host,
            port=self.smtp_port,
            username=self.smtp_user or None,
            password=self.smtp_password or None,
            start_tls=self.smtp_use_tls,
        )

        return {
            "success": True,
            "message": "Email sent successfully",
            "email_id": message.get("Message-ID"),
        }

    def _dispatch_resend(self, params: dict, recipients: list) -> dict:
        """Send via the Resend HTTP API. ``resend`` is imported lazily."""
        import resend

        resend.api_key = self.resend_api_key
        send_params = dict(params)
        send_params["to"] = recipients
        resend_response = resend.Emails.send(send_params)
        return {
            "success": True,
            "message": "Email sent successfully",
            "email_id": resend_response.get("id"),
        }

    async def send_inquiry_auto_response(
        self,
        to_email: str,
        customer_name: str,
        inquiry_id: int,
    ) -> dict:
        """
        Send automatic acknowledgement email when an inquiry is submitted.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            inquiry_id: The inquiry ID for reference

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent inquiry response to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = "Thank You for Your Inquiry - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #1A1A1A, #2D2D2D);
                    color: #C5A572;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .content {{
                    background: #F8F5F0;
                    padding: 30px;
                    border: 1px solid #E5E5E5;
                }}
                .highlight {{
                    color: #C5A572;
                    font-weight: 600;
                }}
                .reference {{
                    background: #FFFFFF;
                    padding: 15px;
                    border-left: 4px solid #C5A572;
                    margin: 20px 0;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                    text-decoration: none;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #C5A572;
                    color: #1A1A1A;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>GigWheels</h1>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <p>Thank you for your interest in GigWheels! We have received your inquiry and our team is excited to help you find the perfect vehicle.</p>

                <div class="reference">
                    <strong>Reference Number:</strong> INQ-{inquiry_id:06d}
                </div>

                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>Our team will review your inquiry within 24 hours</li>
                    <li>We'll contact you via your preferred method</li>
                    <li>We'll discuss available vehicles that match your needs</li>
                    <li>We'll answer any questions you have about our weekly leasing program</li>
                </ul>

                <p>In the meantime, feel free to browse our fleet or learn more about how our weekly leasing works.</p>

                <center>
                    <a href="{settings.API_BASE_URL.replace('8000', '3000')}/fleet" class="cta-button">
                        View Our Fleet
                    </a>
                </center>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Dear {customer_name},

Thank you for your interest in GigWheels! We have received your inquiry and our team is excited to help you find the perfect vehicle.

Reference Number: INQ-{inquiry_id:06d}

What happens next?
- Our team will review your inquiry within 24 hours
- We'll contact you via your preferred method
- We'll discuss available vehicles that match your needs
- We'll answer any questions you have about our weekly leasing program

In the meantime, feel free to browse our fleet or learn more about how our weekly leasing works.

---
GigWheels - Weekly car rentals for gig drivers
Questions? Contact us at support@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Inquiry auto-response email sent to {to_email}, ID: {response.get('email_id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send inquiry auto-response email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_admin_notification(
        self,
        inquiry_id: int,
        customer_name: str,
        customer_email: str,
        vehicle_type: str,
        timeframe: str,
    ) -> dict:
        """
        Send notification to admin when a new inquiry is submitted.

        Args:
            inquiry_id: The inquiry ID
            customer_name: Customer's full name
            customer_email: Customer's email
            vehicle_type: Type of vehicle interested in
            timeframe: Timeline for leasing

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent admin notification for inquiry {inquiry_id}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        # Admin notification email - can be configured separately.
        # Defaults to the active backend's from-address (Proton SMTP or Resend).
        admin_email = self.from_email  # In production, use a separate admin email setting

        subject = f"New Inquiry Received - INQ-{inquiry_id:06d}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #1A1A1A;
                    color: #C5A572;
                    padding: 20px;
                    text-align: center;
                }}
                .content {{
                    background: #FFFFFF;
                    padding: 20px;
                    border: 1px solid #E5E5E5;
                }}
                .field {{
                    margin: 10px 0;
                    padding: 10px;
                    background: #F8F5F0;
                    border-radius: 4px;
                }}
                .label {{
                    font-weight: 600;
                    color: #666;
                    font-size: 12px;
                    text-transform: uppercase;
                }}
                .value {{
                    color: #1A1A1A;
                    font-size: 16px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>New Inquiry Received</h2>
            </div>
            <div class="content">
                <div class="field">
                    <div class="label">Reference</div>
                    <div class="value">INQ-{inquiry_id:06d}</div>
                </div>
                <div class="field">
                    <div class="label">Customer Name</div>
                    <div class="value">{customer_name}</div>
                </div>
                <div class="field">
                    <div class="label">Customer Email</div>
                    <div class="value">{customer_email}</div>
                </div>
                <div class="field">
                    <div class="label">Vehicle Interest</div>
                    <div class="value">{vehicle_type.replace('_', ' ').title()}</div>
                </div>
                <div class="field">
                    <div class="label">Timeframe</div>
                    <div class="value">{timeframe.replace('_', ' ').title()}</div>
                </div>
                <p><a href="{settings.API_BASE_URL}/admin/inquiries/{inquiry_id}">View Full Details in Admin Dashboard</a></p>
            </div>
        </body>
        </html>
        """

        try:
            params = {
                "from": self.from_email,
                "to": [admin_email],
                "subject": subject,
                "html": html_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Admin notification email sent for inquiry {inquiry_id}")

            return {
                "success": True,
                "message": "Admin notification sent",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send admin notification for inquiry {inquiry_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


    async def send_due_date_reminder(
        self,
        to_email: str,
        customer_name: str,
        invoice_number: str,
        amount: float,
        due_date: str,
        days_until_due: int,
    ) -> dict:
        """
        Send payment due date reminder email to customer.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            invoice_number: Invoice number for reference
            amount: Total amount due
            due_date: Formatted due date string
            days_until_due: Number of days until due date

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent due date reminder to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        urgency = "soon" if days_until_due > 1 else "tomorrow" if days_until_due == 1 else "today"
        subject = f"Payment Reminder - ${amount:.2f} Due {urgency.title()} - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #1A1A1A, #2D2D2D);
                    color: #C5A572;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .content {{
                    background: #F8F5F0;
                    padding: 30px;
                    border: 1px solid #E5E5E5;
                }}
                .highlight {{
                    color: #C5A572;
                    font-weight: 600;
                }}
                .amount-box {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #C5A572;
                    margin: 20px 0;
                    text-align: center;
                }}
                .amount {{
                    font-size: 32px;
                    font-weight: 700;
                    color: #1A1A1A;
                }}
                .due-date {{
                    font-size: 18px;
                    color: #666;
                    margin-top: 5px;
                }}
                .urgency {{
                    background: {'#FEF3C7' if days_until_due <= 1 else '#E7F5E9'};
                    color: {'#92400E' if days_until_due <= 1 else '#166534'};
                    padding: 10px 20px;
                    border-radius: 4px;
                    display: inline-block;
                    font-weight: 600;
                    margin: 10px 0;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                    text-decoration: none;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #C5A572;
                    color: #1A1A1A;
                    padding: 14px 35px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 20px;
                    font-size: 16px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #E5E5E5;
                }}
                .info-label {{
                    color: #666;
                }}
                .info-value {{
                    font-weight: 600;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Payment Reminder</h1>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <p>This is a friendly reminder that your weekly lease payment is coming due.</p>

                <div class="amount-box">
                    <div class="amount">${amount:.2f}</div>
                    <div class="due-date">Due: {due_date}</div>
                    <div class="urgency">{'⚠️ Due Tomorrow!' if days_until_due == 1 else '⏰ Due Today!' if days_until_due == 0 else f'📅 Due in {days_until_due} days'}</div>
                </div>

                <div style="margin: 20px 0;">
                    <div class="info-row">
                        <span class="info-label">Invoice Number</span>
                        <span class="info-value">{invoice_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Amount Due</span>
                        <span class="info-value">${amount:.2f}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Due Date</span>
                        <span class="info-value">{due_date}</span>
                    </div>
                </div>

                <p><strong>How to Pay:</strong></p>
                <ol>
                    <li>Make your payment via Zelle, CashApp, or cash</li>
                    <li>Log in to your GigWheels account</li>
                    <li>Upload your payment proof screenshot</li>
                    <li>We'll verify within 48 hours</li>
                </ol>

                <center>
                    <a href="{settings.API_BASE_URL.replace('8100', '3002')}/payments" class="cta-button">
                        Upload Payment Proof
                    </a>
                </center>

                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    <strong>Note:</strong> Late payments may incur a $25 late fee. To avoid additional charges, please ensure your payment proof is uploaded by the due date.
                </p>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Dear {customer_name},

This is a friendly reminder that your weekly lease payment is coming due.

PAYMENT DETAILS
---------------
Invoice Number: {invoice_number}
Amount Due: ${amount:.2f}
Due Date: {due_date}

{'⚠️ PAYMENT DUE TOMORROW!' if days_until_due == 1 else '⏰ PAYMENT DUE TODAY!' if days_until_due == 0 else f'Payment due in {days_until_due} days'}

HOW TO PAY:
1. Make your payment via Zelle, CashApp, or cash
2. Log in to your GigWheels account
3. Upload your payment proof screenshot
4. We'll verify within 48 hours

Upload your payment proof at: {settings.API_BASE_URL.replace('8100', '3002')}/payments

Note: Late payments may incur a $25 late fee. To avoid additional charges, please ensure your payment proof is uploaded by the due date.

---
GigWheels - Weekly car rentals for gig drivers
Questions? Contact us at support@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Due date reminder email sent to {to_email} for invoice {invoice_number}, ID: {response.get('email_id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send due date reminder email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_payment_verification_pending(
        self,
        to_email: str,
        customer_name: str,
        invoice_number: str,
        amount: float,
        uploaded_at: str,
    ) -> dict:
        """
        Send email confirming payment proof was received and is pending verification.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            invoice_number: Invoice number
            amount: Payment amount
            uploaded_at: When proof was uploaded

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent verification pending email to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = f"Payment Proof Received - {invoice_number} - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #1A1A1A, #2D2D2D);
                    color: #C5A572;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #F8F5F0;
                    padding: 30px;
                    border: 1px solid #E5E5E5;
                }}
                .highlight {{
                    color: #C5A572;
                    font-weight: 600;
                }}
                .status-box {{
                    background: #E7F5E9;
                    border: 1px solid #86EFAC;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .status-icon {{
                    font-size: 48px;
                }}
                .status-text {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #166534;
                }}
                .timeline {{
                    background: #FFFFFF;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }}
                .timeline-item {{
                    padding: 10px 0;
                    border-left: 2px solid #C5A572;
                    padding-left: 20px;
                    margin-left: 10px;
                    position: relative;
                }}
                .timeline-item::before {{
                    content: '';
                    width: 12px;
                    height: 12px;
                    background: #C5A572;
                    border-radius: 50%;
                    position: absolute;
                    left: -7px;
                    top: 14px;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Payment Proof Received</h1>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <div class="status-box">
                    <div class="status-icon">✅</div>
                    <div class="status-text">Payment Proof Uploaded Successfully</div>
                </div>

                <p>We've received your payment proof for invoice <strong>{invoice_number}</strong>.</p>

                <div class="timeline">
                    <h4 style="margin-top: 0;">What's Next?</h4>
                    <div class="timeline-item">
                        <strong>Received</strong> - {uploaded_at}
                    </div>
                    <div class="timeline-item">
                        <strong>Under Review</strong> - Our team will verify your payment within 48 hours
                    </div>
                    <div class="timeline-item">
                        <strong>Confirmation</strong> - You'll receive an email once verified
                    </div>
                </div>

                <div style="background: #FEF3C7; padding: 15px; border-radius: 4px; margin-top: 20px;">
                    <strong>⏱️ 48-Hour Verification Window</strong>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">
                        Our team reviews all payment proofs within 48 hours. You'll be notified via email and in-app notification once your payment has been verified.
                    </p>
                </div>

                <div style="margin-top: 20px;">
                    <strong>Payment Details:</strong>
                    <ul>
                        <li>Invoice: {invoice_number}</li>
                        <li>Amount: ${amount:.2f}</li>
                        <li>Uploaded: {uploaded_at}</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Dear {customer_name},

PAYMENT PROOF RECEIVED ✅

We've received your payment proof for invoice {invoice_number}.

WHAT'S NEXT?
------------
1. Received - {uploaded_at}
2. Under Review - Our team will verify your payment within 48 hours
3. Confirmation - You'll receive an email once verified

⏱️ 48-HOUR VERIFICATION WINDOW
Our team reviews all payment proofs within 48 hours. You'll be notified via email and in-app notification once your payment has been verified.

Payment Details:
- Invoice: {invoice_number}
- Amount: ${amount:.2f}
- Uploaded: {uploaded_at}

---
GigWheels - Weekly car rentals for gig drivers
Questions? Contact us at support@fxweeklylease.com
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Payment verification pending email sent to {to_email} for invoice {invoice_number}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send verification pending email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_escalation_notice(
        self,
        to_email: str,
        customer_name: str,
        case_number: str,
        amount_owed: float,
        late_fees: float,
        total_owed: float,
        days_delinquent: int,
        escalation_level: str,
    ) -> dict:
        """
        Send escalation notice email to customer for Day 2+ delinquency.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            case_number: Delinquency case number
            amount_owed: Original amount owed
            late_fees: Accumulated late fees
            total_owed: Total amount owed
            days_delinquent: Number of days delinquent
            escalation_level: Current escalation level

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent escalation notice to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        # Determine urgency based on escalation level
        is_final_warning = escalation_level in ['level_3', 'level_4', 'level_5']
        urgency_text = "FINAL WARNING" if is_final_warning else "URGENT"
        subject = f"{urgency_text}: Payment Escalation Notice - {case_number} - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: {'#DC2626' if is_final_warning else '#EA580C'};
                    color: #FFFFFF;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .header .subtitle {{
                    font-size: 14px;
                    opacity: 0.9;
                    margin-top: 5px;
                }}
                .content {{
                    background: #FEF2F2;
                    padding: 30px;
                    border: 1px solid #FCA5A5;
                }}
                .highlight {{
                    color: #DC2626;
                    font-weight: 600;
                }}
                .warning-box {{
                    background: #FFFFFF;
                    border: 2px solid #DC2626;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .warning-icon {{
                    font-size: 48px;
                }}
                .amount-box {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #DC2626;
                    margin: 20px 0;
                }}
                .amount-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #E5E5E5;
                }}
                .amount-row:last-child {{
                    border-bottom: none;
                    font-weight: bold;
                    font-size: 18px;
                    color: #DC2626;
                }}
                .consequences {{
                    background: #FEE2E2;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .consequences h4 {{
                    color: #DC2626;
                    margin-top: 0;
                }}
                .consequences ul {{
                    margin: 10px 0;
                    padding-left: 20px;
                }}
                .consequences li {{
                    margin: 8px 0;
                    color: #7F1D1D;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                    text-decoration: none;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #DC2626;
                    color: #FFFFFF;
                    padding: 14px 35px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 20px;
                    font-size: 16px;
                }}
                .cta-button:hover {{
                    background: #B91C1C;
                }}
                .contact-box {{
                    background: #FFFFFF;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{'⚠️ ' if is_final_warning else '📢 '}{urgency_text}: Payment Escalation</h1>
                <div class="subtitle">Case Reference: {case_number}</div>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <div class="warning-box">
                    <div class="warning-icon">{'🚨' if is_final_warning else '⚠️'}</div>
                    <h3 style="margin: 10px 0; color: #DC2626;">Your Account is {days_delinquent} Days Past Due</h3>
                    <p style="margin: 0; color: #7F1D1D;">Immediate action is required to avoid further consequences.</p>
                </div>

                <p>Your weekly lease payment is now <strong>{days_delinquent} days overdue</strong> and has been escalated to <strong>{escalation_level.replace('_', ' ').upper()}</strong> of our collections process.</p>

                <div class="amount-box">
                    <h4 style="margin-top: 0; color: #DC2626;">Amount Due</h4>
                    <div class="amount-row">
                        <span>Original Amount:</span>
                        <span>${amount_owed:.2f}</span>
                    </div>
                    <div class="amount-row">
                        <span>Late Fees:</span>
                        <span>${late_fees:.2f}</span>
                    </div>
                    <div class="amount-row">
                        <span>Total Due Now:</span>
                        <span>${total_owed:.2f}</span>
                    </div>
                </div>

                <div class="consequences">
                    <h4>{'⛔ Immediate Consequences if Not Resolved:' if is_final_warning else '⚠️ What Happens Next:'}</h4>
                    <ul>
                        <li>Additional late fees will continue to accrue</li>
                        {'<li><strong>Vehicle recovery may be initiated without further notice</strong></li>' if is_final_warning else '<li>Your account may be escalated to recovery status</li>'}
                        <li>Your account may be reported to collections</li>
                        <li>You may be permanently banned from our leasing program</li>
                        {'<li><strong>You may be responsible for all recovery costs</strong></li>' if is_final_warning else ''}
                    </ul>
                </div>

                <p><strong>To resolve this immediately:</strong></p>
                <ol>
                    <li>Make your full payment of <strong>${total_owed:.2f}</strong> via Zelle, CashApp, or cash</li>
                    <li>Upload your payment proof to your GigWheels account</li>
                    <li>Or contact us immediately to discuss payment arrangements</li>
                </ol>

                <center>
                    <a href="{settings.API_BASE_URL.replace('8100', '3002')}/payments" class="cta-button">
                        Upload Payment Proof Now
                    </a>
                </center>

                <div class="contact-box">
                    <p style="margin: 0;"><strong>Need to discuss payment options?</strong></p>
                    <p style="margin: 5px 0 0 0;">Contact us immediately at <a href="mailto:support@fxweeklylease.com" style="color: #DC2626;">support@fxweeklylease.com</a></p>
                </div>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>This is an automated message regarding your account status.</p>
                <p>Case Reference: {case_number}</p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
{urgency_text}: PAYMENT ESCALATION NOTICE

Case Reference: {case_number}

Dear {customer_name},

Your weekly lease payment is now {days_delinquent} DAYS PAST DUE.

Your account has been escalated to {escalation_level.replace('_', ' ').upper()} of our collections process.

AMOUNT DUE
----------
Original Amount: ${amount_owed:.2f}
Late Fees: ${late_fees:.2f}
TOTAL DUE NOW: ${total_owed:.2f}

{'⛔ IMMEDIATE CONSEQUENCES IF NOT RESOLVED:' if is_final_warning else '⚠️ WHAT HAPPENS NEXT:'}
- Additional late fees will continue to accrue
- {'Vehicle recovery may be initiated WITHOUT FURTHER NOTICE' if is_final_warning else 'Your account may be escalated to recovery status'}
- Your account may be reported to collections
- You may be permanently banned from our leasing program
{'- You may be responsible for all recovery costs' if is_final_warning else ''}

TO RESOLVE THIS IMMEDIATELY:
1. Make your full payment of ${total_owed:.2f} via Zelle, CashApp, or cash
2. Upload your payment proof to your GigWheels account
3. Or contact us immediately to discuss payment arrangements

Upload payment proof at: {settings.API_BASE_URL.replace('8100', '3002')}/payments

Need to discuss payment options?
Contact us immediately at support@fxweeklylease.com

---
GigWheels - Weekly car rentals for gig drivers
Case Reference: {case_number}
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Escalation notice email sent to {to_email} for case {case_number}, ID: {response.get('email_id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send escalation notice email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_late_payment_notice(
        self,
        to_email: str,
        customer_name: str,
        invoice_number: str,
        amount_owed: float,
        late_fee: float,
        total_owed: float,
        case_number: str,
    ) -> dict:
        """
        Send late payment notice email (Day 1) to customer.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            invoice_number: Invoice number
            amount_owed: Original amount owed
            late_fee: Late fee amount
            total_owed: Total amount owed
            case_number: Delinquency case number

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent late payment notice to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = f"Late Payment Notice - ${total_owed:.2f} Due Immediately - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #F59E0B;
                    color: #1A1A1A;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #FFFBEB;
                    padding: 30px;
                    border: 1px solid #FCD34D;
                }}
                .highlight {{
                    color: #D97706;
                    font-weight: 600;
                }}
                .amount-box {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #F59E0B;
                    margin: 20px 0;
                }}
                .amount-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #E5E5E5;
                }}
                .amount-row:last-child {{
                    border-bottom: none;
                    font-weight: bold;
                    font-size: 18px;
                    color: #D97706;
                }}
                .warning-box {{
                    background: #FEF3C7;
                    border: 1px solid #F59E0B;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #F59E0B;
                    color: #1A1A1A;
                    padding: 14px 35px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 20px;
                    font-size: 16px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚠️ Late Payment Notice</h1>
                <p style="margin: 5px 0 0 0;">Invoice: {invoice_number}</p>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <p>Your weekly lease payment is now <strong>past due</strong>. A late fee of <strong>${late_fee:.2f}</strong> has been added to your account.</p>

                <div class="amount-box">
                    <h4 style="margin-top: 0; color: #D97706;">Amount Due</h4>
                    <div class="amount-row">
                        <span>Original Amount:</span>
                        <span>${amount_owed:.2f}</span>
                    </div>
                    <div class="amount-row">
                        <span>Late Fee:</span>
                        <span>${late_fee:.2f}</span>
                    </div>
                    <div class="amount-row">
                        <span>Total Due Now:</span>
                        <span>${total_owed:.2f}</span>
                    </div>
                </div>

                <div class="warning-box">
                    <strong>⚠️ Important:</strong> If payment is not received within 24 hours, your account will be escalated and additional actions may be taken, including potential vehicle recovery.
                </div>

                <p>A delinquency case has been opened: <strong>{case_number}</strong></p>

                <p><strong>To avoid further action:</strong></p>
                <ol>
                    <li>Make your payment immediately via Zelle, CashApp, or cash</li>
                    <li>Upload your payment proof to your GigWheels account</li>
                </ol>

                <center>
                    <a href="{settings.API_BASE_URL.replace('8100', '3002')}/payments" class="cta-button">
                        Upload Payment Proof
                    </a>
                </center>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
LATE PAYMENT NOTICE

Invoice: {invoice_number}

Dear {customer_name},

Your weekly lease payment is now PAST DUE. A late fee of ${late_fee:.2f} has been added to your account.

AMOUNT DUE
----------
Original Amount: ${amount_owed:.2f}
Late Fee: ${late_fee:.2f}
TOTAL DUE NOW: ${total_owed:.2f}

⚠️ IMPORTANT: If payment is not received within 24 hours, your account will be escalated and additional actions may be taken, including potential vehicle recovery.

A delinquency case has been opened: {case_number}

TO AVOID FURTHER ACTION:
1. Make your payment immediately via Zelle, CashApp, or cash
2. Upload your payment proof to your GigWheels account

Upload payment proof at: {settings.API_BASE_URL.replace('8100', '3002')}/payments

---
GigWheels - Weekly car rentals for gig drivers
Questions? Contact us at support@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Late payment notice email sent to {to_email} for invoice {invoice_number}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send late payment notice email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


    async def send_lease_termination_notice(
        self,
        to_email: str,
        customer_name: str,
        vehicle_info: str,
        termination_reason: str,
        case_number: str,
        amount_owed: float,
        recovery_action_number: str,
    ) -> dict:
        """
        Send lease termination notice email to customer when recovery is initiated.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            vehicle_info: Vehicle description (e.g., "2022 BMW 330i")
            termination_reason: Reason for lease termination
            case_number: Delinquency case number
            amount_owed: Total amount owed at termination
            recovery_action_number: Recovery action number

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent lease termination notice to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = "IMPORTANT: Lease Termination Notice - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #DC2626;
                    color: #FFFFFF;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .content {{
                    background: #FEF2F2;
                    padding: 30px;
                    border: 1px solid #FECACA;
                }}
                .highlight {{
                    color: #DC2626;
                    font-weight: 600;
                }}
                .info-box {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #DC2626;
                    margin: 20px 0;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #E5E5E5;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .warning-box {{
                    background: #FEE2E2;
                    border: 2px solid #DC2626;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚠️ Lease Termination Notice</h1>
                <p style="margin: 5px 0 0 0;">Case: {case_number}</p>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <p>We regret to inform you that your vehicle lease has been <strong>terminated</strong> due to non-payment and failure to resolve your delinquency case.</p>

                <div class="info-box">
                    <h4 style="margin-top: 0; color: #DC2626;">Termination Details</h4>
                    <div class="info-row">
                        <span>Vehicle:</span>
                        <span><strong>{vehicle_info}</strong></span>
                    </div>
                    <div class="info-row">
                        <span>Case Number:</span>
                        <span>{case_number}</span>
                    </div>
                    <div class="info-row">
                        <span>Recovery Action:</span>
                        <span>{recovery_action_number}</span>
                    </div>
                    <div class="info-row">
                        <span>Outstanding Balance:</span>
                        <span style="color: #DC2626; font-weight: bold;">${amount_owed:.2f}</span>
                    </div>
                    <div class="info-row">
                        <span>Termination Reason:</span>
                        <span>{termination_reason}</span>
                    </div>
                </div>

                <div class="warning-box">
                    <strong>⚠️ VEHICLE RECOVERY IN PROGRESS</strong>
                    <p style="margin: 10px 0 0 0;">
                        Vehicle recovery has been authorized. A tow vendor will be dispatched to recover the vehicle.
                        Please ensure the vehicle is accessible and in the condition it was leased.
                    </p>
                </div>

                <p><strong>What This Means:</strong></p>
                <ul>
                    <li>Your lease agreement has been terminated effective immediately</li>
                    <li>Your account has been restricted from future vehicle requests</li>
                    <li>The outstanding balance of <strong>${amount_owed:.2f}</strong> remains your responsibility</li>
                    <li>A permanent restriction has been placed on your account</li>
                </ul>

                <p><strong>Your Rights:</strong></p>
                <p>If you believe this action was taken in error or wish to discuss this matter, please contact us immediately at the contact information below. All actions are logged for compliance purposes.</p>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>For urgent matters: <a href="mailto:legal@fxweeklylease.com">legal@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
LEASE TERMINATION NOTICE
========================

Case: {case_number}

Dear {customer_name},

We regret to inform you that your vehicle lease has been TERMINATED due to non-payment and failure to resolve your delinquency case.

TERMINATION DETAILS
-------------------
Vehicle: {vehicle_info}
Case Number: {case_number}
Recovery Action: {recovery_action_number}
Outstanding Balance: ${amount_owed:.2f}
Termination Reason: {termination_reason}

⚠️ VEHICLE RECOVERY IN PROGRESS ⚠️
Vehicle recovery has been authorized. A tow vendor will be dispatched to recover the vehicle.
Please ensure the vehicle is accessible and in the condition it was leased.

WHAT THIS MEANS:
- Your lease agreement has been terminated effective immediately
- Your account has been restricted from future vehicle requests
- The outstanding balance of ${amount_owed:.2f} remains your responsibility
- A permanent restriction has been placed on your account

YOUR RIGHTS:
If you believe this action was taken in error or wish to discuss this matter, please contact us immediately. All actions are logged for compliance purposes.

---
GigWheels - Weekly car rentals for gig drivers
For urgent matters: legal@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Lease termination notice email sent to {to_email} for case {case_number}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send lease termination notice email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


    async def send_ban_notice(
        self,
        to_email: str,
        customer_name: str,
        ban_number: str,
        ban_reason: str,
        case_number: str | None = None,
        amount_owed: float | None = None,
    ) -> dict:
        """
        Send permanent ban notice email to customer.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            ban_number: The ban record reference number
            ban_reason: Reason for the ban
            case_number: Optional delinquency case number
            amount_owed: Optional outstanding balance

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent ban notice to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = "IMPORTANT: Account Permanently Banned - GigWheels"

        # Amount section if there's outstanding balance
        amount_section = ""
        amount_text = ""
        if amount_owed and amount_owed > 0:
            amount_section = f"""
                <div style="background: #FDF0F0; padding: 15px; border-left: 4px solid #DC2626; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #DC2626; font-weight: 600; font-size: 16px;">
                        Outstanding Balance: ${amount_owed:.2f}
                    </p>
                    <p style="margin: 10px 0 0; color: #7F1D1D; font-size: 14px;">
                        This amount remains your responsibility and may be sent to collections if not resolved.
                    </p>
                </div>
            """
            amount_text = f"Outstanding Balance: ${amount_owed:.2f}\n"

        # Case number section if applicable
        case_section = ""
        case_text = ""
        if case_number:
            case_section = f"""
                <p style="margin: 10px 0; color: #4A4A4A;">
                    <strong>Case Reference:</strong> {case_number}
                </p>
            """
            case_text = f"Case Reference: {case_number}\n"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #7F1D1D, #991B1B);
                    color: #FFFFFF;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 22px;
                    font-weight: 600;
                }}
                .warning-icon {{
                    font-size: 48px;
                    margin-bottom: 15px;
                }}
                .content {{
                    background: #F8F5F0;
                    padding: 30px;
                    border: 1px solid #E5E5E5;
                }}
                .highlight {{
                    color: #DC2626;
                    font-weight: 600;
                }}
                .reference {{
                    background: #FFFFFF;
                    padding: 15px;
                    border-left: 4px solid #DC2626;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #1A1A1A;
                    color: #C5A572;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin-top: 20px;
                }}
                .footer {{
                    background: #2D2D2D;
                    color: #9CA3AF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .restrictions {{
                    background: #FEF2F2;
                    border: 1px solid #FECACA;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .restrictions li {{
                    margin: 10px 0;
                    color: #7F1D1D;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="warning-icon">&#9888;</div>
                <h1>Account Permanently Banned</h1>
            </div>

            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <p>
                    We regret to inform you that your GigWheels account has been
                    <strong class="highlight">permanently banned</strong> effective immediately.
                </p>

                <div class="reference">
                    <p style="margin: 0; color: #4A4A4A;">
                        <strong>Ban Reference:</strong> {ban_number}
                    </p>
                    {case_section}
                    <p style="margin: 10px 0 0; color: #4A4A4A;">
                        <strong>Reason:</strong> {ban_reason}
                    </p>
                </div>

                {amount_section}

                <div class="restrictions">
                    <h3 style="margin-top: 0; color: #7F1D1D;">Account Restrictions</h3>
                    <p>As a result of this ban, you are <strong>permanently prohibited</strong> from:</p>
                    <ul>
                        <li>Requesting or leasing any vehicles from GigWheels</li>
                        <li>Creating new lease agreements with our company</li>
                        <li>Submitting new inquiries or applications</li>
                        <li>Accessing vehicle-related services</li>
                    </ul>
                </div>

                <p style="color: #4A4A4A;">
                    <strong>Note:</strong> You may still access your account to view:
                </p>
                <ul style="color: #6B7280;">
                    <li>Historical invoices and payment records</li>
                    <li>Past notifications and correspondence</li>
                    <li>Your profile information (read-only)</li>
                </ul>

                <p style="background: #FFF7ED; padding: 15px; border-radius: 6px; border-left: 4px solid #F59E0B;">
                    <strong style="color: #92400E;">Questions or Concerns?</strong><br>
                    If you believe this action was taken in error, you may submit a formal appeal
                    within 30 days by contacting our legal department. All ban decisions are
                    logged and subject to review.
                </p>

                <a href="mailto:legal@fxweeklylease.com" class="cta-button">
                    Contact Legal Department
                </a>
            </div>

            <div class="footer">
                <p style="margin: 0;">
                    GigWheels - Weekly car rentals for gig drivers<br>
                    This email was sent regarding ban reference {ban_number}<br>
                    © 2026 GigWheels. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
IMPORTANT: Account Permanently Banned - GigWheels

Ban Reference: {ban_number}
{case_text}
Dear {customer_name},

We regret to inform you that your GigWheels account has been PERMANENTLY BANNED effective immediately.

REASON FOR BAN:
{ban_reason}

{amount_text}
ACCOUNT RESTRICTIONS:
As a result of this ban, you are permanently prohibited from:
- Requesting or leasing any vehicles from GigWheels
- Creating new lease agreements with our company
- Submitting new inquiries or applications
- Accessing vehicle-related services

WHAT YOU CAN STILL ACCESS:
- Historical invoices and payment records
- Past notifications and correspondence
- Your profile information (read-only)

QUESTIONS OR CONCERNS:
If you believe this action was taken in error, you may submit a formal appeal within 30 days by contacting our legal department at legal@fxweeklylease.com.

All ban decisions are logged and subject to review.

---
GigWheels - Weekly car rentals for gig drivers
For urgent matters: legal@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Ban notice email sent to {to_email} for ban {ban_number}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send ban notice email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_welcome_email(
        self,
        to_email: str,
        customer_name: str,
    ) -> dict:
        """
        Send welcome email to new customers after registration.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent welcome email to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = "Welcome to GigWheels! 🚗"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #1A1A1A, #2D2D2D);
                    color: #C5A572;
                    padding: 40px 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header .subtitle {{
                    color: #FFFFFF;
                    margin-top: 10px;
                    font-size: 16px;
                }}
                .content {{
                    background: #F8F5F0;
                    padding: 30px;
                    border: 1px solid #E5E5E5;
                }}
                .highlight {{
                    color: #C5A572;
                    font-weight: 600;
                }}
                .welcome-box {{
                    background: #FFFFFF;
                    padding: 25px;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: center;
                    border: 1px solid #E5E5E5;
                }}
                .welcome-icon {{
                    font-size: 48px;
                    margin-bottom: 15px;
                }}
                .steps {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #C5A572;
                    margin: 20px 0;
                }}
                .step {{
                    display: flex;
                    align-items: flex-start;
                    margin: 15px 0;
                }}
                .step-number {{
                    background: #C5A572;
                    color: #1A1A1A;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-right: 15px;
                    flex-shrink: 0;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                    text-decoration: none;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #C5A572;
                    color: #1A1A1A;
                    padding: 14px 35px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 20px;
                    font-size: 16px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Welcome to GigWheels!</h1>
                <div class="subtitle">Weekly car rentals for gig drivers</div>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <div class="welcome-box">
                    <div class="welcome-icon">🎉</div>
                    <h2 style="margin: 0; color: #1A1A1A;">Your Account is Ready!</h2>
                    <p style="color: #666; margin: 10px 0 0 0;">
                        Thank you for joining GigWheels. We're excited to help you find your perfect vehicle.
                    </p>
                </div>

                <div class="steps">
                    <h3 style="margin-top: 0; color: #1A1A1A;">Getting Started</h3>
                    <div class="step">
                        <span class="step-number">1</span>
                        <div>
                            <strong>Complete Your Profile</strong><br>
                            <span style="color: #666;">Add your contact information and preferences</span>
                        </div>
                    </div>
                    <div class="step">
                        <span class="step-number">2</span>
                        <div>
                            <strong>Upload Insurance</strong><br>
                            <span style="color: #666;">Submit your valid auto insurance for verification</span>
                        </div>
                    </div>
                    <div class="step">
                        <span class="step-number">3</span>
                        <div>
                            <strong>Request a Vehicle</strong><br>
                            <span style="color: #666;">Browse our fleet and submit your vehicle request</span>
                        </div>
                    </div>
                    <div class="step">
                        <span class="step-number">4</span>
                        <div>
                            <strong>Drive Away</strong><br>
                            <span style="color: #666;">Once approved, pick up your vehicle and enjoy!</span>
                        </div>
                    </div>
                </div>

                <p><strong>Why GigWheels?</strong></p>
                <ul>
                    <li><strong>Flexible Weekly Payments</strong> - Starting from just $150/week</li>
                    <li><strong>No Long-Term Commitment</strong> - Week-to-week flexibility</li>
                    <li><strong>Premium Vehicles</strong> - Quality, well-maintained fleet</li>
                    <li><strong>Simple Process</strong> - Quick approval and pickup</li>
                </ul>

                <center>
                    <a href="{settings.API_BASE_URL.replace('8100', '3002')}/dashboard" class="cta-button">
                        Go to Your Dashboard
                    </a>
                </center>

                <p style="margin-top: 25px; color: #666; font-size: 14px;">
                    <strong>Need help?</strong> Our support team is here for you. Contact us at
                    <a href="mailto:support@fxweeklylease.com" style="color: #C5A572;">support@fxweeklylease.com</a>
                </p>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
WELCOME TO GIGWHEELS! 🎉

Dear {customer_name},

Your account is ready! Thank you for joining GigWheels. We're excited to help you find your perfect vehicle.

GETTING STARTED
---------------
1. Complete Your Profile - Add your contact information and preferences
2. Upload Insurance - Submit your valid auto insurance for verification
3. Request a Vehicle - Browse our fleet and submit your vehicle request
4. Drive Away - Once approved, pick up your vehicle and enjoy!

WHY GIGWHEELS?
- Flexible Weekly Payments - Starting from just $150/week
- No Long-Term Commitment - Week-to-week flexibility
- Premium Vehicles - Quality, well-maintained fleet
- Simple Process - Quick approval and pickup

Visit your dashboard: {settings.API_BASE_URL.replace('8100', '3002')}/dashboard

Need help? Contact us at support@fxweeklylease.com

---
GigWheels - Weekly car rentals for gig drivers
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Welcome email sent to {to_email}, ID: {response.get('email_id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_payment_approved_email(
        self,
        to_email: str,
        customer_name: str,
        invoice_number: str,
        amount: float,
        payment_date: str,
        next_due_date: str | None = None,
    ) -> dict:
        """
        Send payment approval email to customer when admin approves their payment.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            invoice_number: Invoice number
            amount: Payment amount that was approved
            payment_date: Date payment was verified
            next_due_date: Optional next payment due date

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent payment approved email to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = f"Payment Approved - ${amount:.2f} - GigWheels"

        next_due_section = ""
        next_due_text = ""
        if next_due_date:
            next_due_section = f"""
                <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <strong style="color: #92400E;">📅 Next Payment Due: {next_due_date}</strong>
                    <p style="margin: 5px 0 0; color: #78350F; font-size: 14px;">
                        Make sure to upload your next payment proof before the due date to avoid late fees.
                    </p>
                </div>
            """
            next_due_text = f"\n📅 NEXT PAYMENT DUE: {next_due_date}\nMake sure to upload your next payment proof before the due date to avoid late fees.\n"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #166534, #15803D);
                    color: #FFFFFF;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .content {{
                    background: #F0FDF4;
                    padding: 30px;
                    border: 1px solid #86EFAC;
                }}
                .highlight {{
                    color: #166534;
                    font-weight: 600;
                }}
                .success-box {{
                    background: #FFFFFF;
                    border: 2px solid #22C55E;
                    border-radius: 8px;
                    padding: 25px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .success-icon {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
                .amount {{
                    font-size: 32px;
                    font-weight: 700;
                    color: #166534;
                }}
                .details-box {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #22C55E;
                    margin: 20px 0;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #E5E5E5;
                }}
                .detail-row:last-child {{
                    border-bottom: none;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                    text-decoration: none;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>✅ Payment Approved</h1>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <div class="success-box">
                    <div class="success-icon">✅</div>
                    <h3 style="margin: 0; color: #166534;">Payment Verified Successfully!</h3>
                    <div class="amount">${amount:.2f}</div>
                    <p style="margin: 10px 0 0 0; color: #666;">Invoice {invoice_number}</p>
                </div>

                <p>Great news! Your payment has been verified and approved. Thank you for your continued trust in GigWheels.</p>

                <div class="details-box">
                    <h4 style="margin-top: 0; color: #166534;">Payment Details</h4>
                    <div class="detail-row">
                        <span>Invoice Number:</span>
                        <span><strong>{invoice_number}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span>Amount Paid:</span>
                        <span><strong>${amount:.2f}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span>Verification Date:</span>
                        <span>{payment_date}</span>
                    </div>
                    <div class="detail-row">
                        <span>Status:</span>
                        <span style="color: #166534; font-weight: bold;">✅ Paid</span>
                    </div>
                </div>

                {next_due_section}

                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    You can view your complete payment history in your
                    <a href="{settings.API_BASE_URL.replace('8100', '3002')}/dashboard" style="color: #166534;">dashboard</a>.
                </p>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
PAYMENT APPROVED ✅

Dear {customer_name},

Great news! Your payment has been verified and approved.

PAYMENT DETAILS
---------------
Invoice Number: {invoice_number}
Amount Paid: ${amount:.2f}
Verification Date: {payment_date}
Status: ✅ Paid
{next_due_text}
Thank you for your continued trust in GigWheels.

View your payment history at: {settings.API_BASE_URL.replace('8100', '3002')}/dashboard

---
GigWheels - Weekly car rentals for gig drivers
Questions? Contact us at support@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Payment approved email sent to {to_email} for invoice {invoice_number}, ID: {response.get('email_id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send payment approved email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    async def send_payment_rejected_email(
        self,
        to_email: str,
        customer_name: str,
        invoice_number: str,
        amount: float,
        rejection_reason: str,
    ) -> dict:
        """
        Send payment rejection email to customer when admin rejects their payment.

        Args:
            to_email: Customer's email address
            customer_name: Customer's full name
            invoice_number: Invoice number
            amount: Payment amount that was rejected
            rejection_reason: Reason for rejection

        Returns:
            dict with success status and message/error
        """
        if not self.enabled:
            logger.info(f"Email service disabled - would have sent payment rejected email to {to_email}")
            return {
                "success": True,
                "message": "Email service disabled - email not sent",
                "simulated": True
            }

        subject = f"Payment Requires Attention - {invoice_number} - GigWheels"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #DC2626, #EF4444);
                    color: #FFFFFF;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .content {{
                    background: #FEF2F2;
                    padding: 30px;
                    border: 1px solid #FECACA;
                }}
                .highlight {{
                    color: #DC2626;
                    font-weight: 600;
                }}
                .rejected-box {{
                    background: #FFFFFF;
                    border: 2px solid #DC2626;
                    border-radius: 8px;
                    padding: 25px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .rejected-icon {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
                .reason-box {{
                    background: #FEE2E2;
                    padding: 20px;
                    border-left: 4px solid #DC2626;
                    margin: 20px 0;
                    border-radius: 0 8px 8px 0;
                }}
                .details-box {{
                    background: #FFFFFF;
                    padding: 20px;
                    border-left: 4px solid #F59E0B;
                    margin: 20px 0;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #E5E5E5;
                }}
                .detail-row:last-child {{
                    border-bottom: none;
                }}
                .footer {{
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    border-radius: 0 0 8px 8px;
                }}
                .footer a {{
                    color: #C5A572;
                    text-decoration: none;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #DC2626;
                    color: #FFFFFF;
                    padding: 14px 35px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 20px;
                    font-size: 16px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>❌ Payment Requires Attention</h1>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <div class="rejected-box">
                    <div class="rejected-icon">❌</div>
                    <h3 style="margin: 0; color: #DC2626;">Payment Proof Rejected</h3>
                    <p style="margin: 10px 0 0 0; color: #666;">Invoice {invoice_number} - ${amount:.2f}</p>
                </div>

                <p>Unfortunately, we were unable to verify your payment proof for invoice <strong>{invoice_number}</strong>. Please review the reason below and submit a new payment proof.</p>

                <div class="reason-box">
                    <h4 style="margin-top: 0; color: #DC2626;">Rejection Reason</h4>
                    <p style="margin: 0; color: #7F1D1D;">{rejection_reason}</p>
                </div>

                <div class="details-box">
                    <h4 style="margin-top: 0; color: #92400E;">Invoice Details</h4>
                    <div class="detail-row">
                        <span>Invoice Number:</span>
                        <span><strong>{invoice_number}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span>Amount Due:</span>
                        <span><strong>${amount:.2f}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span>Status:</span>
                        <span style="color: #DC2626; font-weight: bold;">❌ Rejected</span>
                    </div>
                </div>

                <p><strong>What to do next:</strong></p>
                <ol>
                    <li>Review the rejection reason above</li>
                    <li>Make sure your payment proof clearly shows the amount, date, and recipient</li>
                    <li>Upload a new, clear payment proof screenshot</li>
                    <li>Our team will review within 48 hours</li>
                </ol>

                <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <strong style="color: #92400E;">⚠️ Important</strong>
                    <p style="margin: 5px 0 0; color: #78350F; font-size: 14px;">
                        Please submit your corrected payment proof as soon as possible to avoid late fees.
                        If you believe this rejection was made in error, please contact our support team.
                    </p>
                </div>

                <center>
                    <a href="{settings.API_BASE_URL.replace('8100', '3002')}/payments" class="cta-button">
                        Upload New Payment Proof
                    </a>
                </center>
            </div>
            <div class="footer">
                <p>GigWheels - Weekly car rentals for gig drivers</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 GigWheels. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
PAYMENT REQUIRES ATTENTION ❌

Dear {customer_name},

Unfortunately, we were unable to verify your payment proof for invoice {invoice_number}.

REJECTION REASON
----------------
{rejection_reason}

INVOICE DETAILS
---------------
Invoice Number: {invoice_number}
Amount Due: ${amount:.2f}
Status: ❌ Rejected

WHAT TO DO NEXT:
1. Review the rejection reason above
2. Make sure your payment proof clearly shows the amount, date, and recipient
3. Upload a new, clear payment proof screenshot
4. Our team will review within 48 hours

⚠️ IMPORTANT: Please submit your corrected payment proof as soon as possible to avoid late fees.
If you believe this rejection was made in error, please contact our support team.

Upload new payment proof at: {settings.API_BASE_URL.replace('8100', '3002')}/payments

---
GigWheels - Weekly car rentals for gig drivers
Questions? Contact us at support@fxweeklylease.com
© 2026 GigWheels. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = await self._dispatch(params)

            logger.info(f"Payment rejected email sent to {to_email} for invoice {invoice_number}, ID: {response.get('email_id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("email_id"),
            }

        except Exception as e:
            logger.error(f"Failed to send payment rejected email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


# Singleton instance
email_service = EmailService()
