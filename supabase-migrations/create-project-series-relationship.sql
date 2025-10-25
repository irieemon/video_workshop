-- Create many-to-many relationship between projects and series
-- Allow series to be associated with multiple projects and vice versa

-- Junction table for project-series relationships
CREATE TABLE IF NOT EXISTS project_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ensure unique project-series combinations
  UNIQUE(project_id, series_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_project_series_project ON project_series(project_id);
CREATE INDEX idx_project_series_series ON project_series(series_id);
CREATE INDEX idx_project_series_created_by ON project_series(created_by);

-- RLS Policies
ALTER TABLE project_series ENABLE ROW LEVEL SECURITY;

-- Users can view project-series links for their own projects/series
CREATE POLICY "Users can view their project-series links"
  ON project_series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_series.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create links for their own projects and series
CREATE POLICY "Users can create project-series links"
  ON project_series FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_series.project_id
      AND projects.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM series
      WHERE series.id = project_series.series_id
      AND series.user_id = auth.uid()
    )
  );

-- Users can delete their own project-series links
CREATE POLICY "Users can delete their project-series links"
  ON project_series FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_series.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add episode tracking to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generation_source TEXT DEFAULT 'manual' CHECK (generation_source IN ('manual', 'episode', 'template')),
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb;

-- Index for episode-based videos
CREATE INDEX IF NOT EXISTS idx_videos_episode_id ON videos(episode_id);
CREATE INDEX IF NOT EXISTS idx_videos_generation_source ON videos(generation_source);

-- Add comment for clarity
COMMENT ON COLUMN videos.episode_id IS 'Reference to source episode if video was generated from episode screenplay';
COMMENT ON COLUMN videos.generation_source IS 'Source of video: manual (user created), episode (from screenplay), template (from template)';
COMMENT ON COLUMN videos.source_metadata IS 'JSON metadata about video source: {episode_number, season_number, screenplay_version, etc}';
