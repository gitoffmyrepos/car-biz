-- Migration: Create recovery_actions table
-- Part of Feature #62: Recovery action creation

-- Create recovery status enum
DO $$ BEGIN
    CREATE TYPE recovery_status AS ENUM (
        'tow_requested',
        'tow_scheduled',
        'in_progress',
        'vehicle_recovered',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create recovery_actions table
CREATE TABLE IF NOT EXISTS recovery_actions (
    id SERIAL PRIMARY KEY,

    -- References
    delinquency_case_id INTEGER NOT NULL REFERENCES delinquency_cases(id) ON DELETE CASCADE,
    customer_profile_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,

    -- Case identifiers
    action_number VARCHAR(50) NOT NULL UNIQUE,

    -- Status
    status recovery_status NOT NULL DEFAULT 'tow_requested',

    -- Authorization details (from compliance gate)
    authorized_by VARCHAR(255) NOT NULL,
    authorization_reason TEXT NOT NULL,
    contract_version VARCHAR(100) NOT NULL,
    authorization_notes TEXT,

    -- Tow vendor details (manual entry)
    tow_vendor_name VARCHAR(255),
    tow_vendor_phone VARCHAR(50),
    tow_vendor_email VARCHAR(255),
    tow_vendor_reference VARCHAR(100),  -- Vendor's job/reference number
    tow_vendor_address TEXT,
    tow_vendor_notes TEXT,

    -- Scheduling
    tow_scheduled_at TIMESTAMP WITH TIME ZONE,
    tow_pickup_location TEXT,
    tow_destination TEXT,

    -- Financial
    estimated_tow_cost NUMERIC(10, 2),
    actual_tow_cost NUMERIC(10, 2),

    -- Recovery outcomes
    vehicle_recovered_at TIMESTAMP WITH TIME ZONE,
    recovery_completed_by VARCHAR(255),
    vehicle_condition_notes TEXT,
    mileage_at_recovery INTEGER,

    -- Failed/Cancelled tracking
    failure_reason TEXT,
    cancelled_by VARCHAR(255),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    -- Customer notification
    customer_notified BOOLEAN NOT NULL DEFAULT FALSE,
    customer_notified_at TIMESTAMP WITH TIME ZONE,

    -- Lease termination
    lease_terminated BOOLEAN NOT NULL DEFAULT FALSE,
    lease_terminated_at TIMESTAMP WITH TIME ZONE,

    -- Ban tracking
    customer_banned BOOLEAN NOT NULL DEFAULT FALSE,
    ban_record_id INTEGER,

    -- Notes
    admin_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recovery_actions_delinquency_case_id ON recovery_actions(delinquency_case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_customer_profile_id ON recovery_actions(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_lease_id ON recovery_actions(lease_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_vehicle_id ON recovery_actions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_action_number ON recovery_actions(action_number);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_status ON recovery_actions(status);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_created_at ON recovery_actions(created_at);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_recovery_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recovery_actions_updated_at ON recovery_actions;
CREATE TRIGGER trigger_recovery_actions_updated_at
    BEFORE UPDATE ON recovery_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_recovery_actions_updated_at();

-- Add comments
COMMENT ON TABLE recovery_actions IS 'Tracks vehicle recovery actions with tow vendor details';
COMMENT ON COLUMN recovery_actions.action_number IS 'Unique identifier for the recovery action (e.g., REC-000001-20260121)';
COMMENT ON COLUMN recovery_actions.status IS 'Current status of the recovery action';
COMMENT ON COLUMN recovery_actions.tow_vendor_name IS 'Name of the tow company handling recovery';
COMMENT ON COLUMN recovery_actions.tow_vendor_reference IS 'Tow vendor job or reference number';
