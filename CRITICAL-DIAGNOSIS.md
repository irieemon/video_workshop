# CRITICAL ROOT CAUSE ANALYSIS
**Error**: operator does not exist: text ->> unknown (42883)
**Status**: ⚠️ MIGRATION NOT APPLIED TO PRODUCTION DATABASE
**Date**: 2025-10-23

---

## DEFINITIVE ROOT CAUSE ✅

**The database columns are still TEXT type, not JSONB.**

This is proven by the error message itself:
- `operator does not exist: text ->> unknown`
- The `->>` operator ONLY works on JSONB
- PostgreSQL is telling us it sees TEXT, not JSONB

---

## WHY THE ERROR HAPPENS

### Flow:
1. User clicks "Add Character" → Name="Dad", Description="Dad is the father of Tom"
2. API receives request
3. API sends INSERT with:
   ```json
   visual_fingerprint: {}
   voice_profile: {}
   ```
4. Database receives INSERT
5. **TRIGGER FIRES BEFORE INSERT COMPLETES**: `update_character_sora_template()`
6. Trigger tries to execute:
   ```sql
   IF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
   ```
7. **PROBLEM**: `visual_fingerprint` column is TEXT (not JSONB)
8. PostgreSQL error: "I can't use ->> on TEXT. It only works on JSONB!"
9. INSERT fails, transaction rolls back
10. User sees error

---

## WHY PREVIOUS FIX DIDN'T WORK

**You said the migration showed "Column types fixed successfully!"**

But the error is STILL happening. This means:

### Possibility 1: Migration Not Run on Production ❌
- You ran it on local Supabase
- You ran it on test database
- You ran it but got disconnected
- You ran it on wrong project

### Possibility 2: Multiple Databases ❌
- You have local + production
- Migration ran on local
- App connects to production
- Production still has TEXT columns

### Possibility 3: Cache Issue ❌
- Supabase cached old schema
- Need to restart database
- Need to invalidate PostgREST schema cache

---

## VERIFICATION STEPS

### Step 1: Run Diagnostic SQL (IN YOUR CLIPBOARD)

**I've copied SQL to your clipboard.** Paste in Supabase Studio SQL Editor:

1. Open Supabase Studio: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. **Paste** (Cmd+V) - the SQL is already in your clipboard
4. Click **Run**

**Expected Output if NOT fixed**:
```
column_name           | data_type | udt_name
----------------------|-----------|----------
sora_prompt_template  | text      | text
visual_fingerprint    | text      | text      ❌ PROBLEM!
voice_profile         | text      | text      ❌ PROBLEM!
```

**Expected Output if FIXED**:
```
column_name           | data_type | udt_name
----------------------|-----------|----------
sora_prompt_template  | text      | text
visual_fingerprint    | jsonb     | jsonb     ✅ CORRECT
voice_profile         | jsonb     | jsonb     ✅ CORRECT
```

### Step 2: If Still TEXT, Run Fix

If columns are still TEXT:

1. In same SQL Editor
2. Delete current query
3. Run: `./run-column-type-fix.sh` in terminal
4. **Paste** the SQL (will be in clipboard)
5. Click **Run**
6. Verify success message

---

## ALTERNATIVE: BYPASS TRIGGER TEMPORARILY

If you need to unblock character creation immediately:

```sql
-- TEMPORARY: Disable trigger
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;

-- Test character creation now (should work)

-- THEN: Fix columns + re-enable trigger
-- (Run fix-column-types.sql)
```

**⚠️ WARNING**: This disables auto-template generation. Only use temporarily.

---

## DETAILED CODE ANALYSIS

### Character Creation Code Path

**File**: `app/api/series/[seriesId]/characters/route.ts:140-155`

```typescript
const { data: character, error } = await supabase
  .from('series_characters')
  .insert({
    series_id: seriesId,
    name: name.trim(),
    description: description.trim(),
    role: role || null,
    appearance_details: appearance_details || {},
    performance_style: performance_style?.trim() || null,
    introduced_episode_id: introduced_episode_id || null,
    evolution_timeline: evolution_timeline || [],
    visual_fingerprint: visual_fingerprint || {},  // ← Sends {}
    voice_profile: voice_profile || {}             // ← Sends {}
  })
  .select('*')
  .single()
```

**What happens**:
1. ✅ Code sends `{}` (JavaScript object) - CORRECT
2. ✅ Supabase client serializes to JSON string `"{}"` - CORRECT
3. ❌ Database column is TEXT (should be JSONB) - **WRONG**
4. ❌ Database stores string `"{}"` in TEXT column
5. ❌ Trigger runs, tries `text_column->>'age'`
6. ❌ PostgreSQL error: can't use ->> on TEXT

### Trigger Function

**Location**: Database (not in code files)
**Name**: `update_character_sora_template()`
**Problem Lines**: All the `->>` operators

```sql
-- Line that's failing:
IF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
   --                     ^^^ This operator requires JSONB
   --                         But column is TEXT
   --                         = ERROR 42883
```

---

## ROOT CAUSE SUMMARY

| Component | Status | Issue |
|-----------|--------|-------|
| API Code | ✅ Correct | Sends `{}` properly |
| Supabase Client | ✅ Correct | Serializes JSON |
| Database Columns | ❌ WRONG | TEXT instead of JSONB |
| Trigger Function | ✅ Correct | Uses ->> for JSONB |
| Migration File | ✅ Correct | Would fix if run |
| **Migration Execution** | ❌ **NOT RUN** | **Columns still TEXT** |

---

## EVIDENCE CHAIN

### Evidence 1: Error Message
```
operator does not exist: text ->> unknown
```
**Proves**: PostgreSQL sees TEXT column, not JSONB

### Evidence 2: Error Code
```
code: '42883'
```
**Proves**: Operator/type mismatch (trying to use JSONB operator on TEXT)

### Evidence 3: Timing
- Error happens during INSERT
- Before data is visible in table
- During trigger execution

**Proves**: Trigger is running and failing

### Evidence 4: Consistency
- Same error for ALL character operations
- Same error for analyze-image
- Same error across all JSONB operations

**Proves**: Systemic issue with column types

---

## NEXT STEPS (IN ORDER)

### 1. VERIFY ⚠️ CRITICAL
Run diagnostic SQL (already in clipboard):
- Paste in Supabase SQL Editor
- Check if columns are TEXT or JSONB
- Screenshot the results

### 2. FIX 🔧
If columns are TEXT:
- Run `./run-column-type-fix.sh`
- Paste SQL in Supabase SQL Editor
- Wait for "Column types fixed successfully!"

### 3. TEST ✅
- Try creating "Dad" character again
- Should succeed without error
- Character should appear in list

### 4. VERIFY FIX 🎯
Run diagnostic SQL again:
- Columns should now be JSONB
- Trigger should now work
- All operations should succeed

---

## CHECKLIST

- [ ] Open Supabase Studio (https://supabase.com/dashboard)
- [ ] Navigate to SQL Editor
- [ ] Paste diagnostic SQL (in clipboard)
- [ ] Run and screenshot results
- [ ] Confirm columns are TEXT (not JSONB)
- [ ] Run `./run-column-type-fix.sh` in terminal
- [ ] Paste fix SQL in Supabase SQL Editor
- [ ] Run and wait for success message
- [ ] Test character creation ("Dad")
- [ ] Confirm character created successfully
- [ ] Share results

---

## IF STILL NOT WORKING AFTER FIX

### Check 1: Correct Database?
- Are you running against production Supabase?
- Check `.env.local` for `NEXT_PUBLIC_SUPABASE_URL`
- Verify URL matches Supabase Studio project

### Check 2: Correct Project?
- Do you have multiple Supabase projects?
- Are you in the right one in Supabase Studio?
- Check project ID in URL

### Check 3: PostgREST Cache
```sql
-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
```

### Check 4: Restart Dev Server
```bash
# Kill dev server
pkill -f "next dev"

# Restart
npm run dev
```

---

**MOST LIKELY**: You need to run the diagnostic SQL first to confirm columns are TEXT, then run the fix SQL.

The migration file is correct. The code is correct. The columns just need to be converted from TEXT to JSONB in the production database.

---

**Action Required**: Paste diagnostic SQL (in clipboard) → Run in Supabase Studio → Share results
