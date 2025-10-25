-- Fix episodes table schema - Add missing user_id column
-- Date: 2025-10-24
-- Issue: Episodes table missing user_id column causing "column episodes.user_id does not exist" error

-- Step 1: Add user_id column if it doesn't exist
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Backfill user_id from series table for existing episodes
UPDATE episodes e
SET user_id = s.user_id
FROM series s
WHERE e.series_id = s.id AND e.user_id IS NULL;

-- Step 3: Make user_id NOT NULL after backfill
ALTER TABLE episodes
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON episodes(user_id);

-- Step 5: Ensure RLS policies exist (they should from create-episodes-table.sql)
-- But recreate them just in case

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own episodes" ON episodes;
DROP POLICY IF EXISTS "Users can create their own episodes" ON episodes;
DROP POLICY IF EXISTS "Users can update their own episodes" ON episodes;
DROP POLICY IF EXISTS "Users can delete their own episodes" ON episodes;

-- Recreate RLS policies
CREATE POLICY "Users can view their own episodes"
  ON episodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own episodes"
  ON episodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episodes"
  ON episodes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episodes"
  ON episodes FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Verify the fix
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'episodes'
  AND column_name IN ('id', 'series_id', 'user_id', 'title', 'season_number', 'episode_number')
ORDER BY ordinal_position;

-- Expected output should show:
-- id | uuid | NO
-- series_id | uuid | NO
-- user_id | uuid | NO  <-- Should be present and NOT NULL
-- season_number | integer | NO
-- episode_number | integer | NO
-- title | text | NO
