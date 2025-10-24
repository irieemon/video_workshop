# How to Apply the Fix to Production Database

## Problem
The migration file `fix-column-types.sql` exists but was never executed against the production database.

## Solution
Execute the migration in Supabase Studio SQL Editor

### Steps:

1. **Open Supabase Studio**
   - Go to: https://supabase.com/dashboard
   - Select your project: `qbnkdtbqabpnkoadguez`
   - Navigate to: SQL Editor

2. **Verify Current State (Optional but Recommended)**
   - Open new query
   - Paste contents of `verify-db-columns.sql`
   - Click "Run"
   - Confirm columns are TEXT (this proves they need fixing)

3. **Apply the Fix**
   - Open new query
   - Paste entire contents of `supabase-migrations/fix-column-types.sql`
   - Click "Run"
   - Wait for "Column types fixed successfully!" message

4. **Verify Fix Applied**
   - Run the verification query again (from step 2)
   - Confirm columns are now JSONB

5. **Test Character Creation**
   - Try creating character: Name="Dad", Description="Dad is the father of Tom"
   - Should work without error

## What This Migration Does

1. ✅ Converts `visual_fingerprint` from TEXT to JSONB
2. ✅ Converts `voice_profile` from TEXT to JSONB
3. ✅ Recreates trigger function with correct JSONB operators
4. ✅ Adds GIN indexes for JSONB performance

## Why the Error Occurred

- The trigger function uses `->>`  operator (JSONB operator)
- The columns were TEXT type (from old migration)
- PostgreSQL error: "operator does not exist: text ->> unknown"
- Fix: Convert columns to JSONB so trigger can use ->> operator

## After Applying

Character creation will work because:
- Columns are JSONB ✅
- Trigger uses ->> on JSONB ✅
- No type mismatch ✅
