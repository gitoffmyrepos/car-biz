-- Create incident_reports table for customer incident tracking
-- Part of Feature #33: Customer incident report submission

-- Create enum types for incident report fields
DO $$ BEGIN
    CREATE TYPE incident_type AS ENUM (
        'accident',
        'breakdown',
        'theft',
        'vandalism',
        'flat_tire',
        'lockout',
        'warning_light',
        'body_damage',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'submitted',
        'under_review',
        'in_progress',
        'resolved',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the incident_reports table
CREATE TABLE IF NOT EXISTS incident_reports (
    id SERIAL PRIMARY KEY,

    -- Customer reference
    customer_profile_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

    -- Lease reference (which lease the incident is for)
    lease_id INTEGER REFERENCES leases(id) ON DELETE SET NULL,

    -- Customer info (denormalized for quick access)
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),

    -- Incident details
    incident_type incident_type NOT NULL,
    severity incident_severity NOT NULL DEFAULT 'medium',
    status incident_status NOT NULL DEFAULT 'submitted',

    -- Incident description
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Location (optional)
    location VARCHAR(500),

    -- Date/time of incident
    incident_date TIMESTAMPTZ NOT NULL,

    -- Photos stored in MinIO (list of storage keys as JSON)
    photo_keys JSONB DEFAULT '[]'::jsonb,

    -- Admin handling
    assigned_to VARCHAR(255),  -- Admin keycloak_id
    admin_notes TEXT,
    resolution_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_incident_reports_customer_profile_id ON incident_reports(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_lease_id ON incident_reports(lease_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_incident_type ON incident_reports(incident_type);
CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at ON incident_reports(created_at DESC);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_incident_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_incident_reports_updated_at ON incident_reports;
CREATE TRIGGER trigger_incident_reports_updated_at
    BEFORE UPDATE ON incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_reports_updated_at();

-- Grant permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE ON incident_reports TO fx_weekly_lease_app;
-- GRANT USAGE, SELECT ON SEQUENCE incident_reports_id_seq TO fx_weekly_lease_app;

COMMENT ON TABLE incident_reports IS 'Customer incident reports for vehicle issues during lease periods';
COMMENT ON COLUMN incident_reports.photo_keys IS 'JSON array of MinIO storage keys for incident photos';
COMMENT ON COLUMN incident_reports.assigned_to IS 'Keycloak ID of admin assigned to handle this incident';
