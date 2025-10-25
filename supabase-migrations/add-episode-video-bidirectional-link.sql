-- Add bidirectional episode-video linking
-- Date: 2025-10-24
-- Purpose: Allow videos to be linked to episodes and vice versa
-- This enables:
--   1. Creating videos from episodes
--   2. Viewing all videos created for an episode
--   3. Episode-level video management

-- Step 1: Add episode_id to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL;

-- Step 2: Add index for fast episode → videos queries
CREATE INDEX IF NOT EXISTS idx_videos_episode_id ON videos(episode_id);

-- Step 3: Add composite index for series + episode queries
CREATE INDEX IF NOT EXISTS idx_videos_series_episode ON videos(series_id, episode_id) WHERE episode_id IS NOT NULL;

-- Step 4: Update existing videos to link to episodes if they have matching series_id and episode data
-- This backfills episode_id for videos that were created from episodes
-- Uses the VideoSourceMetadata.original_episode_id if it exists in user_edits

UPDATE videos v
SET episode_id = e.id
FROM episodes e
WHERE v.series_id = e.series_id
  AND v.episode_id IS NULL
  AND v.user_edits IS NOT NULL
  AND (v.user_edits->>'original_episode_id')::uuid = e.id;

-- Step 5: Add helper function to get episode videos
CREATE OR REPLACE FUNCTION get_episode_videos(p_episode_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  optimized_prompt TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  sora_video_url TEXT,
  character_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.optimized_prompt,
    v.status,
    v.created_at,
    v.sora_video_url,
    v.character_count
  FROM videos v
  WHERE v.episode_id = p_episode_id
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add helper function to get episode with video count
CREATE OR REPLACE FUNCTION get_episodes_with_video_counts(p_series_id UUID)
RETURNS TABLE (
  id UUID,
  series_id UUID,
  season_number INTEGER,
  episode_number INTEGER,
  title TEXT,
  logline TEXT,
  status TEXT,
  video_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.series_id,
    e.season_number,
    e.episode_number,
    e.title,
    e.logline,
    e.status,
    COUNT(v.id) as video_count,
    e.created_at,
    e.updated_at
  FROM episodes e
  LEFT JOIN videos v ON v.episode_id = e.id
  WHERE e.series_id = p_series_id
  GROUP BY e.id, e.series_id, e.season_number, e.episode_number, e.title, e.logline, e.status, e.created_at, e.updated_at
  ORDER BY e.season_number, e.episode_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_episode_videos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_episodes_with_video_counts(UUID) TO authenticated;

-- Step 8: Add comment for documentation
COMMENT ON COLUMN videos.episode_id IS 'Link to the episode this video was created from. NULL if video is standalone.';

-- Verification query
SELECT
  'videos' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'videos'
  AND column_name = 'episode_id';
