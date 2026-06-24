"""
GigWheels - Waitlist dispatch

On a new waitlist signup we want to (1) thank the person by email and (2) create
a CRM lead. n8n is the integration hub: the backend fires ONE webhook with the
signup payload and the n8n workflow sends the thank-you email + creates the
EspoCRM lead (and anything else marketing wants).

Env:
  N8N_WAITLIST_WEBHOOK_URL   n8n Webhook node URL for the waitlist workflow

Fallback: if the n8n webhook is not configured, the backend sends the thank-you
email directly (email_service) and pushes the EspoCRM lead directly (espocrm),
so signups are never dropped before n8n is wired.
"""

import logging
import os

import httpx

from app.services import espocrm

logger = logging.getLogger(__name__)

N8N_WAITLIST_WEBHOOK_URL = os.environ.get("N8N_WAITLIST_WEBHOOK_URL", "")

_CATEGORY_LABELS = {
    "ride_sharing": "Ride-sharing",
    "food_delivery": "Food delivery",
    "package_delivery": "Package/courier delivery",
    "grocery_delivery": "Grocery delivery",
    "other": "Other",
}


def _payload(entry) -> dict:
    """Flat JSON payload for n8n (email + CRM both read from this)."""
    return {
        "id": entry.id,
        "role": entry.role.value,
        "full_name": entry.full_name,
        "first_name": (entry.full_name or "").split(None, 1)[0],
        "email": entry.email,
        "phone": entry.phone or "",
        "city": entry.city or "",
        "vehicle_make": entry.vehicle_make or "",
        "vehicle_model": entry.vehicle_model or "",
        "vehicle_year": entry.vehicle_year or "",
        "vehicle_count": entry.vehicle_count or "",
        "vehicle_type": entry.vehicle_type or "",
        "business_categories": entry.business_categories or [],
        "business_categories_label": ", ".join(
            str(_CATEGORY_LABELS.get(c, c)) for c in (entry.business_categories or [])
        ),
        "notes": entry.notes or "",
        "created_at": entry.created_at.isoformat() if entry.created_at else "",
    }


def welcome_email_html(entry) -> tuple[str, str]:
    """Thank-you email (subject, html). Used by the direct fallback; mirrors the
    n8n template so both paths look identical."""
    first = (entry.full_name or "there").split(None, 1)[0]
    role = entry.role.value
    if role == "owner":
        intro = ("Thanks for putting your car forward. You're on the GigWheels owner "
                 "waitlist — when we launch in your area we'll reach out to get your "
                 "vehicle earning passive income.")
        cats = ", ".join(str(_CATEGORY_LABELS.get(c, c)) for c in (entry.business_categories or []))
        extra = f"<p>You told us you'd let your car be used for: <b>{cats}</b>.</p>" if cats else ""
    else:
        intro = ("Thanks for joining the GigWheels driver waitlist. As soon as cars are "
                 "ready in your area, we'll contact you to get you verified and on the road.")
        extra = ""
    subject = "You're on the GigWheels waitlist 🚗"
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="background:#111;padding:24px;text-align:center">
    <span style="color:#E11D2A;font-size:24px;font-weight:bold">Gig</span><span style="color:#fff;font-size:24px;font-weight:bold">Wheels</span>
  </div>
  <div style="padding:28px 24px">
    <h2 style="margin:0 0 12px">Hi {first}, you're in! 🎉</h2>
    <p style="line-height:1.6">{intro}</p>
    {extra}
    <p style="line-height:1.6">We'll email and text you at launch. No spam, just your spot.</p>
    <p style="margin-top:24px;color:#666;font-size:13px">— The GigWheels Team · Ask for Kelvin</p>
  </div>
</div>"""
    return subject, html


async def dispatch(entry) -> None:
    """Fire the n8n workflow, or fall back to direct email + CRM."""
    if N8N_WAITLIST_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(N8N_WAITLIST_WEBHOOK_URL, json=_payload(entry))
            if r.status_code < 300:
                logger.info("waitlist %s dispatched to n8n", entry.id)
                return
            logger.error("n8n webhook %s: %s", r.status_code, r.text[:200])
        except Exception as exc:
            logger.error("n8n webhook error for waitlist %s: %s", entry.id, exc)
        # fall through to direct path if n8n failed

    # Direct fallback: thank-you email + CRM lead
    try:
        subject, html = welcome_email_html(entry)
        from app.services.email import email_service
        send = getattr(email_service, "send_email", None) or getattr(email_service, "send", None)
        if send:
            await send(to=entry.email, subject=subject, html=html)
    except Exception as exc:
        logger.error("waitlist welcome email failed for %s: %s", entry.id, exc)
    try:
        await espocrm.push_lead(entry)
    except Exception as exc:
        logger.error("waitlist CRM push failed for %s: %s", entry.id, exc)
