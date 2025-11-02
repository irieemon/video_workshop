-- Create video_segments table for multi-segment episode video generation
-- This enables breaking episodes into sequential 10-second TikTok videos with continuity
-- Part of Multi-Segment Video Generation Feature (Phase 1)

-- ============================================================================
-- Create video_segments table
-- ============================================================================

CREATE TABLE video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  segment_number INTEGER NOT NULL,

  -- Source screenplay data
  scene_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  start_timestamp NUMERIC NOT NULL,
  end_timestamp NUMERIC NOT NULL,
  estimated_duration NUMERIC NOT NULL,

  -- Narrative context
  narrative_beat TEXT NOT NULL,
  narrative_transition TEXT,

  -- Screenplay content
  dialogue_lines JSONB DEFAULT '[]'::jsonb,
  action_beats TEXT[] DEFAULT ARRAY[]::TEXT[],
  characters_in_segment TEXT[] DEFAULT ARRAY[]::TEXT[],
  settings_in_segment TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Continuity chain (linked list structure)
  preceding_segment_id UUID REFERENCES video_segments(id) ON DELETE SET NULL,
  following_segment_id UUID REFERENCES video_segments(id) ON DELETE SET NULL,
  visual_continuity_notes TEXT,

  -- Context state (extracted after prompt generation for next segment)
  final_visual_state JSONB,
  -- Example structure:
  -- {
  --   "final_frame_description": "Character stands at doorway, hand on knob",
  --   "character_positions": {
  --     "char-uuid-1": "center frame, facing camera",
  --     "char-uuid-2": "background left, turned away"
  --   },
  --   "lighting_state": "golden hour, warm sunset glow through window",
  --   "camera_position": "medium shot, slightly low angle"
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(episode_id, segment_number),
  CHECK (segment_number > 0),
  CHECK (start_timestamp >= 0),
  CHECK (end_timestamp > start_timestamp),
  CHECK (estimated_duration > 0),
  CHECK (estimated_duration <= 15)  -- Sora max duration
);

-- Add comments for documentation
COMMENT ON TABLE video_segments IS 'Segments of episodes broken down into ~10-second narrative beats for sequential video generation';
COMMENT ON COLUMN video_segments.segment_number IS 'Sequential number within episode (1, 2, 3...)';
COMMENT ON COLUMN video_segments.scene_ids IS 'Array of scene IDs from episode screenplay that this segment covers';
COMMENT ON COLUMN video_segments.start_timestamp IS 'Start time in seconds from episode beginning';
COMMENT ON COLUMN video_segments.end_timestamp IS 'End time in seconds from episode beginning';
COMMENT ON COLUMN video_segments.estimated_duration IS 'Expected duration of generated video in seconds';
COMMENT ON COLUMN video_segments.narrative_beat IS 'Story purpose of this segment (e.g., "Hero discovers secret door")';
COMMENT ON COLUMN video_segments.narrative_transition IS 'How this segment transitions from previous (e.g., "Camera follows character through doorway")';
COMMENT ON COLUMN video_segments.dialogue_lines IS 'JSON array of dialogue lines in this segment with character IDs';
COMMENT ON COLUMN video_segments.action_beats IS 'Array of action descriptions in this segment';
COMMENT ON COLUMN video_segments.characters_in_segment IS 'Array of character UUIDs present in this segment';
COMMENT ON COLUMN video_segments.settings_in_segment IS 'Array of setting UUIDs used in this segment';
COMMENT ON COLUMN video_segments.preceding_segment_id IS 'Link to previous segment for continuity chain (NULL for first segment)';
COMMENT ON COLUMN video_segments.following_segment_id IS 'Link to next segment for continuity chain (NULL for last segment)';
COMMENT ON COLUMN video_segments.visual_continuity_notes IS 'Notes about visual elements that must stay consistent from previous segment';
COMMENT ON COLUMN video_segments.final_visual_state IS 'Extracted visual state at end of segment for continuity propagation to next segment';

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Primary query pattern: fetch all segments for an episode
CREATE INDEX idx_segments_episode ON video_segments(episode_id, segment_number);

-- Continuity chain traversal
CREATE INDEX idx_segments_chain_preceding ON video_segments(preceding_segment_id);
CREATE INDEX idx_segments_chain_following ON video_segments(following_segment_id);

-- Character/setting queries
CREATE INDEX idx_segments_characters ON video_segments USING GIN(characters_in_segment);
CREATE INDEX idx_segments_settings ON video_segments USING GIN(settings_in_segment);

-- ============================================================================
-- Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_video_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_segments_updated_at_trigger
BEFORE UPDATE ON video_segments
FOR EACH ROW
EXECUTE FUNCTION update_video_segments_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE video_segments ENABLE ROW LEVEL SECURITY;

-- Users can only access segments from their own episodes
CREATE POLICY video_segments_select_policy ON video_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      WHERE episodes.id = video_segments.episode_id
      AND episodes.user_id = auth.uid()
    )
  );

-- Users can only insert segments for their own episodes
CREATE POLICY video_segments_insert_policy ON video_segments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM episodes
      WHERE episodes.id = video_segments.episode_id
      AND episodes.user_id = auth.uid()
    )
  );

-- Users can only update their own segments
CREATE POLICY video_segments_update_policy ON video_segments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      WHERE episodes.id = video_segments.episode_id
      AND episodes.user_id = auth.uid()
    )
  );

-- Users can only delete their own segments
CREATE POLICY video_segments_delete_policy ON video_segments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      WHERE episodes.id = video_segments.episode_id
      AND episodes.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  episodes_count INTEGER;
BEGIN
  -- Get table counts
  SELECT COUNT(*) INTO episodes_count FROM episodes;

  -- Log results
  RAISE NOTICE '=== Video Segments Table Migration ===';
  RAISE NOTICE '✅ video_segments table created';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '   - Episode + segment number lookup';
  RAISE NOTICE '   - Continuity chain traversal';
  RAISE NOTICE '   - Character/setting GIN indexes';
  RAISE NOTICE '✅ updated_at trigger created';
  RAISE NOTICE '✅ Row Level Security (RLS) enabled';
  RAISE NOTICE '   - Users can only access their own episode segments';
  RAISE NOTICE '';
  RAISE NOTICE 'Total episodes available: %', episodes_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create segment_groups table for grouping segments';
  RAISE NOTICE '2. Alter videos table to add segment reference fields';
  RAISE NOTICE '3. Implement episode segmentation algorithm';
  RAISE NOTICE '4. Create API endpoints for segment generation';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
