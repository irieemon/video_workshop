-- Phase 2 Database Cleanup (Simplified)
-- This script only drops legacy tables since episodes and videos already have Phase 2 schema

-- Drop legacy junction table
DROP TABLE IF EXISTS episode_video_mapping CASCADE;

-- Drop legacy project-series relationship table
DROP TABLE IF EXISTS project_series CASCADE;

-- Drop legacy series_episodes table
DROP TABLE IF EXISTS series_episodes CASCADE;

-- Verify cleanup
SELECT 'Phase 2 cleanup completed successfully!' as status;
