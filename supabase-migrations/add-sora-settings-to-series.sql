-- Add Sora 2 best practices settings to series table
-- These settings establish visual consistency across all episodes in a series

ALTER TABLE series
ADD COLUMN IF NOT EXISTS sora_camera_style TEXT,
ADD COLUMN IF NOT EXISTS sora_lighting_mood TEXT,
ADD COLUMN IF NOT EXISTS sora_color_palette TEXT,
ADD COLUMN IF NOT EXISTS sora_overall_tone TEXT,
ADD COLUMN IF NOT EXISTS sora_narrative_prefix TEXT;

-- Add comments explaining each field
COMMENT ON COLUMN series.sora_camera_style IS 'Default camera/film style for series (e.g., "shot on 35mm film, warm cinematic grade")';
COMMENT ON COLUMN series.sora_lighting_mood IS 'Default lighting mood for series (e.g., "soft morning light with warm tones")';
COMMENT ON COLUMN series.sora_color_palette IS 'Default color palette for series (e.g., "warm amber and gold tones")';
COMMENT ON COLUMN series.sora_overall_tone IS 'Overall visual tone/style for series (e.g., "minimalist luxury")';
COMMENT ON COLUMN series.sora_narrative_prefix IS 'Narrative prefix for episodic continuity (e.g., "In {series_name}, ")';
