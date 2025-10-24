#!/bin/bash

# Helper script to run column type fix migration
# This ensures visual_fingerprint and voice_profile are JSONB, not TEXT

echo "======================================================================"
echo "  Fix Character Consistency Column Types"
echo "======================================================================"
echo ""
echo "This script will fix the column types for character consistency fields."
echo ""
echo "⚠️  IMPORTANT: Run this SQL in Supabase Studio SQL Editor"
echo ""
echo "Steps:"
echo "1. Open Supabase Studio: https://supabase.com/dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Paste the SQL from your clipboard"
echo "4. Click 'Run'"
echo ""
echo "What this fixes:"
echo "  • Converts visual_fingerprint from TEXT → JSONB (if needed)"
echo "  • Converts voice_profile from TEXT → JSONB (if needed)"
echo "  • Ensures sora_prompt_template is TEXT"
echo "  • Recreates trigger with correct JSONB operators"
echo "  • Adds GIN indexes for performance"
echo ""

# Copy SQL to clipboard (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  cat supabase-migrations/fix-column-types.sql | pbcopy
  echo "✅ SQL copied to clipboard!"
  echo ""
  echo "📋 Now paste in Supabase SQL Editor and run."
else
  echo "📄 SQL file location:"
  echo "   supabase-migrations/fix-column-types.sql"
  echo ""
  echo "Copy the contents manually and paste in Supabase SQL Editor."
fi

echo ""
echo "Expected output:"
echo "  • NOTICE messages showing current types"
echo "  • NOTICE messages showing fixes applied"
echo "  • Table showing final column types"
echo "  • Success message: 'Column types fixed successfully!'"
echo ""
echo "======================================================================"
