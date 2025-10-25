-- Create episodes table for screenplay management
-- Episodes are created from screenplay assistant sessions and can be edited/refined over time

CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Episode identification
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  logline TEXT,

  -- Screenplay content
  screenplay_text TEXT, -- Full screenplay text
  structured_screenplay JSONB, -- { acts: [], scenes: [], beats: [] }

  -- Metadata
  status TEXT NOT NULL DEFAULT 'draft', -- 'concept' | 'draft' | 'in-progress' | 'complete'
  current_session_id UUID REFERENCES screenplay_sessions(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(series_id, season_number, episode_number)
);

-- Index for efficient queries
CREATE INDEX idx_episodes_series_id ON episodes(series_id);
CREATE INDEX idx_episodes_user_id ON episodes(user_id);
CREATE INDEX idx_episodes_status ON episodes(status);
CREATE INDEX idx_episodes_season_episode ON episodes(series_id, season_number, episode_number);

-- RLS Policies
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own episodes
CREATE POLICY "Users can view their own episodes"
  ON episodes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own episodes
CREATE POLICY "Users can create their own episodes"
  ON episodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own episodes
CREATE POLICY "Users can update their own episodes"
  ON episodes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own episodes
CREATE POLICY "Users can delete their own episodes"
  ON episodes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_episodes_updated_at();

-- Add episode_id to screenplay_sessions for bidirectional linking
ALTER TABLE screenplay_sessions
ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_screenplay_sessions_episode_id ON screenplay_sessions(episode_id);
