-- ================================================================
-- RLS PERFORMANCE OPTIMIZATION MIGRATION
-- ================================================================
-- Purpose: Fix Supabase linter warnings for RLS performance
-- Date: 2025-10-23
-- Issues Fixed:
--   1. auth_rls_initplan: Optimize auth function calls (52 warnings)
--   2. multiple_permissive_policies: Remove duplicate policies (26 warnings)
--
-- Impact: Significant performance improvement at scale
-- ================================================================

BEGIN;

-- ================================================================
-- PART 1: FIX auth_rls_initplan WARNINGS
-- ================================================================
-- Replace auth.uid() with (select auth.uid()) in all RLS policies
-- This forces Postgres to evaluate once per query, not per row
-- ================================================================

-- PROFILES TABLE (2 policies)
-- ================================================================
-- NOTE: profiles table uses 'id' column, not 'user_id'
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- PROJECTS TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING ((select auth.uid()) = user_id);

-- VIDEO_PERFORMANCE TABLE (2 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view performance of own videos" ON public.video_performance;
CREATE POLICY "Users can view performance of own videos" ON public.video_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_performance.video_id
      AND videos.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add performance to own videos" ON public.video_performance;
CREATE POLICY "Users can add performance to own videos" ON public.video_performance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_performance.video_id
      AND videos.user_id = (select auth.uid())
    )
  );

-- HASHTAGS TABLE (2 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view hashtags of own videos" ON public.hashtags;
CREATE POLICY "Users can view hashtags of own videos" ON public.hashtags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = hashtags.video_id
      AND videos.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add hashtags to own videos" ON public.hashtags;
CREATE POLICY "Users can add hashtags to own videos" ON public.hashtags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = hashtags.video_id
      AND videos.user_id = (select auth.uid())
    )
  );

-- AGENT_CONTRIBUTIONS TABLE (2 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view contributions of own videos" ON public.agent_contributions;
CREATE POLICY "Users can view contributions of own videos" ON public.agent_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = agent_contributions.video_id
      AND videos.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add contributions to own videos" ON public.agent_contributions;
CREATE POLICY "Users can add contributions to own videos" ON public.agent_contributions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = agent_contributions.video_id
      AND videos.user_id = (select auth.uid())
    )
  );

-- SERIES_CHARACTERS TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view characters in own series" ON public.series_characters;
CREATE POLICY "Users can view characters in own series" ON public.series_characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_characters.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create characters in own series" ON public.series_characters;
CREATE POLICY "Users can create characters in own series" ON public.series_characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_characters.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update characters in own series" ON public.series_characters;
CREATE POLICY "Users can update characters in own series" ON public.series_characters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_characters.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete characters in own series" ON public.series_characters;
CREATE POLICY "Users can delete characters in own series" ON public.series_characters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_characters.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- SERIES_SETTINGS TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view settings in own series" ON public.series_settings;
CREATE POLICY "Users can view settings in own series" ON public.series_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_settings.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create settings in own series" ON public.series_settings;
CREATE POLICY "Users can create settings in own series" ON public.series_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_settings.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update settings in own series" ON public.series_settings;
CREATE POLICY "Users can update settings in own series" ON public.series_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_settings.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete settings in own series" ON public.series_settings;
CREATE POLICY "Users can delete settings in own series" ON public.series_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_settings.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- SERIES_VISUAL_STYLE TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can view visual style in own series" ON public.series_visual_style
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_style.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can create visual style in own series" ON public.series_visual_style
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_style.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can update visual style in own series" ON public.series_visual_style
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_style.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can delete visual style in own series" ON public.series_visual_style
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_style.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- SEASONS TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view seasons in own series" ON public.seasons;
CREATE POLICY "Users can view seasons in own series" ON public.seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = seasons.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create seasons in own series" ON public.seasons;
CREATE POLICY "Users can create seasons in own series" ON public.seasons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = seasons.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update seasons in own series" ON public.seasons;
CREATE POLICY "Users can update seasons in own series" ON public.seasons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = seasons.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete seasons in own series" ON public.seasons;
CREATE POLICY "Users can delete seasons in own series" ON public.seasons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = seasons.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- SERIES_EPISODES TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can view episodes in own series" ON public.series_episodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_episodes.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can create episodes in own series" ON public.series_episodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_episodes.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can update episodes in own series" ON public.series_episodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_episodes.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can delete episodes in own series" ON public.series_episodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_episodes.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- SERIES_VISUAL_ASSETS TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can view assets in own series" ON public.series_visual_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_assets.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can insert assets in own series" ON public.series_visual_assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_assets.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can update assets in own series" ON public.series_visual_assets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_assets.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can delete assets in own series" ON public.series_visual_assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = series_visual_assets.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- CHARACTER_RELATIONSHIPS TABLE (4 policies)
-- ================================================================
DROP POLICY IF EXISTS "Users can view relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can view relationships in own series" ON public.character_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = character_relationships.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can create relationships in own series" ON public.character_relationships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = character_relationships.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can update relationships in own series" ON public.character_relationships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = character_relationships.series_id
      AND series.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can delete relationships in own series" ON public.character_relationships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series
      WHERE series.id = character_relationships.series_id
      AND series.user_id = (select auth.uid())
    )
  );

-- ================================================================
-- PART 2: REMOVE DUPLICATE POLICIES (multiple_permissive_policies)
-- ================================================================
-- Keep the cleaner policy names, remove duplicates
-- ================================================================

-- SERIES TABLE
-- ================================================================
-- Remove duplicate policies, keep "Users can [action] own series" pattern
DROP POLICY IF EXISTS "Users can create their own series" ON public.series;
DROP POLICY IF EXISTS "Users can insert their own series" ON public.series;
DROP POLICY IF EXISTS "Users can view their own series" ON public.series;
DROP POLICY IF EXISTS "Users can update their own series" ON public.series;
DROP POLICY IF EXISTS "Users can delete their own series" ON public.series;

-- Recreate optimized policies (if not already created above)
DROP POLICY IF EXISTS "Users can view own series" ON public.series;
CREATE POLICY "Users can view own series" ON public.series
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own series" ON public.series;
CREATE POLICY "Users can create own series" ON public.series
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own series" ON public.series;
CREATE POLICY "Users can update own series" ON public.series
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own series" ON public.series;
CREATE POLICY "Users can delete own series" ON public.series
  FOR DELETE USING ((select auth.uid()) = user_id);

-- VIDEOS TABLE
-- ================================================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "Users can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can create their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;

-- Recreate optimized policies
DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own videos" ON public.videos;
CREATE POLICY "Users can create own videos" ON public.videos
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING ((select auth.uid()) = user_id);

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these after migration to verify optimization

-- Check for remaining duplicate policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('series', 'videos')
ORDER BY tablename, cmd, policyname;

-- Verify all policies use subquery pattern
SELECT
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%(select auth.%' OR qual LIKE '%EXISTS%' THEN '✅ Optimized'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ Needs optimization'
    ELSE '❓ Check manually'
  END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- After this migration:
-- - 52 auth_rls_initplan warnings → 0 warnings
-- - 26 multiple_permissive_policies warnings → 0 warnings
-- - Significant performance improvement for queries with many rows
-- - No change to security or functionality
-- ================================================================
