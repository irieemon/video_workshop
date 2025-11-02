-- Add series context columns to videos table for character and setting consistency
-- This allows videos to maintain visual and audio consistency by referencing
-- specific characters and settings from their parent series

-- Add columns to store selected characters and settings (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'series_characters_used'
  ) THEN
    ALTER TABLE videos
    ADD COLUMN series_characters_used TEXT[] DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'series_settings_used'
  ) THEN
    ALTER TABLE videos
    ADD COLUMN series_settings_used TEXT[] DEFAULT NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN videos.series_characters_used IS 'Array of character IDs from series_characters table that were selected for this video';
COMMENT ON COLUMN videos.series_settings_used IS 'Array of setting IDs from series_settings table that were selected for this video';

-- Create indexes for performance when querying by character/setting usage
CREATE INDEX IF NOT EXISTS idx_videos_series_characters_used ON videos USING GIN (series_characters_used);
CREATE INDEX IF NOT EXISTS idx_videos_series_settings_used ON videos USING GIN (series_settings_used);
