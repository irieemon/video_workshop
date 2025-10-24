-- Migration: Decouple Series from Projects (Peer-Level Entities)
--
-- Purpose: Makes Series and Projects independent peer entities under User.
--          Videos can reference both, either, or neither for maximum flexibility.
--
-- Changes:
-- 1. Add user_id to series table (promote to top-level)
-- 2. Make series.project_id nullable (backward compatibility during migration)
-- 3. Make videos.project_id nullable (support series-only videos)
-- 4. Add optional default_series_id to projects (convenience feature)
-- 5. Update RLS policies for new hierarchy
-- 6. Migrate existing data to new structure

-- ============================================================================
-- STEP 1: Schema Changes
-- ============================================================================

-- 1.1: Add user_id to series table
ALTER TABLE public.series
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.2: Populate user_id from existing project relationships
UPDATE public.series s
SET user_id = p.user_id
FROM public.projects p
WHERE s.project_id = p.id;

-- 1.3: Make user_id NOT NULL after population
ALTER TABLE public.series
ALTER COLUMN user_id SET NOT NULL;

-- 1.4: Make project_id nullable (series no longer require projects)
ALTER TABLE public.series
ALTER COLUMN project_id DROP NOT NULL;

-- 1.5: Make videos.project_id nullable (videos can be series-only)
ALTER TABLE public.videos
ALTER COLUMN project_id DROP NOT NULL;

-- 1.6: Add optional default_series_id to projects
ALTER TABLE public.projects
ADD COLUMN default_series_id UUID REFERENCES public.series(id) ON DELETE SET NULL;

-- 1.7: Add user_id to videos for direct ownership (optional, for orphaned videos)
ALTER TABLE public.videos
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 1.8: Populate videos.user_id from project relationships
UPDATE public.videos v
SET user_id = p.user_id
FROM public.projects p
WHERE v.project_id = p.id;

-- 1.9: For videos without projects (shouldn't exist, but safety check)
UPDATE public.videos v
SET user_id = s.user_id
FROM public.series s
WHERE v.series_id = s.id
AND v.user_id IS NULL;

-- 1.10: Make videos.user_id NOT NULL
ALTER TABLE public.videos
ALTER COLUMN user_id SET NOT NULL;

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

CREATE INDEX idx_series_user_id ON public.series(user_id);
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_series_id_not_null ON public.videos(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_videos_project_id_not_null ON public.videos(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_projects_default_series_id ON public.projects(default_series_id) WHERE default_series_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Update Row-Level Security Policies
-- ============================================================================

-- 3.1: Series RLS Policies (now top-level under user)
DROP POLICY IF EXISTS "Users can view own series" ON public.series;
DROP POLICY IF EXISTS "Users can create series in own projects" ON public.series;
DROP POLICY IF EXISTS "Users can update own series" ON public.series;
DROP POLICY IF EXISTS "Users can delete own series" ON public.series;

CREATE POLICY "Users can view own series" ON public.series
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own series" ON public.series
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own series" ON public.series
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own series" ON public.series
  FOR DELETE USING (auth.uid() = user_id);

-- 3.2: Videos RLS Policies (now support user_id direct ownership)
DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can create videos in own projects" ON public.videos;
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;

CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: Add Constraints for Data Integrity
-- ============================================================================

-- 4.1: Ensure videos have at least project_id OR series_id (not orphaned)
ALTER TABLE public.videos
ADD CONSTRAINT videos_must_have_project_or_series
CHECK (project_id IS NOT NULL OR series_id IS NOT NULL);

-- 4.2: Ensure series-project relationship integrity (enforced by foreign keys and RLS)
-- Note: Cross-table validation moved to application layer and RLS policies
-- PostgreSQL CHECK constraints cannot use subqueries or reference other tables

-- 4.3: Ensure project-series relationship integrity (enforced by foreign keys and RLS)
-- Note: Cross-table validation moved to application layer and RLS policies
-- PostgreSQL CHECK constraints cannot use subqueries or reference other tables

-- ============================================================================
-- STEP 5: Create Helper Functions
-- ============================================================================

-- 5.1: Function to get all videos for a series (across all projects)
CREATE OR REPLACE FUNCTION get_series_videos(series_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  project_id UUID,
  project_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.project_id,
    p.name as project_name,
    v.created_at
  FROM public.videos v
  LEFT JOIN public.projects p ON v.project_id = p.id
  WHERE v.series_id = series_uuid
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2: Function to get all videos for a project (may span multiple series)
CREATE OR REPLACE FUNCTION get_project_videos(project_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  series_id UUID,
  series_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.series_id,
    s.name as series_name,
    v.created_at
  FROM public.videos v
  LEFT JOIN public.series s ON v.series_id = s.id
  WHERE v.project_id = project_uuid
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Migration Notes and Rollback
-- ============================================================================

-- ROLLBACK INSTRUCTIONS (if needed):
--
-- To rollback this migration:
-- 1. ALTER TABLE public.series ALTER COLUMN project_id SET NOT NULL;
-- 2. ALTER TABLE public.series DROP COLUMN user_id;
-- 3. ALTER TABLE public.videos ALTER COLUMN project_id SET NOT NULL;
-- 4. ALTER TABLE public.videos DROP COLUMN user_id;
-- 5. ALTER TABLE public.projects DROP COLUMN default_series_id;
-- 6. DROP CONSTRAINT videos_must_have_project_or_series;
-- 7. Restore original RLS policies
--
-- WARNING: This will only work if all series still have project_id populated
--          and all videos still have project_id populated.

-- ============================================================================
-- STEP 7: Verification Queries
-- ============================================================================

-- Verify all series have user_id
-- SELECT COUNT(*) FROM public.series WHERE user_id IS NULL;
-- Expected: 0

-- Verify all videos have user_id
-- SELECT COUNT(*) FROM public.videos WHERE user_id IS NULL;
-- Expected: 0

-- Verify videos have at least one reference
-- SELECT COUNT(*) FROM public.videos WHERE project_id IS NULL AND series_id IS NULL;
-- Expected: 0

-- Count series by relationship status
-- SELECT
--   COUNT(*) FILTER (WHERE project_id IS NOT NULL) as with_project,
--   COUNT(*) FILTER (WHERE project_id IS NULL) as standalone
-- FROM public.series;

-- Count videos by relationship status
-- SELECT
--   COUNT(*) FILTER (WHERE project_id IS NOT NULL AND series_id IS NOT NULL) as both,
--   COUNT(*) FILTER (WHERE project_id IS NOT NULL AND series_id IS NULL) as project_only,
--   COUNT(*) FILTER (WHERE project_id IS NULL AND series_id IS NOT NULL) as series_only
-- FROM public.videos;

COMMENT ON COLUMN public.series.user_id IS 'Direct user ownership - series are now top-level entities';
COMMENT ON COLUMN public.series.project_id IS 'Optional project association for organizational grouping';
COMMENT ON COLUMN public.videos.user_id IS 'Direct user ownership for orphan prevention';
COMMENT ON COLUMN public.videos.project_id IS 'Optional project association for workflow organization';
COMMENT ON COLUMN public.videos.series_id IS 'Optional series association for continuity tracking';
COMMENT ON COLUMN public.projects.default_series_id IS 'Optional default series when creating videos in this project';
