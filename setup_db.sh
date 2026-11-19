#!/bin/bash
# =====================================================================
# setup_db.sh: Automated Database Provisioning Script (PostgreSQL)
# Re-creatable, idempotent script running schema -> logic -> seed
# =====================================================================

set -e

DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-student_workload}"

echo "=========================================================="
echo "Initializing Student Workload & Deadline Collision Database"
echo "Engine: PostgreSQL 15+ | Host: $DB_HOST | Port: $DB_PORT | User: $DB_USER"
echo "=========================================================="

# Create database if it does not already exist
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
    echo "-> Creating database $DB_NAME..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
fi

PG_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -q"

echo "-> 1. Applying Schema (db/schema/001_schema.sql)..."
$PG_CMD -f db/schema/001_schema.sql

echo "-> 2. Creating Views (db/logic/001_views.sql)..."
$PG_CMD -f db/logic/001_views.sql

echo "-> 3. Compiling Stored Procedures (db/logic/002_procedures.sql)..."
$PG_CMD -f db/logic/002_procedures.sql

echo "-> 4. Installing Triggers (db/logic/003_triggers.sql)..."
$PG_CMD -f db/logic/003_triggers.sql

echo "-> 5. Seeding Realistic Demo Data (db/seed/seed.sql)..."
$PG_CMD -f db/seed/seed.sql

echo "=========================================================="
echo "Database setup completed successfully!"
echo "Tables, views, stored procedures, triggers and seed data active in PostgreSQL."
echo "=========================================================="
