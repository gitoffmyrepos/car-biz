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
from app.models.vehicle_condition_report import (
    VehicleConditionReport,
    ConditionReportType,
    OverallCondition,
)
from app.models.tracker_device import (
    TrackerDevice,
    TrackerStatus,
)
from app.models.maintenance_schedule import (
    MaintenanceSchedule,
    MaintenanceType,
    MaintenanceStatus,
    MaintenancePriority,
)
from app.models.delinquency_case import (
    DelinquencyCase,
    DelinquencyStatus,
    EscalationLevel,
)
from app.models.system_settings import (
    SystemSettings,
    SettingCategory,
    DEFAULT_SETTINGS,
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
    "VehicleConditionReport",
    "ConditionReportType",
    "OverallCondition",
    "TrackerDevice",
    "TrackerStatus",
    "MaintenanceSchedule",
    "MaintenanceType",
    "MaintenanceStatus",
    "MaintenancePriority",
    "DelinquencyCase",
    "DelinquencyStatus",
    "EscalationLevel",
    "SystemSettings",
    "SettingCategory",
    "DEFAULT_SETTINGS",
]
