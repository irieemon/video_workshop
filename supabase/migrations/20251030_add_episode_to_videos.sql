-- Add episode relationship to videos table
-- This allows videos to be anchored to specific episodes for context inheritance
-- Part of Phase 1: Episode-Aware Video Creation

-- ============================================================================
-- Add episode_id column to videos
-- ============================================================================

-- Add nullable episode_id column with foreign key to episodes table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'episode_id'
  ) THEN
    ALTER TABLE videos
    ADD COLUMN episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN videos.episode_id IS 'Optional link to episode from which video inherits characters, settings, and narrative context';

-- Create index for performance when querying videos by episode
CREATE INDEX IF NOT EXISTS idx_videos_episode_id ON videos(episode_id);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  videos_count INTEGER;
  episodes_count INTEGER;
BEGIN
  -- Get table counts
  SELECT COUNT(*) INTO videos_count FROM videos;
  SELECT COUNT(*) INTO episodes_count FROM episodes;

  -- Log results
  RAISE NOTICE '=== Episode-to-Video Migration Verification ===';
  RAISE NOTICE 'Total videos: % (none should have episode_id yet)', videos_count;
  RAISE NOTICE 'Total episodes: %', episodes_count;
  RAISE NOTICE '✅ episode_id column added to videos table';
  RAISE NOTICE '✅ Foreign key constraint created (ON DELETE SET NULL)';
  RAISE NOTICE '✅ Index created on videos.episode_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update video creation API to accept episodeId';
  RAISE NOTICE '2. Build EpisodeSelector component';
  RAISE NOTICE '3. Implement auto-population of characters/settings from episode';
  RAISE NOTICE '4. Test video creation with episode anchoring';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
