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


# Singleton instance
email_service = EmailService()
