-- Migrate existing episodes table to new schema
-- Add missing columns and update constraints

-- Add new columns
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS screenplay_text TEXT,
ADD COLUMN IF NOT EXISTS structured_screenplay JSONB,
ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES screenplay_sessions(id) ON DELETE SET NULL;

-- Backfill user_id from series table
UPDATE episodes e
SET user_id = s.user_id
FROM series s
WHERE e.series_id = s.id AND e.user_id IS NULL;

-- Make user_id NOT NULL after backfill
ALTER TABLE episodes ALTER COLUMN user_id SET NOT NULL;

-- Update status check constraint to match new statuses
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_status_check;
ALTER TABLE episodes ADD CONSTRAINT episodes_status_check
CHECK (status IN ('concept', 'draft', 'in-progress', 'complete', 'planning', 'outlined', 'scripted', 'production', 'completed'));

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_episode ON episodes(series_id, season_number, episode_number);

-- Update unique constraint to include season
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_series_id_episode_number_key;
ALTER TABLE episodes ADD CONSTRAINT episodes_series_id_season_episode_key
UNIQUE(series_id, season_number, episode_number);
