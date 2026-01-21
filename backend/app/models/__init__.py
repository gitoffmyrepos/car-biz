# SQLAlchemy database models

from app.models.inquiry import (
    Inquiry,
    InquiryStatus,
    PreferredContactMethod,
    Timeframe,
    VehicleType,
)
from app.models.customer_profile import (
    CustomerProfile,
    InsuranceStatus,
)
from app.models.audit_log import (
    AuditLog,
    AuditAction,
)
from app.models.vehicle_request import (
    VehicleRequest,
    VehicleRequestStatus,
    VehiclePreference,
)
from app.models.lease import (
    Lease,
    LeaseStatus,
)
from app.models.notification import (
    Notification,
    NotificationType,
    NotificationPriority,
)
from app.models.incident_report import (
    IncidentReport,
    IncidentType,
    IncidentSeverity,
    IncidentStatus,
)
from app.models.weekly_invoice import (
    WeeklyInvoice,
    InvoiceStatus,
)
from app.models.vehicle import (
    Vehicle,
    VehicleStatus,
    VehicleCondition,
)

__all__ = [
    "Inquiry",
    "InquiryStatus",
    "PreferredContactMethod",
    "Timeframe",
    "VehicleType",
    "CustomerProfile",
    "InsuranceStatus",
    "AuditLog",
    "AuditAction",
    "VehicleRequest",
    "VehicleRequestStatus",
    "VehiclePreference",
    "Lease",
    "LeaseStatus",
    "Notification",
    "NotificationType",
    "NotificationPriority",
    "IncidentReport",
    "IncidentType",
    "IncidentSeverity",
    "IncidentStatus",
    "WeeklyInvoice",
    "InvoiceStatus",
    "Vehicle",
    "VehicleStatus",
    "VehicleCondition",
]
