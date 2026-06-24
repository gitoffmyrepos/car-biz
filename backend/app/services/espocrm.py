"""
GigWheels - EspoCRM sync

Pushes waitlist signups into EspoCRM (gigwheels-crm) as Leads so the team can
reach out at launch. Configured via env:
  ESPOCRM_URL      e.g. http://espocrm.gigwheels-crm.svc.cluster.local
  ESPOCRM_API_KEY  API key of an EspoCRM API User (Administration -> API Users)

If either is unset the sync is a no-op (the signup is still stored locally), so
the waitlist works before the CRM key is wired.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

ESPOCRM_URL = os.environ.get("ESPOCRM_URL", "").rstrip("/")
ESPOCRM_API_KEY = os.environ.get("ESPOCRM_API_KEY", "")

_CATEGORY_LABELS = {
    "ride_sharing": "Ride-sharing",
    "food_delivery": "Food delivery",
    "package_delivery": "Package/courier delivery",
    "grocery_delivery": "Grocery delivery",
    "other": "Other",
}


def is_configured() -> bool:
    return bool(ESPOCRM_URL and ESPOCRM_API_KEY)


def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split(None, 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return (parts[0] if parts else "Lead"), "(GigWheels)"


def _description(entry) -> str:
    lines = [f"GigWheels waitlist — {entry.role.value.upper()}"]
    if entry.city:
        lines.append(f"City: {entry.city}")
    if entry.role.value == "owner":
        _vparts = [entry.vehicle_year, entry.vehicle_make, entry.vehicle_model]
        car = " ".join(str(p) for p in _vparts if p)
        if car:
            lines.append(f"Vehicle: {car}" + (f" x{entry.vehicle_count}" if entry.vehicle_count else ""))
        if entry.vehicle_type:
            lines.append(f"Type: {entry.vehicle_type}")
        cats = [str(_CATEGORY_LABELS.get(c, c)) for c in (entry.business_categories or [])]
        if cats:
            lines.append("Wants car used for: " + ", ".join(cats))
    if entry.notes:
        lines.append(f"Notes: {entry.notes}")
    return "\n".join(lines)


async def push_lead(entry) -> str | None:
    """Create an EspoCRM Lead from a WaitlistEntry. Returns the lead id, or None."""
    if not is_configured():
        logger.info("EspoCRM not configured; skipping CRM sync for waitlist %s", entry.id)
        return None
    first, last = _split_name(entry.full_name)
    payload = {
        "firstName": first,
        "lastName": last,
        "emailAddress": entry.email,
        "phoneNumber": entry.phone or "",
        "source": "Web Site",
        "description": _description(entry),
        # EspoCRM Lead has no native 'role'; tag via title for quick filtering
        "title": f"Waitlist {entry.role.value}",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{ESPOCRM_URL}/api/v1/Lead",
                json=payload,
                headers={"X-Api-Key": ESPOCRM_API_KEY, "Content-Type": "application/json"},
            )
        if r.status_code in (200, 201):
            return r.json().get("id")
        logger.error("EspoCRM lead create failed %s: %s", r.status_code, r.text[:300])
    except Exception as exc:  # network/CRM down — don't lose the signup
        logger.error("EspoCRM sync error for waitlist %s: %s", entry.id, exc)
    return None
