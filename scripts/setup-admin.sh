#!/bin/bash
# Admin Setup Script
# Sets up admin users based on ADMIN_EMAILS environment variable
# Usage: ./scripts/setup-admin.sh

set -e # Exit on error

echo "🔧 Admin Setup Script"
echo "===================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  echo "Please create .env.local with SUPABASE_DB_URL and ADMIN_EMAILS"
  exit 1
fi

# Load environment variables
source .env.local

# Check for required environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL not set in .env.local"
  exit 1
fi

if [ -z "$ADMIN_EMAILS" ]; then
  echo "⚠️  Warning: ADMIN_EMAILS not set in .env.local"
  echo "Using default: test@example.com"
  ADMIN_EMAILS="test@example.com"
fi

echo "📋 Configuration:"
echo "  Database: ${SUPABASE_DB_URL%%@*}@***" # Hide password in output
echo "  Admin Emails: $ADMIN_EMAILS"
echo ""

# Ask for confirmation
read -p "🤔 Apply admin setup to database? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Setup cancelled"
  exit 0
fi

echo ""
echo "📊 Step 1: Running database migration..."
echo "========================================="

# Run the migration
psql "$SUPABASE_DB_URL" -f supabase-migrations/add-admin-role.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi

echo ""
echo "👥 Step 2: Setting admin users..."
echo "=================================="

# Split comma-separated emails and process each
IFS=',' read -ra EMAILS <<< "$ADMIN_EMAILS"
ADMIN_COUNT=0

for email in "${EMAILS[@]}"; do
  # Trim whitespace
  email=$(echo "$email" | xargs)

  if [ -z "$email" ]; then
    continue
  fi

  echo "Processing: $email"

  # Check if user exists
  USER_EXISTS=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM profiles WHERE email = '$email';")
  USER_EXISTS=$(echo "$USER_EXISTS" | xargs) # Trim whitespace

  if [ "$USER_EXISTS" -eq "0" ]; then
    echo "  ⚠️  Warning: User $email does not exist in database"
    echo "  ℹ️  They will become admin after signing up"
    continue
  fi

  # Set admin status
  psql "$SUPABASE_DB_URL" -c "UPDATE profiles SET is_admin = TRUE WHERE email = '$email';" > /dev/null

  if [ $? -eq 0 ]; then
    echo "  ✅ Set $email as admin"
    ((ADMIN_COUNT++))
  else
    echo "  ❌ Failed to set $email as admin"
  fi
done

echo ""
echo "📈 Step 3: Verification..."
echo "=========================="

# Get current admin count
TOTAL_ADMINS=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM profiles WHERE is_admin = TRUE;")
TOTAL_ADMINS=$(echo "$TOTAL_ADMINS" | xargs)

echo "Total admins in database: $TOTAL_ADMINS"

if [ "$TOTAL_ADMINS" -eq "0" ]; then
  echo "⚠️  Warning: No admin users found. At least one admin should exist."
fi

# Show admin users
echo ""
echo "Current admin users:"
psql "$SUPABASE_DB_URL" -c "SELECT email, is_admin, created_at FROM profiles WHERE is_admin = TRUE ORDER BY created_at;"

echo ""
echo "✅ Admin setup complete!"
echo ""
echo "📝 Summary:"
echo "  - Migration applied: ✅"
echo "  - Admins configured: $ADMIN_COUNT"
echo "  - Total admins: $TOTAL_ADMINS"
echo ""
echo "🚀 Next steps:"
echo "  1. Restart your dev server: npm run dev"
echo "  2. Admin users can now:"
echo "     - Create unlimited videos (quota bypassed)"
echo "     - Access admin dashboard at /admin"
echo "     - Manage other users"
echo ""
