#!/bin/bash
# =====================================================================
# setup_db.sh: Automated Database Provisioning Script
# Re-creatable, idempotent script running schema -> logic -> seed
# =====================================================================

set -e

DB_USER="${DB_USER:-root}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

echo "=========================================================="
echo "Initializing Student Workload & Deadline Collision Database"
echo "Host: $DB_HOST | Port: $DB_PORT | User: $DB_USER"
echo "=========================================================="

# MySQL command builder (handles empty password)
MYSQL_CMD="mysql -u$DB_USER -h$DB_HOST -P$DB_PORT"
if [ -n "$DB_PASSWORD" ]; then
    MYSQL_CMD="mysql -u$DB_USER -p$DB_PASSWORD -h$DB_HOST -P$DB_PORT"
fi

echo "-> 1. Applying Schema (db/schema/001_schema.sql)..."
$MYSQL_CMD < db/schema/001_schema.sql

echo "-> 2. Creating Views (db/logic/001_views.sql)..."
$MYSQL_CMD < db/logic/001_views.sql

echo "-> 3. Compiling Stored Procedures (db/logic/002_procedures.sql)..."
$MYSQL_CMD < db/logic/002_procedures.sql

echo "-> 4. Installing Triggers (db/logic/003_triggers.sql)..."
$MYSQL_CMD < db/logic/003_triggers.sql

echo "-> 5. Seeding Realistic Demo Data (db/seed/seed.sql)..."
$MYSQL_CMD < db/seed/seed.sql

echo "=========================================================="
echo "Database setup completed successfully!"
echo "Tables, views, stored procedures, triggers and seed data active."
echo "=========================================================="

