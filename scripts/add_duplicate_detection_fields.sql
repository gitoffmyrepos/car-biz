-- Add duplicate detection fields to weekly_invoices table
-- Migration for Feature #39: Payment duplicate detection

-- Add duplicate detection columns
ALTER TABLE weekly_invoices
ADD COLUMN IF NOT EXISTS is_duplicate_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE weekly_invoices
ADD COLUMN IF NOT EXISTS duplicate_of_invoice_id INTEGER NULL;

ALTER TABLE weekly_invoices
ADD COLUMN IF NOT EXISTS duplicate_flagged_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_weekly_invoices_duplicate_flagged
ON weekly_invoices (is_duplicate_flagged)
WHERE is_duplicate_flagged = TRUE;

-- Create index for finding invoices by hash (for duplicate lookup)
CREATE INDEX IF NOT EXISTS idx_weekly_invoices_payment_proof_hash
ON weekly_invoices (payment_proof_hash)
WHERE payment_proof_hash IS NOT NULL;
