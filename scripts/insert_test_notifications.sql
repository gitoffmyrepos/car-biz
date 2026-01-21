-- Insert test notifications for customer@example.com (customer_profile_id = 2)

-- Welcome notification (read)
INSERT INTO notifications (customer_profile_id, notification_type, title, message, priority, is_read, read_at, action_url, action_label, created_at)
VALUES (2, 'WELCOME', 'Welcome to FX Weekly!', 'Welcome! We''re excited to have you. Start by uploading your insurance documentation to get verified.', 'HIGH', true, NOW() - INTERVAL '6 days', '/profile', 'Complete Profile', NOW() - INTERVAL '7 days');

-- Insurance approved notification (read)
INSERT INTO notifications (customer_profile_id, notification_type, title, message, priority, is_read, read_at, action_url, action_label, created_at)
VALUES (2, 'INSURANCE_APPROVED', 'Insurance Approved!', 'Great news! Your insurance documentation has been verified. You can now request a vehicle.', 'HIGH', true, NOW() - INTERVAL '4 days', '/vehicle-request', 'Request Vehicle', NOW() - INTERVAL '5 days');

-- Vehicle assigned notification (unread)
INSERT INTO notifications (customer_profile_id, notification_type, title, message, priority, is_read, action_url, action_label, created_at)
VALUES (2, 'VEHICLE_ASSIGNED', 'Vehicle Assigned!', 'Great news! You''ve been assigned a 2022 Toyota Camry. Check your dashboard for details.', 'HIGH', false, '/dashboard', 'View Vehicle', NOW() - INTERVAL '2 days');

-- Payment reminder notification (unread)
INSERT INTO notifications (customer_profile_id, notification_type, title, message, priority, is_read, action_url, action_label, created_at)
VALUES (2, 'PAYMENT_DUE_REMINDER', 'Payment Reminder', 'Your weekly payment of $150.00 is due on January 22, 2026. Upload your payment proof to verify.', 'HIGH', false, '/payments', 'View Payment', NOW() - INTERVAL '1 day');

-- General info notification (unread)
INSERT INTO notifications (customer_profile_id, notification_type, title, message, priority, is_read, action_url, action_label, created_at)
VALUES (2, 'GENERAL_INFO', 'Service Update', 'We''ve updated our terms of service. Please review the changes at your convenience.', 'NORMAL', false, '/terms', 'View Terms', NOW() - INTERVAL '3 hours');
