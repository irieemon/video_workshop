# Data Flow Analysis - Episodes Table Schema Mismatch

**Date**: 2025-10-24
**Issue**: "Failed to fetch episode data" when converting episodes to video prompts
**Root Cause**: Database schema mismatch - `episodes` table missing `user_id` column

## Problem Summary

When attempting to create a video from an episode, the system fails with:
```
Failed to fetch episode data
```

Server logs show:
```
Failed to fetch episodes: {
  code: '42703',
  message: 'column episodes.user_id does not exist'
}
```

## Root Cause Analysis

### Expected Schema (from migrations and types)
The codebase expects the `episodes` table to have:
- `id` UUID PRIMARY KEY
- `series_id` UUID (FK to series)
- **`user_id` UUID (FK to auth.users)** ← MISSING IN DATABASE
- `season_number` INTEGER
- `episode_number` INTEGER
- `title` TEXT
- `logline` TEXT
- `screenplay_text` TEXT
- `structured_screenplay` JSONB
- `status` TEXT
- `current_session_id` UUID (FK to screenplay_sessions)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### Actual Database Schema
The production database is missing the `user_id` column, causing all episode queries to fail.

## Impact Areas

### 1. API Routes Affected
- `/api/episodes` GET endpoint (line 33-46 in route.ts)
  - Queries episodes by series_id, RLS policies check user_id
- `/api/episodes` POST endpoint (line 112-127 in route.ts)
  - Tries to INSERT with user_id field (line 116)
- `/api/episodes/[id]/full-data` endpoint
  - Queries episode with character/setting data

### 2. Components Affected
- `EpisodeSelector` component (components/videos/episode-selector.tsx)
  - Fetches episodes by series (line 67)
  - Calls full-data endpoint (line 93)
  - Cannot convert episodes to prompts

### 3. Data Flow Broken
```
Series → Episodes → Characters/Settings → Video Creation
  ✅      ❌ BROKEN     ❌ NO DATA        ❌ CANNOT CREATE
```

## Files Involved

### Migration Files
1. **`supabase-migrations/create-episodes-table.sql`**
   - Line 7: Defines `user_id UUID NOT NULL`
   - Lines 31-35: Creates indexes including `idx_episodes_user_id`
   - Lines 40-59: RLS policies use `user_id`

2. **`supabase-migrations/migrate-episodes-table-schema.sql`**
   - Line 6: Adds `user_id` column if not exists
   - Lines 13-16: Backfills `user_id` from series table
   - Line 19: Makes `user_id` NOT NULL

### TypeScript Types
- **`lib/types/database.types.ts`** (line 760-774)
  ```typescript
  export interface Episode {
    id: string
    series_id: string
    user_id: string  // ← Expected but doesn't exist in DB
    // ... rest of fields
  }
  ```

### API Routes
- **`app/api/episodes/route.ts`**
  - Line 116: `user_id: series.user_id` in INSERT
  - RLS policies expect user_id to exist

## Solution

### Option 1: Run Migration (RECOMMENDED)
Apply the existing migration to add the `user_id` column:

```sql
-- File: fix-episodes-schema.sql

-- Add user_id column if it doesn't exist
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from series table
UPDATE episodes e
SET user_id = s.user_id
FROM series s
WHERE e.series_id = s.id AND e.user_id IS NULL;

-- Make user_id NOT NULL after backfill
ALTER TABLE episodes
ALTER COLUMN user_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON episodes(user_id);

-- Verify the fix
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'episodes'
ORDER BY ordinal_position;
```

**How to apply**:
```bash
# Using Supabase CLI (if configured)
supabase db push

# Or manually using psql
psql "$SUPABASE_DB_URL" -f supabase-migrations/fix-episodes-schema.sql

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste the migration SQL
# 3. Run the query
```

### Option 2: Remove user_id Dependency (NOT RECOMMENDED)
This would require extensive refactoring:
- Update TypeScript types to remove `user_id`
- Modify all API routes to use series ownership instead
- Update RLS policies to check via series join
- More complex and error-prone

## Recommended Action Plan

1. ✅ **IMMEDIATE**: Apply migration to add `user_id` column
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase-migrations/migrate-episodes-table-schema.sql
   ```

2. ✅ **VERIFY**: Check episodes table has user_id
   ```sql
   \d episodes
   ```

3. ✅ **TEST**: Try creating video from episode again
   - Navigate to `/dashboard/projects/[id]/videos/new`
   - Select series
   - Select episode
   - Click "Convert to Video Prompt"
   - Should load characters, settings, and prompt

4. ✅ **VALIDATE**: Confirm data flow
   ```
   Series → Episodes → Full Data → Characters → Settings → Prompt
     ✅        ✅         ✅           ✅            ✅          ✅
   ```

## Prevention

### Why This Happened
- Migration files exist but weren't applied to production database
- Possible causes:
  - Manual database setup bypassed migrations
  - Migrations run against local DB but not production
  - Migration system not configured properly

### Going Forward
1. Use Supabase migration system consistently
2. Verify migrations are applied to all environments
3. Add migration status check to CI/CD
4. Consider schema validation tests

## Testing Checklist

After applying migration:
- [ ] Episodes table has `user_id` column
- [ ] Existing episodes have `user_id` populated from series
- [ ] Can fetch episodes: `GET /api/episodes?seriesId=xxx`
- [ ] Can create episode: `POST /api/episodes`
- [ ] Can get full episode data: `GET /api/episodes/[id]/full-data`
- [ ] Episode selector shows episodes
- [ ] Can convert episode to video prompt
- [ ] Characters auto-populate from episode
- [ ] Settings auto-populate from episode
- [ ] Complete video creation flow works

## Related Files

- `app/api/episodes/route.ts` - Episodes API
- `app/api/episodes/[id]/full-data/route.ts` - Full episode data
- `app/api/episodes/[id]/convert-to-prompt/route.ts` - Prompt conversion
- `components/videos/episode-selector.tsx` - Episode selection UI
- `app/dashboard/projects/[id]/videos/new/page.tsx` - Video creation form
- `lib/types/database.types.ts` - Type definitions

## Next Steps

1. Apply the migration
2. Test the complete data flow
3. Verify all episode-related features work
4. Document any other schema mismatches found
