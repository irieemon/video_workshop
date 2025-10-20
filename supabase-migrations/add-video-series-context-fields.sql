-- Add series context fields to videos table
-- This allows videos to track which characters and settings from a series were featured

-- Add columns for series context tracking
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS series_characters_used TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS series_settings_used TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.videos.series_characters_used IS 'Array of series_characters.id values that appear in this video';
COMMENT ON COLUMN public.videos.series_settings_used IS 'Array of series_settings.id values that appear in this video';

-- Create index for faster queries on character usage
CREATE INDEX IF NOT EXISTS idx_videos_series_characters_used ON public.videos USING GIN (series_characters_used);

-- Create index for faster queries on setting usage
CREATE INDEX IF NOT EXISTS idx_videos_series_settings_used ON public.videos USING GIN (series_settings_used);
