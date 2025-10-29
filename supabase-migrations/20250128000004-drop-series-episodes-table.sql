-- ============================================================================
-- Migration: Drop series_episodes Table
-- Date: 2025-01-28
-- Phase: 1.4 - Database Schema Unification (Final Cleanup)
--
-- Purpose: Drop the series_episodes table after all data has been migrated
--          to the unified episodes table. This completes the schema unification.
--
-- IMPORTANT: This migration should only be run AFTER:
--            1. Migration 20250128000001 (unify episodes table)
--            2. Migration 20250128000002 (update videos schema)
--            3. Data verification that all series_episodes data is preserved
-- ============================================================================

-- Step 1: Verify that all series_episodes have been migrated to episodes
-- This will raise an error if there are series_episodes without corresponding episodes
DO $$
DECLARE
  v_unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_unmigrated_count
  FROM series_episodes se
  WHERE NOT EXISTS (
    SELECT 1 FROM episodes e
    WHERE e.series_id = se.series_id
      AND e.season_number = COALESCE(se.season_id::INTEGER, 1)
      AND e.episode_number = se.episode_number
  );

  IF v_unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop series_episodes table: % unmigrated records found. Please run migration 20250128000001 first.', v_unmigrated_count;
  END IF;

  RAISE NOTICE 'Verification passed: All series_episodes have been migrated to episodes table';
END $$;

-- Step 2: Verify that all videos.episode_id are valid
-- This will raise an error if there are videos pointing to non-existent episodes
DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM videos v
  WHERE v.episode_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM episodes e WHERE e.id = v.episode_id
    );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop series_episodes table: % videos have invalid episode_id references', v_invalid_count;
  END IF;

  RAISE NOTICE 'Verification passed: All video episode references are valid';
END $$;

-- Step 3: Create backup table (optional safety measure)
-- This creates a read-only copy of series_episodes for disaster recovery
CREATE TABLE IF NOT EXISTS series_episodes_backup AS
SELECT
  *,
  NOW() as backup_created_at
FROM series_episodes;

COMMENT ON TABLE series_episodes_backup IS 'Backup of series_episodes table before deletion (created during migration 20250128000004)';

-- Step 4: Drop all dependent views that reference series_episodes
-- (If any exist from previous migrations)
DROP VIEW IF EXISTS series_episodes_with_videos CASCADE;
DROP VIEW IF EXISTS episodes_with_series_episodes CASCADE;

-- Step 5: Drop the foreign key constraints on series_episodes
ALTER TABLE series_episodes
DROP CONSTRAINT IF EXISTS series_episodes_series_id_fkey CASCADE,
DROP CONSTRAINT IF EXISTS series_episodes_season_id_fkey CASCADE,
DROP CONSTRAINT IF EXISTS series_episodes_video_id_fkey CASCADE;

-- Step 6: Drop indexes on series_episodes
DROP INDEX IF EXISTS idx_series_episodes_series_id;
DROP INDEX IF EXISTS idx_series_episodes_season_id;
DROP INDEX IF EXISTS idx_series_episodes_video_id;
DROP INDEX IF EXISTS idx_series_episodes_season_episode;

-- Step 7: Drop RLS policies on series_episodes
DROP POLICY IF EXISTS "Users can view their own series episodes" ON series_episodes;
DROP POLICY IF EXISTS "Users can create their own series episodes" ON series_episodes;
DROP POLICY IF EXISTS "Users can update their own series episodes" ON series_episodes;
DROP POLICY IF EXISTS "Users can delete their own series episodes" ON series_episodes;

-- Step 8: Drop the series_episodes table
DROP TABLE IF EXISTS series_episodes CASCADE;

-- Step 9: Drop the temporary episode_video_mapping table
-- (Created in migration 20250128000001 for tracking relationships during migration)
DROP TABLE IF EXISTS episode_video_mapping CASCADE;

-- Step 10: Create migration completion marker
CREATE TABLE IF NOT EXISTS migration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  tables_affected TEXT[]
);

INSERT INTO migration_history (migration_name, description, tables_affected)
VALUES (
  '20250128000004-drop-series-episodes-table',
  'Dropped series_episodes table after unifying with episodes table. Created backup table for disaster recovery.',
  ARRAY['series_episodes', 'episode_video_mapping']
)
ON CONFLICT (migration_name) DO UPDATE
  SET applied_at = NOW();

-- Step 11: Final verification report
DO $$
DECLARE
  v_episodes_count INTEGER;
  v_videos_with_episodes INTEGER;
  v_series_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_episodes_count FROM episodes;
  SELECT COUNT(*) INTO v_videos_with_episodes FROM videos WHERE episode_id IS NOT NULL;
  SELECT COUNT(*) INTO v_series_count FROM series;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 20250128000004 completed successfully';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total episodes: %', v_episodes_count;
  RAISE NOTICE 'Videos linked to episodes: %', v_videos_with_episodes;
  RAISE NOTICE 'Total series: %', v_series_count;
  RAISE NOTICE 'Backup table created: series_episodes_backup';
  RAISE NOTICE '==============================================';
END $$;
