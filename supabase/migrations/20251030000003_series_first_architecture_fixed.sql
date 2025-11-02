-- Migration: Series-First Architecture (FIXED)
-- Description: Simplifies 3-tier hierarchy to 2-tier (Series → Videos)
-- Date: 2025-10-30
-- Version: 1.1 (Fixed for actual schema)

-- ============================================================================
-- PHASE 1: Verify workspaces already renamed (done previously)
-- ============================================================================

-- Workspaces table already exists (renamed from projects)
-- workspace_id and is_system already added to series

-- ============================================================================
-- PHASE 2: Create system series for standalone videos
-- ============================================================================

-- Step 1: Create "Standalone Videos" system series for each user (without visual_style column)
INSERT INTO series (id, user_id, name, description, is_system, genre)
SELECT
  gen_random_uuid(),
  id,
  'Standalone Videos',
  'Videos that don''t belong to a specific series',
  true,
  'other'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM series
  WHERE series.user_id = profiles.id
    AND series.is_system = true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 3: Migrate existing videos
-- ============================================================================

-- Step 2: Migrate existing standalone videos (NULL series_id) to system series
UPDATE videos v
SET series_id = (
  SELECT s.id
  FROM series s
  WHERE s.user_id = v.user_id
    AND s.is_system = true
  LIMIT 1
)
WHERE v.series_id IS NULL;

-- ============================================================================
-- PHASE 4: Update videos table constraints and columns
-- ============================================================================

-- Step 3: Drop the constraint that requires project_id OR series_id
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_must_have_project_or_series;

-- Step 4: Drop the RLS policy that depends on project_id
DROP POLICY IF EXISTS "Users can create own videos" ON videos;

-- Step 5: Create new RLS policy without project_id dependency
CREATE POLICY "Users can create own videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 6: Make series_id NOT NULL (now that all videos have a series)
ALTER TABLE videos ALTER COLUMN series_id SET NOT NULL;

-- Step 7: Drop project_id column and its dependencies
ALTER TABLE videos DROP COLUMN IF EXISTS project_id CASCADE;

-- Step 8: Drop series.project_id foreign key constraint
ALTER TABLE series DROP CONSTRAINT IF EXISTS series_project_id_fkey;

-- Step 9: Drop series.project_id column
ALTER TABLE series DROP COLUMN IF EXISTS project_id CASCADE;

-- ============================================================================
-- PHASE 5: Update indexes for performance
-- ============================================================================

-- Step 10: Drop old project-based indexes
DROP INDEX IF EXISTS idx_videos_project_id;
DROP INDEX IF EXISTS idx_videos_project_id_not_null;
DROP INDEX IF EXISTS idx_series_project_id;
DROP INDEX IF EXISTS unique_series_name_per_project;

-- Step 11: Add new unique constraint for series names per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_series_name_per_user
  ON series(user_id, name)
  WHERE is_system = false;

-- ============================================================================
-- PHASE 6: Update RLS policies
-- ============================================================================

-- Workspace policies already exist from previous migration

-- ============================================================================
-- PHASE 7: Create helper functions
-- ============================================================================

-- Step 12: Create helper function to get user's standalone series
CREATE OR REPLACE FUNCTION get_user_standalone_series(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM series
    WHERE user_id = p_user_id
      AND is_system = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PHASE 8: Create helpful views
-- ============================================================================

-- Step 13: Create view for video counts by workspace
CREATE OR REPLACE VIEW workspace_video_counts AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COUNT(DISTINCT v.id) AS video_count,
  COUNT(DISTINCT s.id) AS series_count
FROM workspaces w
LEFT JOIN series s ON s.workspace_id = w.id AND s.is_system = false
LEFT JOIN videos v ON v.series_id = s.id
GROUP BY w.id, w.name;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  null_series_count INTEGER;
  system_series_count INTEGER;
  user_count INTEGER;
  video_count INTEGER;
BEGIN
  -- Check for videos without series
  SELECT COUNT(*) INTO null_series_count FROM videos WHERE series_id IS NULL;

  -- Check system series created
  SELECT COUNT(*) INTO system_series_count FROM series WHERE is_system = true;

  -- Get user count for comparison
  SELECT COUNT(*) INTO user_count FROM profiles;

  -- Get total video count
  SELECT COUNT(*) INTO video_count FROM videos;

  -- Log results
  RAISE NOTICE '=== Migration Verification ===';
  RAISE NOTICE 'Videos without series: % (should be 0)', null_series_count;
  RAISE NOTICE 'System series created: % (should match user count: %)', system_series_count, user_count;
  RAISE NOTICE 'Total videos: %', video_count;

  -- Verify all videos have series
  IF null_series_count > 0 THEN
    RAISE WARNING 'Migration incomplete: % videos still have NULL series_id', null_series_count;
  ELSE
    RAISE NOTICE '✅ All videos have series assigned';
  END IF;

  -- Verify system series exist
  IF system_series_count = 0 THEN
    RAISE WARNING 'No system series created - this may cause issues';
  ELSE
    RAISE NOTICE '✅ System series created for standalone videos';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '=== Series-First Architecture Migration Completed ===';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Test video creation flow';
RAISE NOTICE '2. Verify all videos display correctly';
RAISE NOTICE '3. Check that series filtering works';
RAISE NOTICE '4. Monitor application for any errors';
