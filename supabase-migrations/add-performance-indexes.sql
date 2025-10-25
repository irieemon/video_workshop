-- Performance Optimization: Add Missing Indexes
-- This migration adds indexes for foreign keys and frequently queried columns
-- to improve query performance and eliminate N+1 query problems

-- ============================================================
-- SERIES TABLE INDEXES
-- ============================================================

-- Index for project_id foreign key (used in joins and filters)
CREATE INDEX IF NOT EXISTS idx_series_project_id
ON series(project_id)
WHERE project_id IS NOT NULL;

-- Index for user_id (used for authorization and user-specific queries)
CREATE INDEX IF NOT EXISTS idx_series_user_id
ON series(user_id);

-- Composite index for common query pattern (user + created_at for sorting)
CREATE INDEX IF NOT EXISTS idx_series_user_created
ON series(user_id, created_at DESC);

-- ============================================================
-- SERIES_CHARACTERS TABLE INDEXES
-- ============================================================

-- Index for series_id foreign key (used in count queries and joins)
CREATE INDEX IF NOT EXISTS idx_series_characters_series_id
ON series_characters(series_id);

-- Composite index for series + name lookup
CREATE INDEX IF NOT EXISTS idx_series_characters_series_name
ON series_characters(series_id, name);

-- ============================================================
-- SERIES_SETTINGS TABLE INDEXES
-- ============================================================

-- Index for series_id foreign key (used in count queries and joins)
CREATE INDEX IF NOT EXISTS idx_series_settings_series_id
ON series_settings(series_id);

-- Composite index for series + name lookup
CREATE INDEX IF NOT EXISTS idx_series_settings_series_name
ON series_settings(series_id, name);

-- ============================================================
-- SERIES_EPISODES TABLE INDEXES
-- ============================================================

-- Index for series_id foreign key (used in count queries and joins)
CREATE INDEX IF NOT EXISTS idx_series_episodes_series_id
ON series_episodes(series_id);

-- Composite index for series + season + episode number (common sorting)
CREATE INDEX IF NOT EXISTS idx_series_episodes_ordering
ON series_episodes(series_id, season_number, episode_number);

-- ============================================================
-- CHARACTER_RELATIONSHIPS TABLE INDEXES
-- ============================================================

-- Index for series_id (used for fetching all relationships in a series)
CREATE INDEX IF NOT EXISTS idx_character_relationships_series_id
ON character_relationships(series_id);

-- Index for character_a_id (used in relationship lookups)
CREATE INDEX IF NOT EXISTS idx_character_relationships_char_a
ON character_relationships(character_a_id);

-- Index for character_b_id (used in relationship lookups)
CREATE INDEX IF NOT EXISTS idx_character_relationships_char_b
ON character_relationships(character_b_id);

-- Composite index for efficient bidirectional relationship lookups
CREATE INDEX IF NOT EXISTS idx_character_relationships_both
ON character_relationships(character_a_id, character_b_id);

-- ============================================================
-- SERIES_VISUAL_ASSETS TABLE INDEXES
-- ============================================================

-- Index for series_id foreign key
CREATE INDEX IF NOT EXISTS idx_series_visual_assets_series_id
ON series_visual_assets(series_id);

-- Composite index for series + display order (used for ordered queries)
CREATE INDEX IF NOT EXISTS idx_series_visual_assets_ordering
ON series_visual_assets(series_id, display_order);

-- Index for asset_type (used for filtering by type)
CREATE INDEX IF NOT EXISTS idx_series_visual_assets_type
ON series_visual_assets(asset_type);

-- ============================================================
-- VIDEOS TABLE INDEXES
-- ============================================================

-- Index for project_id foreign key
CREATE INDEX IF NOT EXISTS idx_videos_project_id
ON videos(project_id);

-- Index for series_id foreign key
CREATE INDEX IF NOT EXISTS idx_videos_series_id
ON videos(series_id)
WHERE series_id IS NOT NULL;

-- Index for user_id
CREATE INDEX IF NOT EXISTS idx_videos_user_id
ON videos(user_id);

-- Composite index for user + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_videos_user_created
ON videos(user_id, created_at DESC);

-- Composite index for project + created_at
CREATE INDEX IF NOT EXISTS idx_videos_project_created
ON videos(project_id, created_at DESC);

-- ============================================================
-- PROJECTS TABLE INDEXES
-- ============================================================

-- Index for user_id (used in authorization and user-specific queries)
CREATE INDEX IF NOT EXISTS idx_projects_user_id
ON projects(user_id);

-- Composite index for user + updated_at (common sorting)
CREATE INDEX IF NOT EXISTS idx_projects_user_updated
ON projects(user_id, updated_at DESC);

-- ============================================================
-- HASHTAGS TABLE INDEXES
-- ============================================================

-- Index for video_id foreign key
CREATE INDEX IF NOT EXISTS idx_hashtags_video_id
ON hashtags(video_id);

-- Index for tag (used for tag searches)
CREATE INDEX IF NOT EXISTS idx_hashtags_tag
ON hashtags(tag);

-- ============================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================

-- Update statistics for better query planning
ANALYZE series;
ANALYZE series_characters;
ANALYZE series_settings;
ANALYZE series_episodes;
ANALYZE character_relationships;
ANALYZE series_visual_assets;
ANALYZE videos;
ANALYZE projects;
ANALYZE hashtags;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Run this to verify indexes were created:
-- SELECT
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
