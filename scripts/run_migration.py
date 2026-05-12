#!/usr/bin/env python3
"""Run database migration to add duplicate detection fields."""

import psycopg2
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/weekly_lease"
)


def run_migration():
    """Add duplicate detection columns to weekly_invoices table."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("Running migration to add duplicate detection fields...")

    # Check and add is_duplicate_flagged column
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'weekly_invoices' AND column_name = 'is_duplicate_flagged'
    """)
    if not cur.fetchone():
        cur.execute("ALTER TABLE weekly_invoices ADD COLUMN is_duplicate_flagged BOOLEAN DEFAULT FALSE")
        print("Added is_duplicate_flagged column")
    else:
        print("is_duplicate_flagged column already exists")

    # Check and add duplicate_of_invoice_id column
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'weekly_invoices' AND column_name = 'duplicate_of_invoice_id'
    """)
    if not cur.fetchone():
        cur.execute("ALTER TABLE weekly_invoices ADD COLUMN duplicate_of_invoice_id INTEGER NULL")
        print("Added duplicate_of_invoice_id column")
    else:
        print("duplicate_of_invoice_id column already exists")

    # Check and add duplicate_flagged_at column
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'weekly_invoices' AND column_name = 'duplicate_flagged_at'
    """)
    if not cur.fetchone():
        cur.execute("ALTER TABLE weekly_invoices ADD COLUMN duplicate_flagged_at TIMESTAMP WITH TIME ZONE NULL")
        print("Added duplicate_flagged_at column")
    else:
        print("duplicate_flagged_at column already exists")

    # Create indexes
    print("Creating indexes...")
    try:
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_weekly_invoices_duplicate_flagged
            ON weekly_invoices (is_duplicate_flagged)
            WHERE is_duplicate_flagged = TRUE
        """)
        print("Created idx_weekly_invoices_duplicate_flagged index")
    except Exception as e:
        print(f"Index creation skipped: {e}")

    try:
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_weekly_invoices_payment_proof_hash
            ON weekly_invoices (payment_proof_hash)
            WHERE payment_proof_hash IS NOT NULL
        """)
        print("Created idx_weekly_invoices_payment_proof_hash index")
    except Exception as e:
        print(f"Index creation skipped: {e}")

    cur.close()
    conn.close()
    print("Migration completed!")


if __name__ == "__main__":
    run_migration()
