# Series Not Loading - Troubleshooting & Resolution

**Date**: 2025-10-20
**Issue**: Series page showing "No series yet" despite series existing in database
**Status**: ✅ **RESOLVED**

---

## Root Cause

The decoupled model migration was partially run on the Supabase database, causing:

1. **Missing column error**: `column series.user_id does not exist`
2. **Foreign key ambiguity error**: Multiple FK relationships between `series` and `projects`

### Why This Happened

The migration file `supabase-migrations/decouple-series-from-projects.sql` was created but not fully executed on the remote Supabase database, leaving the schema in an incomplete state.

---

## Errors Encountered

### Error 1: Missing Column
```
Error fetching series: {
  code: '42703',
  details: null,
  hint: null,
  message: 'column series.user_id does not exist'
}
```

**Cause**: Migration Step 1 (add `user_id` to series) was not completed.

### Error 2: Foreign Key Ambiguity
```
Error fetching series: {
  code: 'PGRST201',
  message: "Could not embed because more than one relationship was found for 'series' and 'projects'",
  hint: "Try changing 'projects' to one of the following: 'projects!projects_default_series_id_fkey', 'projects!series_project_id_fkey'"
}
```

**Cause**: Adding `projects.default_series_id` created two foreign key relationships:
1. `series.project_id` → `projects.id` (original)
2. `projects.default_series_id` → `series.id` (new)

---

## Resolution Steps

### Step 1: Complete the Migration ✅

**File**: `supabase-migrations/resume-decouple-migration.sql`

Ran the idempotent migration script that:
- ✅ Added `user_id` column to `series` table
- ✅ Populated `user_id` from existing `project.user_id` relationships
- ✅ Made `series.project_id` nullable
- ✅ Added `user_id` column to `videos` table
- ✅ Updated RLS policies to use direct `user_id` queries
- ✅ Added performance indexes

**Result**: Migration completed successfully!

### Step 2: Fix Foreign Key Ambiguity ✅

**File**: `app/dashboard/series/page.tsx:32`

**Before** (ambiguous):
```typescript
.select('*, project:projects(id, name)')
```

**After** (explicit):
```typescript
.select('*, project:projects!series_project_id_fkey(id, name)')
```

**Explanation**: Explicitly specify which foreign key to use when embedding related data.

### Step 3: Remove Debug Logging ✅

Removed temporary debug `console.log` statements added during troubleshooting.

---

## Files Modified

### Application Code
1. **app/dashboard/series/page.tsx**
   - Fixed foreign key specification (line 32)
   - Removed debug logging

### Migration Scripts (Created)
1. **supabase-migrations/resume-decouple-migration.sql**
   - Idempotent script to complete migration from any state

2. **supabase-migrations/check-current-schema.sql**
   - Diagnostic script to check schema state

3. **claudedocs/series-not-loading-fix.md**
   - This troubleshooting documentation

---

## Verification

After applying fixes:

1. ✅ Series page loads successfully (`GET /dashboard/series 200`)
2. ✅ No database errors in server logs
3. ✅ Foreign key queries work correctly
4. ✅ Series data displays properly

---

## Key Learnings

### Foreign Key Ambiguity Pattern

When multiple foreign key relationships exist between two tables, always specify which FK to use:

```typescript
// ❌ Ambiguous - will fail
.select('related_table(*)')

// ✅ Explicit - works correctly
.select('related_table!foreign_key_name(*)')
```

**Finding FK Names**:
```sql
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'series' AND constraint_type = 'FOREIGN KEY';
```

### Migration Best Practices

1. **Idempotent Scripts**: Use `IF NOT EXISTS` and `DO $$` blocks for safety
2. **Data Population**: Always populate new columns before making them `NOT NULL`
3. **Verify State**: Check schema state before running migrations
4. **Test Locally First**: Run migrations on local Supabase before production

---

## Related Foreign Key Fixes

The same ambiguity issue was previously fixed in these files:

1. `app/dashboard/page.tsx:17` - `series!series_project_id_fkey`
2. `app/dashboard/projects/[id]/page.tsx:23` - `series!series_project_id_fkey`
3. `app/dashboard/projects/[id]/videos/[videoId]/page.tsx:29` - `series!videos_series_id_fkey`
4. `app/api/projects/route.ts:24` - `series!series_project_id_fkey`
5. `app/api/projects/[id]/route.ts:28` - `series!series_project_id_fkey`
6. `app/api/videos/[id]/route.ts:29` - `series!videos_series_id_fkey`

**Reference**: See `claudedocs/foreign-key-fixes-needed.md` for the full list.

---

## Prevention

To prevent similar issues:

1. **Always verify migrations** run completely on both local and remote databases
2. **Test foreign key queries** after adding new relationships
3. **Use explicit FK names** whenever multiple relationships exist
4. **Document FK patterns** in the codebase for future reference

---

## Current System State

✅ **Fully Operational**

- Database schema matches code expectations
- All foreign key queries properly specified
- Series page loading correctly
- Migration fully applied and verified
