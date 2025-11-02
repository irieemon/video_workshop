-- Add segment reference fields to videos table
-- Allows videos to be linked to segments for multi-segment episode generation
-- Part of Multi-Segment Video Generation Feature (Phase 1)

-- ============================================================================
-- Add segment fields to videos table
-- ============================================================================

-- Add segment_id to link video to specific segment
ALTER TABLE videos
ADD COLUMN segment_id UUID REFERENCES video_segments(id) ON DELETE SET NULL;

-- Add is_segment flag for easy filtering
ALTER TABLE videos
ADD COLUMN is_segment BOOLEAN DEFAULT false;

-- Add segment_group_id for grouping segments from same episode
ALTER TABLE videos
ADD COLUMN segment_group_id UUID REFERENCES segment_groups(id) ON DELETE SET NULL;

-- Add segment_order for sequential ordering within group
ALTER TABLE videos
ADD COLUMN segment_order INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN videos.segment_id IS 'Link to video_segment if this video is part of a multi-segment generation';
COMMENT ON COLUMN videos.is_segment IS 'True if this video is part of a segment group (for easy filtering)';
COMMENT ON COLUMN videos.segment_group_id IS 'Groups segments from same episode together';
COMMENT ON COLUMN videos.segment_order IS 'Sequential order within segment group (1, 2, 3...)';

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Query videos by segment
CREATE INDEX idx_videos_segment ON videos(segment_id) WHERE segment_id IS NOT NULL;

-- Filter segment vs standalone videos
CREATE INDEX idx_videos_is_segment ON videos(is_segment);

-- Query videos by segment group (primary pattern for UI)
CREATE INDEX idx_videos_segment_group ON videos(segment_group_id, segment_order)
  WHERE segment_group_id IS NOT NULL;

-- Composite index for user segment videos
CREATE INDEX idx_videos_user_segments ON videos(user_id, is_segment, created_at DESC)
  WHERE is_segment = true;

-- ============================================================================
-- Add constraints
-- ============================================================================

-- If segment_id is set, is_segment must be true
ALTER TABLE videos
ADD CONSTRAINT videos_segment_consistency_check
CHECK (
  (segment_id IS NULL AND is_segment = false) OR
  (segment_id IS NOT NULL AND is_segment = true)
);

-- If is_segment is true, must have segment_group_id and segment_order
ALTER TABLE videos
ADD CONSTRAINT videos_segment_required_fields_check
CHECK (
  (is_segment = false) OR
  (is_segment = true AND segment_group_id IS NOT NULL AND segment_order IS NOT NULL)
);

-- segment_order must be positive
ALTER TABLE videos
ADD CONSTRAINT videos_segment_order_check
CHECK (segment_order IS NULL OR segment_order > 0);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  videos_count INTEGER;
  segments_count INTEGER;
BEGIN
  -- Get table counts
  SELECT COUNT(*) INTO videos_count FROM videos;
  SELECT COUNT(*) INTO segments_count FROM video_segments;

  -- Log results
  RAISE NOTICE '=== Add Segment Fields to Videos Migration ===';
  RAISE NOTICE '✅ segment_id column added (references video_segments)';
  RAISE NOTICE '✅ is_segment boolean flag added';
  RAISE NOTICE '✅ segment_group_id column added (references segment_groups)';
  RAISE NOTICE '✅ segment_order column added';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '   - Segment lookup';
  RAISE NOTICE '   - Segment filtering';
  RAISE NOTICE '   - Segment group + order (primary UI query)';
  RAISE NOTICE '   - User segment videos';
  RAISE NOTICE '✅ Constraints added for data consistency';
  RAISE NOTICE '   - segment_id → is_segment must be true';
  RAISE NOTICE '   - is_segment = true → must have segment_group_id + segment_order';
  RAISE NOTICE '   - segment_order must be positive';
  RAISE NOTICE '';
  RAISE NOTICE 'Total videos: % (none should be segments yet)', videos_count;
  RAISE NOTICE 'Total video_segments: %', segments_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Implement episode segmentation algorithm';
  RAISE NOTICE '2. Create API endpoint for segment generation';
  RAISE NOTICE '3. Build segment group UI components';
  RAISE NOTICE '4. Test full workflow: Episode → Segments → Videos';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
