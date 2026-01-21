-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    customer_profile_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    related_entity_type VARCHAR(100),
    related_entity_id INTEGER,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_customer_profile_id ON notifications(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
