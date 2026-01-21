"""
Weekly Vehicle Leasing Platform - Email Service
Salvage-to-Lux Fleet Management

Email service using Resend for sending transactional emails.
"""

import logging
from typing import Optional

import resend

from app.core.config import settings


logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending transactional emails via Resend."""

    def __init__(self):
        """Initialize the Resend client."""
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM_EMAIL
        self.enabled = bool(self.api_key)

        if self.enabled:
            resend.api_key = self.api_key
            logger.info("Email service initialized with Resend")
        else:
            logger.warning("Email service disabled - RESEND_API_KEY not configured")

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

        subject = "Thank You for Your Inquiry - FX Weekly Lease"

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
                <h1>FX Weekly Lease</h1>
            </div>
            <div class="content">
                <p>Dear <span class="highlight">{customer_name}</span>,</p>

                <p>Thank you for your interest in FX Weekly Lease! We have received your inquiry and our team is excited to help you find the perfect vehicle.</p>

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
                <p>FX Weekly Lease - Premium Weekly Vehicle Leasing</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 FX Weekly Lease. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
Dear {customer_name},

Thank you for your interest in FX Weekly Lease! We have received your inquiry and our team is excited to help you find the perfect vehicle.

Reference Number: INQ-{inquiry_id:06d}

What happens next?
- Our team will review your inquiry within 24 hours
- We'll contact you via your preferred method
- We'll discuss available vehicles that match your needs
- We'll answer any questions you have about our weekly leasing program

In the meantime, feel free to browse our fleet or learn more about how our weekly leasing works.

---
FX Weekly Lease - Premium Weekly Vehicle Leasing
Questions? Contact us at support@fxweeklylease.com
© 2026 FX Weekly Lease. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = resend.Emails.send(params)

            logger.info(f"Inquiry auto-response email sent to {to_email}, ID: {response.get('id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("id"),
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

        # Admin notification email - can be configured separately
        admin_email = settings.RESEND_FROM_EMAIL  # In production, use a separate admin email setting

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

            response = resend.Emails.send(params)

            logger.info(f"Admin notification email sent for inquiry {inquiry_id}")

            return {
                "success": True,
                "message": "Admin notification sent",
                "email_id": response.get("id"),
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
        subject = f"Payment Reminder - ${amount:.2f} Due {urgency.title()} - FX Weekly Lease"

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
                    <li>Log in to your FX Weekly account</li>
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
                <p>FX Weekly Lease - Premium Weekly Vehicle Leasing</p>
                <p>Questions? Contact us at <a href="mailto:support@fxweeklylease.com">support@fxweeklylease.com</a></p>
                <p>© 2026 FX Weekly Lease. All rights reserved.</p>
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
2. Log in to your FX Weekly account
3. Upload your payment proof screenshot
4. We'll verify within 48 hours

Upload your payment proof at: {settings.API_BASE_URL.replace('8100', '3002')}/payments

Note: Late payments may incur a $25 late fee. To avoid additional charges, please ensure your payment proof is uploaded by the due date.

---
FX Weekly Lease - Premium Weekly Vehicle Leasing
Questions? Contact us at support@fxweeklylease.com
© 2026 FX Weekly Lease. All rights reserved.
        """

        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }

            response = resend.Emails.send(params)

            logger.info(f"Due date reminder email sent to {to_email} for invoice {invoice_number}, ID: {response.get('id', 'unknown')}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("id"),
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

        subject = f"Payment Proof Received - {invoice_number} - FX Weekly Lease"

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
                <p>FX Weekly Lease - Premium Weekly Vehicle Leasing</p>
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
FX Weekly Lease - Premium Weekly Vehicle Leasing
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

            response = resend.Emails.send(params)

            logger.info(f"Payment verification pending email sent to {to_email} for invoice {invoice_number}")

            return {
                "success": True,
                "message": "Email sent successfully",
                "email_id": response.get("id"),
            }

        except Exception as e:
            logger.error(f"Failed to send verification pending email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }


# Singleton instance
email_service = EmailService()
