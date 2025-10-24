-- ================================================================
-- DATABASE PERFORMANCE OPTIMIZATION MIGRATION
-- ================================================================
-- Purpose: Fix performance issues identified by Supabase linter
-- Date: 2025-10-23
-- Issues Addressed:
--   1. Unindexed Foreign Keys (2 warnings) - ADD INDEXES
--   2. Unused Indexes (24 warnings) - MONITOR ONLY (development stage)
-- Performance Impact: Faster JOIN operations, better query optimization
-- ================================================================

BEGIN;

-- ================================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ================================================================
-- Foreign keys without indexes cause slow JOINs and lookups.
-- PostgreSQL cannot efficiently enforce referential integrity without indexes.
-- ================================================================

-- Index 1: series_characters.introduced_episode_id
-- ================================================================
-- Purpose: Speed up JOINs between series_characters and series_episodes
-- Use case: When looking up character introductions by episode
-- Impact: Essential for character timeline queries
CREATE INDEX IF NOT EXISTS idx_series_characters_intro_episode
ON public.series_characters(introduced_episode_id)
WHERE introduced_episode_id IS NOT NULL;

-- Index 2: series_settings.introduced_episode_id
-- ================================================================
-- Purpose: Speed up JOINs between series_settings and series_episodes
-- Use case: When looking up setting introductions by episode
-- Impact: Essential for setting timeline queries
CREATE INDEX IF NOT EXISTS idx_series_settings_intro_episode
ON public.series_settings(introduced_episode_id)
WHERE introduced_episode_id IS NOT NULL;

COMMIT;

-- ================================================================
-- PART 2: UNUSED INDEX ANALYSIS (NO ACTION REQUIRED)
-- ================================================================
-- The following 24 indexes are currently unused but should be RETAINED:
--
-- REASON: Application is in active development
-- - Many features not yet implemented (seasons, episodes, relationships)
-- - Indexes are future-proofing for upcoming features
-- - Cost of maintaining unused indexes is low (24 indexes ~= 384 KB total)
-- - Benefit of having them when features launch is high
--
-- RECOMMENDATION: Re-evaluate after production launch with real traffic
-- ================================================================

-- CATEGORY: Series Management (Future Features)
-- ================================================================
-- idx_episodes_series          - For episode listings by series
-- idx_episodes_season          - For episode listings by season
-- idx_episodes_video           - For linking episodes to videos
-- idx_episodes_key             - For unique episode key lookups
-- idx_seasons_series           - For season listings by series
-- idx_visual_style_series      - For visual style by series lookups

-- CATEGORY: Character System (Recently Implemented)
-- ================================================================
-- idx_characters_visual_fingerprint  - For visual consistency matching
-- idx_characters_voice_profile       - For voice characteristic queries
-- idx_relationships_character_a      - For character A lookups
-- idx_relationships_character_b      - For character B lookups
-- idx_relationships_type             - For filtering by relationship type
-- idx_relationships_episode          - For relationship timeline queries
-- idx_relationships_interaction_context - For interaction history

-- CATEGORY: Video System (Partial Implementation)
-- ================================================================
-- idx_videos_series_id               - For videos by series (series feature new)
-- idx_videos_series_id_not_null      - For videos WITH series only
-- idx_videos_series_characters_used  - For character usage tracking
-- idx_videos_series_settings_used    - For setting usage tracking
-- idx_videos_user_id                 - For user video listings (has RLS)
-- idx_video_performance_video_id     - For performance metrics by video
-- idx_agent_contributions_video_id   - For agent contribution tracking

-- CATEGORY: Series Assets (New Feature)
-- ================================================================
-- idx_series_visual_assets_series_id - For asset listings by series
-- idx_series_visual_assets_type      - For filtering assets by type

-- CATEGORY: Multi-tenancy
-- ================================================================
-- idx_series_user_id                 - For series by user (has RLS, may use)
-- idx_projects_default_series_id     - For project default series lookups

-- ================================================================
-- INDEX MONITORING STRATEGY
-- ================================================================
-- Run this query monthly to identify truly dead indexes:
--
-- SELECT
--   schemaname,
--   relname as table,
--   indexrelname as index,
--   idx_scan as times_used,
--   pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND idx_scan = 0
--   AND indexrelname LIKE 'idx_%'
-- ORDER BY pg_relation_size(indexrelid) DESC;
--
-- Action thresholds:
-- - 0 scans after 3 months + feature unused → Consider removal
-- - 0 scans but feature in development → Keep
-- - <100 scans but feature used → Keep (small dataset, will grow)
-- ================================================================

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Verify new indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_series_characters_intro_episode',
    'idx_series_settings_intro_episode'
  )
ORDER BY tablename, indexname;

-- Check foreign key index coverage
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name as fk_name,
  CASE
    WHEN i.indexname IS NOT NULL THEN '✅ Indexed'
    ELSE '❌ Missing Index'
  END as index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN pg_indexes i
  ON i.tablename = tc.table_name
  AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('series_characters', 'series_settings')
ORDER BY tc.table_name, kcu.column_name;

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- After this migration:
-- - 2 new indexes created for unindexed foreign keys
-- - All foreign key constraints have covering indexes
-- - JOIN performance improved for episode introduction queries
-- - 24 unused indexes retained for future feature development
-- - No performance degradation (indexes only added, not removed)
-- ================================================================
