-- Create video_insights_cache table for storing AI-generated performance insights
CREATE TABLE IF NOT EXISTS video_insights_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one cache entry per video
  UNIQUE(video_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_insights_cache_video_id ON video_insights_cache(video_id);
CREATE INDEX IF NOT EXISTS idx_video_insights_cache_generated_at ON video_insights_cache(generated_at);

-- Enable RLS
ALTER TABLE video_insights_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access insights for their own videos
DROP POLICY IF EXISTS "Users can view their own video insights" ON video_insights_cache;
CREATE POLICY "Users can view their own video insights"
  ON video_insights_cache
  FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert insights for their own videos" ON video_insights_cache;
CREATE POLICY "Users can insert insights for their own videos"
  ON video_insights_cache
  FOR INSERT
  WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update insights for their own videos" ON video_insights_cache;
CREATE POLICY "Users can update insights for their own videos"
  ON video_insights_cache
  FOR UPDATE
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete insights for their own videos" ON video_insights_cache;
CREATE POLICY "Users can delete insights for their own videos"
  ON video_insights_cache
  FOR DELETE
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_video_insights_cache_updated_at ON video_insights_cache;
CREATE TRIGGER update_video_insights_cache_updated_at
  BEFORE UPDATE ON video_insights_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
