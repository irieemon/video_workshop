-- ============================================================================
-- Migration: Update Videos Table Schema
-- Date: 2025-01-28
-- Phase: 1.2 - Database Schema Unification
--
-- Purpose: Clarify video ownership model and add automatic series_id population
--          from episodes. Videos can be:
--          1. Episode-based (episode_id NOT NULL) → auto-populate series_id
--          2. Standalone (is_standalone = true) → no episode/series required
--          3. Project-only (legacy, deprecated) → maintained for compatibility
-- ============================================================================

-- Step 1: Add is_standalone flag to differentiate standalone videos
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT false;

-- Step 2: Update existing standalone videos (videos without episode_id or series_id)
UPDATE videos
SET is_standalone = true
WHERE episode_id IS NULL
  AND series_id IS NULL
  AND project_id IS NOT NULL;

-- Step 3: Auto-populate series_id from episodes for episode-based videos
-- This creates a denormalized field for faster queries and clearer ownership
UPDATE videos v
SET
  series_id = e.series_id,
  updated_at = NOW()
FROM episodes e
WHERE v.episode_id = e.id
  AND (v.series_id IS NULL OR v.series_id != e.series_id);

-- Step 4: Create function to auto-populate series_id when episode_id is set
CREATE OR REPLACE FUNCTION auto_populate_video_series_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If episode_id is set, auto-populate series_id from episode
  IF NEW.episode_id IS NOT NULL THEN
    SELECT series_id INTO NEW.series_id
    FROM episodes
    WHERE id = NEW.episode_id;

    -- Also set is_standalone to false
    NEW.is_standalone = false;
  END IF;

  -- If is_standalone is explicitly set to true, clear episode and series
  IF NEW.is_standalone = true THEN
    NEW.episode_id = NULL;
    NEW.series_id = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-populate series_id on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_populate_video_series_id ON videos;
CREATE TRIGGER trigger_auto_populate_video_series_id
  BEFORE INSERT OR UPDATE OF episode_id, is_standalone ON videos
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_video_series_id();

-- Step 6: Add constraints and validation
-- Ensure data integrity for the video ownership model

-- Add check constraint: episode-based videos must have series_id populated
-- (This will be enforced by the trigger, but good to have explicit constraint)
ALTER TABLE videos
DROP CONSTRAINT IF EXISTS check_episode_videos_have_series,
ADD CONSTRAINT check_episode_videos_have_series
  CHECK (
    episode_id IS NULL OR series_id IS NOT NULL
  );

-- Add check constraint: standalone videos should not have episode or series
ALTER TABLE videos
DROP CONSTRAINT IF EXISTS check_standalone_videos_no_episode_series,
ADD CONSTRAINT check_standalone_videos_no_episode_series
  CHECK (
    is_standalone = false OR (episode_id IS NULL AND series_id IS NULL)
  );

-- Step 7: Add indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_videos_is_standalone ON videos(is_standalone) WHERE is_standalone = true;
CREATE INDEX IF NOT EXISTS idx_videos_episode_series ON videos(episode_id, series_id) WHERE episode_id IS NOT NULL;

-- Step 8: Add composite index for common query: get all videos for a series
CREATE INDEX IF NOT EXISTS idx_videos_series_created ON videos(series_id, created_at DESC) WHERE series_id IS NOT NULL;

-- Step 9: Add comments to document the new schema
COMMENT ON COLUMN videos.episode_id IS 'FK to episodes - if set, this video was generated from an episode scene';
COMMENT ON COLUMN videos.series_id IS 'FK to series - auto-populated from episode.series_id for episode-based videos';
COMMENT ON COLUMN videos.is_standalone IS 'true if this is a standalone video (not part of a series workflow)';
COMMENT ON COLUMN videos.project_id IS 'FK to projects - optional portfolio organization (deprecated for series videos)';
COMMENT ON COLUMN videos.scene_id IS 'FK to screenplay scenes - optional reference to specific scene within episode';

COMMENT ON TABLE videos IS 'Video content - can be episode-based (inherits series context) or standalone';

-- Step 10: Create view for easier querying of video context
CREATE OR REPLACE VIEW videos_with_context AS
SELECT
  v.*,
  e.series_id as episode_series_id,
  e.season_number,
  e.episode_number,
  e.title as episode_title,
  s.name as series_name,
  s.genre as series_genre,
  p.name as project_name,
  CASE
    WHEN v.is_standalone THEN 'standalone'
    WHEN v.episode_id IS NOT NULL THEN 'episode-based'
    WHEN v.series_id IS NOT NULL THEN 'series-only'
    WHEN v.project_id IS NOT NULL THEN 'project-only'
    ELSE 'orphan'
  END as video_type
FROM videos v
LEFT JOIN episodes e ON e.id = v.episode_id
LEFT JOIN series s ON s.id = COALESCE(v.series_id, e.series_id)
LEFT JOIN projects p ON p.id = v.project_id;

COMMENT ON VIEW videos_with_context IS 'Videos with full context including episode, series, and project information';

-- Step 11: Create helper function to check if video has full series context
CREATE OR REPLACE FUNCTION video_has_series_context(video_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_context BOOLEAN;
BEGIN
  SELECT
    v.series_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM series WHERE id = v.series_id)
  INTO has_context
  FROM videos v
  WHERE v.id = video_id;

  RETURN COALESCE(has_context, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION video_has_series_context IS 'Returns true if video has full series context available for AI agents';
