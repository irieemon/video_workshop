-- ============================================================================
-- Migration: Unify Episodes Table
-- Date: 2025-01-28
-- Phase: 1.1 - Database Schema Unification
--
-- Purpose: Merge series_episodes table into episodes table to create single
--          source of truth for episode data. Preserve all metadata and ensure
--          all episodes have proper screenplay structure.
-- ============================================================================

-- Step 1: Add new columns to episodes table to accommodate series_episodes metadata
-- (These columns currently exist in series_episodes but not in episodes)

ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS story_beat TEXT,
ADD COLUMN IF NOT EXISTS emotional_arc TEXT,
ADD COLUMN IF NOT EXISTS continuity_breaks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS characters_used TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS settings_used TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS timeline_position INTEGER,
ADD COLUMN IF NOT EXISTS is_key_episode BOOLEAN DEFAULT false;

-- Step 2: Create a mapping table to track episode-video relationships
-- (Replaces the bidirectional series_episodes.video_id ↔ videos.episode_id)
-- This will be used temporarily during migration, then dropped

CREATE TABLE IF NOT EXISTS episode_video_mapping (
  episode_id UUID NOT NULL,
  video_id UUID NOT NULL,
  source TEXT NOT NULL, -- 'series_episodes' or 'videos'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (episode_id, video_id)
);

-- Step 3: Populate mapping table from series_episodes
-- (Capture all existing episode → video relationships)

INSERT INTO episode_video_mapping (episode_id, video_id, source)
SELECT
  se.id as episode_id,
  se.video_id,
  'series_episodes' as source
FROM series_episodes se
WHERE se.video_id IS NOT NULL
ON CONFLICT (episode_id, video_id) DO NOTHING;

-- Step 4: Populate mapping table from videos.episode_id
-- (Capture reverse relationships)

INSERT INTO episode_video_mapping (episode_id, video_id, source)
SELECT
  v.episode_id,
  v.id as video_id,
  'videos' as source
FROM videos v
WHERE v.episode_id IS NOT NULL
ON CONFLICT (episode_id, video_id) DO NOTHING;

-- Step 5: Migrate series_episodes data to episodes table
-- Strategy: Match by (series_id, season_number, episode_number)
--           If episode exists, update with series_episodes metadata
--           If episode doesn't exist, create it from series_episodes

-- 5a. Update existing episodes with series_episodes metadata
UPDATE episodes e
SET
  story_beat = COALESCE(e.story_beat, se.story_beat),
  emotional_arc = COALESCE(e.emotional_arc, se.emotional_arc),
  continuity_breaks = COALESCE(e.continuity_breaks, se.continuity_breaks, '[]'::jsonb),
  custom_context = COALESCE(e.custom_context, se.custom_context, '{}'::jsonb),
  characters_used = COALESCE(e.characters_used, se.characters_used, ARRAY[]::TEXT[]),
  settings_used = COALESCE(e.settings_used, se.settings_used, ARRAY[]::TEXT[]),
  timeline_position = COALESCE(e.timeline_position, se.timeline_position),
  is_key_episode = COALESCE(e.is_key_episode, se.is_key_episode, false),
  updated_at = NOW()
FROM series_episodes se
WHERE e.series_id = se.series_id
  AND e.season_number = COALESCE(se.season_id::INTEGER, 1) -- series_episodes.season_id might be UUID or null
  AND e.episode_number = se.episode_number;

-- 5b. Insert new episodes from series_episodes that don't have matches
-- (These are episodes that were created via series_episodes but not via screenplay system)
INSERT INTO episodes (
  id,
  series_id,
  user_id,
  season_number,
  episode_number,
  title,
  logline,
  story_beat,
  emotional_arc,
  continuity_breaks,
  custom_context,
  characters_used,
  settings_used,
  timeline_position,
  is_key_episode,
  status,
  created_at,
  updated_at
)
SELECT
  se.id,
  se.series_id,
  s.user_id, -- Get user_id from parent series
  COALESCE(se.season_id::INTEGER, 1) as season_number,
  se.episode_number,
  COALESCE(se.episode_title, 'Episode ' || se.episode_number) as title,
  se.story_beat as logline, -- Use story_beat as logline if no better option
  se.story_beat,
  se.emotional_arc,
  se.continuity_breaks,
  se.custom_context,
  se.characters_used,
  se.settings_used,
  se.timeline_position,
  se.is_key_episode,
  'draft' as status, -- Default status for migrated episodes
  se.created_at,
  NOW() as updated_at
FROM series_episodes se
JOIN series s ON s.id = se.series_id
WHERE NOT EXISTS (
  SELECT 1 FROM episodes e
  WHERE e.series_id = se.series_id
    AND e.season_number = COALESCE(se.season_id::INTEGER, 1)
    AND e.episode_number = se.episode_number
)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Update videos.episode_id from episode_video_mapping
-- (Ensure all videos point to the correct unified episode)
UPDATE videos v
SET
  episode_id = m.episode_id,
  updated_at = NOW()
FROM episode_video_mapping m
WHERE v.id = m.video_id
  AND (v.episode_id IS NULL OR v.episode_id != m.episode_id);

-- Step 7: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_episodes_characters_used ON episodes USING GIN(characters_used);
CREATE INDEX IF NOT EXISTS idx_episodes_settings_used ON episodes USING GIN(settings_used);
CREATE INDEX IF NOT EXISTS idx_episodes_timeline_position ON episodes(timeline_position);
CREATE INDEX IF NOT EXISTS idx_episodes_is_key_episode ON episodes(is_key_episode) WHERE is_key_episode = true;

-- Step 8: Create a comment to document the migration
COMMENT ON TABLE episodes IS 'Unified episodes table - contains all episode data including screenplay content and metadata. Replaces separate series_episodes table.';
COMMENT ON COLUMN episodes.story_beat IS 'Key story development in this episode';
COMMENT ON COLUMN episodes.emotional_arc IS 'Emotional journey or character development';
COMMENT ON COLUMN episodes.characters_used IS 'Array of character IDs appearing in this episode';
COMMENT ON COLUMN episodes.settings_used IS 'Array of setting IDs used in this episode';

-- Note: series_episodes table will be dropped in a separate migration after verification
-- Note: episode_video_mapping will be dropped after all migrations complete
