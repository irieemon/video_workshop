-- ============================================================================
-- ROLLBACK Migration: Revert Phase 1 Schema Changes
-- Date: 2025-01-28
-- Purpose: Restore database to pre-migration state if needed
--
-- IMPORTANT: This script should ONLY be run if you need to completely revert
--            the Phase 1 schema changes. Run rollback steps in REVERSE order.
--
-- Steps to rollback:
-- 1. Restore series_episodes table from backup
-- 2. Restore series.project_id and projects.default_series_id columns
-- 3. Remove new columns from episodes table
-- 4. Remove is_standalone from videos table
-- 5. Drop new views, functions, and triggers
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify backup table exists before rollback
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'series_episodes_backup') THEN
    RAISE EXCEPTION 'Cannot rollback: series_episodes_backup table not found. Migration 20250128000004 may not have been run.';
  END IF;

  RAISE NOTICE 'Backup table found, proceeding with rollback...';
END $$;

-- ============================================================================
-- STEP 2: Restore series_episodes table from backup
-- ============================================================================

-- Recreate series_episodes table structure
CREATE TABLE IF NOT EXISTS series_episodes (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  season_id UUID,
  video_id UUID NOT NULL,
  episode_number INTEGER NOT NULL,
  episode_title TEXT,
  story_beat TEXT,
  emotional_arc TEXT,
  continuity_breaks JSONB DEFAULT '[]'::jsonb,
  custom_context JSONB DEFAULT '{}'::jsonb,
  characters_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  settings_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  timeline_position INTEGER,
  is_key_episode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restore data from backup
INSERT INTO series_episodes
SELECT
  id,
  series_id,
  season_id,
  video_id,
  episode_number,
  episode_title,
  story_beat,
  emotional_arc,
  continuity_breaks,
  custom_context,
  characters_used,
  settings_used,
  timeline_position,
  is_key_episode,
  created_at
FROM series_episodes_backup
ON CONFLICT (id) DO NOTHING;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_series_episodes_series_id ON series_episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_series_episodes_video_id ON series_episodes(video_id);
CREATE INDEX IF NOT EXISTS idx_series_episodes_season_episode ON series_episodes(series_id, episode_number);

-- Recreate RLS policies
ALTER TABLE series_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own series episodes"
  ON series_episodes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM series WHERE series.id = series_episodes.series_id AND series.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own series episodes"
  ON series_episodes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM series WHERE series.id = series_episodes.series_id AND series.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own series episodes"
  ON series_episodes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM series WHERE series.id = series_episodes.series_id AND series.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM series WHERE series.id = series_episodes.series_id AND series.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own series episodes"
  ON series_episodes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM series WHERE series.id = series_episodes.series_id AND series.user_id = auth.uid()
  ));

-- ============================================================================
-- STEP 3: Restore series.project_id column
-- ============================================================================

-- Add back project_id column to series
ALTER TABLE series
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Restore series-project relationships from project_series junction table
-- Take the first project association for each series (if multiple exist)
UPDATE series s
SET project_id = ps.project_id
FROM (
  SELECT DISTINCT ON (series_id) series_id, project_id
  FROM project_series
  ORDER BY series_id, created_at ASC
) ps
WHERE s.id = ps.series_id;

-- ============================================================================
-- STEP 4: Restore projects.default_series_id column
-- ============================================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS default_series_id UUID REFERENCES series(id) ON DELETE SET NULL;

-- Note: default_series_id values cannot be restored as we didn't track them
-- Users will need to manually reset their default series if needed

-- ============================================================================
-- STEP 5: Remove new columns from episodes table
-- ============================================================================

ALTER TABLE episodes
DROP COLUMN IF EXISTS story_beat CASCADE,
DROP COLUMN IF EXISTS emotional_arc CASCADE,
DROP COLUMN IF EXISTS continuity_breaks CASCADE,
DROP COLUMN IF EXISTS custom_context CASCADE,
DROP COLUMN IF EXISTS characters_used CASCADE,
DROP COLUMN IF EXISTS settings_used CASCADE,
DROP COLUMN IF EXISTS timeline_position CASCADE,
DROP COLUMN IF EXISTS is_key_episode CASCADE;

-- Drop indexes for removed columns
DROP INDEX IF EXISTS idx_episodes_characters_used;
DROP INDEX IF EXISTS idx_episodes_settings_used;
DROP INDEX IF EXISTS idx_episodes_timeline_position;
DROP INDEX IF EXISTS idx_episodes_is_key_episode;

-- ============================================================================
-- STEP 6: Remove is_standalone from videos table
-- ============================================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_auto_populate_video_series_id ON videos;
DROP FUNCTION IF EXISTS auto_populate_video_series_id CASCADE;

-- Remove column
ALTER TABLE videos
DROP COLUMN IF EXISTS is_standalone CASCADE;

-- Drop video check constraints
ALTER TABLE videos
DROP CONSTRAINT IF EXISTS check_episode_videos_have_series,
DROP CONSTRAINT IF EXISTS check_standalone_videos_no_episode_series;

-- Drop video indexes
DROP INDEX IF EXISTS idx_videos_is_standalone;
DROP INDEX IF EXISTS idx_videos_episode_series;
DROP INDEX IF EXISTS idx_videos_series_created;

-- Drop video helper function
DROP FUNCTION IF EXISTS video_has_series_context CASCADE;

-- ============================================================================
-- STEP 7: Drop project_series columns and functions
-- ============================================================================

-- Remove display_order column
ALTER TABLE project_series
DROP COLUMN IF EXISTS display_order CASCADE;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_auto_increment_series_display_order ON project_series;
DROP FUNCTION IF EXISTS auto_increment_series_display_order CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS associate_series_with_project CASCADE;
DROP FUNCTION IF EXISTS remove_series_from_project CASCADE;

-- Drop project_series indexes
DROP INDEX IF EXISTS idx_project_series_project_order;
DROP INDEX IF EXISTS idx_project_series_series_id;

-- ============================================================================
-- STEP 8: Drop new views
-- ============================================================================

DROP VIEW IF EXISTS videos_with_context CASCADE;
DROP VIEW IF EXISTS projects_with_series CASCADE;
DROP VIEW IF EXISTS series_with_projects CASCADE;

-- ============================================================================
-- STEP 9: Record rollback in migration history
-- ============================================================================

INSERT INTO migration_history (migration_name, description, tables_affected)
VALUES (
  'rollback-20250128-schema-changes',
  'Rolled back Phase 1 schema changes. Restored series_episodes table, series.project_id, projects.default_series_id. Removed new columns and features.',
  ARRAY['series_episodes', 'series', 'projects', 'episodes', 'videos', 'project_series']
)
ON CONFLICT (migration_name) DO UPDATE
  SET applied_at = NOW();

-- ============================================================================
-- STEP 10: Verification and cleanup
-- ============================================================================

DO $$
DECLARE
  v_series_episodes_count INTEGER;
  v_series_with_project_id INTEGER;
  v_episodes_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_series_episodes_count FROM series_episodes;
  SELECT COUNT(*) INTO v_series_with_project_id FROM series WHERE project_id IS NOT NULL;
  SELECT COUNT(*) INTO v_episodes_count FROM episodes;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Rollback completed successfully';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'series_episodes restored: % records', v_series_episodes_count;
  RAISE NOTICE 'series with project_id: % records', v_series_with_project_id;
  RAISE NOTICE 'episodes remaining: % records', v_episodes_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Note: project.default_series_id values were not restored.';
  RAISE NOTICE 'Users need to manually reset default series if needed.';
  RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- IMPORTANT NOTES AFTER ROLLBACK
-- ============================================================================

-- 1. Application code changes:
--    - Update API routes to use series_episodes instead of episodes metadata
--    - Restore usage of series.project_id for direct associations
--    - Remove usage of is_standalone flag in video queries
--
-- 2. TypeScript types:
--    - Revert lib/types/database.types.ts to pre-migration state
--    - Restore series_episodes table type
--    - Remove new episode fields
--    - Remove is_standalone from videos
--
-- 3. Data considerations:
--    - Any new data in episodes.story_beat, etc. will be lost
--    - Videos created with is_standalone=true will still work
--    - Multiple project associations will be reduced to single project_id
--
-- 4. Testing required:
--    - Verify all episode queries work with series_episodes
--    - Test project-series relationships
--    - Verify video creation flows
--    - Check AI agent context passing

-- ============================================================================
-- Optional: Drop backup table after successful rollback verification
-- ============================================================================

-- Uncomment this section ONLY after verifying rollback is successful
-- and you're confident you won't need to re-apply the migrations

-- DROP TABLE IF EXISTS series_episodes_backup CASCADE;
-- RAISE NOTICE 'Backup table dropped. Migration is now fully reversed.';
