-- Create segment_groups table for organizing multi-segment video generation
-- Groups segments from same episode for batch generation and UI organization
-- Part of Multi-Segment Video Generation Feature (Phase 1)

-- ============================================================================
-- Create segment_groups table
-- ============================================================================

CREATE TABLE segment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,

  -- Group metadata
  title TEXT NOT NULL,
  description TEXT,
  total_segments INTEGER NOT NULL,
  completed_segments INTEGER DEFAULT 0,

  -- Generation status
  status TEXT DEFAULT 'planning',
  -- Status values:
  -- 'planning' - Segments created but generation not started
  -- 'generating' - Currently generating videos
  -- 'partial' - Some segments generated, some failed or pending
  -- 'complete' - All segments generated successfully
  -- 'error' - Generation failed

  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Cost tracking
  estimated_cost NUMERIC(10, 2),
  actual_cost NUMERIC(10, 2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (total_segments > 0),
  CHECK (completed_segments >= 0),
  CHECK (completed_segments <= total_segments),
  CHECK (status IN ('planning', 'generating', 'partial', 'complete', 'error')),
  CHECK (estimated_cost >= 0),
  CHECK (actual_cost >= 0)
);

-- Add comments for documentation
COMMENT ON TABLE segment_groups IS 'Groups of video segments from episodes for batch generation and organization';
COMMENT ON COLUMN segment_groups.episode_id IS 'Episode that was segmented';
COMMENT ON COLUMN segment_groups.user_id IS 'User who created the segment group';
COMMENT ON COLUMN segment_groups.series_id IS 'Series for visual consistency (denormalized for performance)';
COMMENT ON COLUMN segment_groups.title IS 'Display title (e.g., "Episode 1: The Discovery - Complete Story")';
COMMENT ON COLUMN segment_groups.description IS 'Optional description of segment group purpose';
COMMENT ON COLUMN segment_groups.total_segments IS 'Total number of segments in this group';
COMMENT ON COLUMN segment_groups.completed_segments IS 'Number of segments with generated videos';
COMMENT ON COLUMN segment_groups.status IS 'Overall generation status (planning, generating, partial, complete, error)';
COMMENT ON COLUMN segment_groups.generation_started_at IS 'When batch generation started';
COMMENT ON COLUMN segment_groups.generation_completed_at IS 'When batch generation finished';
COMMENT ON COLUMN segment_groups.error_message IS 'Error details if status is error';
COMMENT ON COLUMN segment_groups.estimated_cost IS 'Estimated Sora API cost for all segments';
COMMENT ON COLUMN segment_groups.actual_cost IS 'Actual cost after generation';

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Primary query pattern: fetch groups by episode
CREATE INDEX idx_segment_groups_episode ON segment_groups(episode_id);

-- User dashboard queries
CREATE INDEX idx_segment_groups_user ON segment_groups(user_id, created_at DESC);

-- Series-level queries
CREATE INDEX idx_segment_groups_series ON segment_groups(series_id);

-- Status filtering
CREATE INDEX idx_segment_groups_status ON segment_groups(status);

-- Cost analytics
CREATE INDEX idx_segment_groups_cost ON segment_groups(actual_cost) WHERE actual_cost IS NOT NULL;

-- ============================================================================
-- Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_segment_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER segment_groups_updated_at_trigger
BEFORE UPDATE ON segment_groups
FOR EACH ROW
EXECUTE FUNCTION update_segment_groups_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE segment_groups ENABLE ROW LEVEL SECURITY;

-- Users can only access their own segment groups
CREATE POLICY segment_groups_select_policy ON segment_groups
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own segment groups
CREATE POLICY segment_groups_insert_policy ON segment_groups
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own segment groups
CREATE POLICY segment_groups_update_policy ON segment_groups
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own segment groups
CREATE POLICY segment_groups_delete_policy ON segment_groups
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  episodes_count INTEGER;
  users_count INTEGER;
BEGIN
  -- Get table counts
  SELECT COUNT(*) INTO episodes_count FROM episodes;
  SELECT COUNT(*) INTO users_count FROM profiles;

  -- Log results
  RAISE NOTICE '=== Segment Groups Table Migration ===';
  RAISE NOTICE '✅ segment_groups table created';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '   - Episode lookup';
  RAISE NOTICE '   - User dashboard queries';
  RAISE NOTICE '   - Series filtering';
  RAISE NOTICE '   - Status filtering';
  RAISE NOTICE '   - Cost analytics';
  RAISE NOTICE '✅ updated_at trigger created';
  RAISE NOTICE '✅ Row Level Security (RLS) enabled';
  RAISE NOTICE '   - Users can only access their own segment groups';
  RAISE NOTICE '';
  RAISE NOTICE 'Total episodes available: %', episodes_count;
  RAISE NOTICE 'Total users: %', users_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Alter videos table to add segment reference fields';
  RAISE NOTICE '2. Link segments to segment_groups via episode_id';
  RAISE NOTICE '3. Create API endpoints for segment group management';
  RAISE NOTICE '4. Build UI components for segment group display';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
