-- Resume Decoupled Model Migration
-- This script safely resumes the migration from any partial state

-- ============================================================================
-- STEP 1: Add user_id to series (if not exists)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.series
        ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Populate user_id from existing project relationships (safe to run multiple times)
UPDATE public.series s
SET user_id = p.user_id
FROM public.projects p
WHERE s.project_id = p.id
  AND s.user_id IS NULL;

-- Make user_id NOT NULL (only if all rows have user_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM series WHERE user_id IS NULL) THEN
        ALTER TABLE public.series
        ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Make series.project_id nullable
-- ============================================================================
ALTER TABLE public.series
ALTER COLUMN project_id DROP NOT NULL;

-- ============================================================================
-- STEP 3: Make videos.project_id nullable
-- ============================================================================
ALTER TABLE public.videos
ALTER COLUMN project_id DROP NOT NULL;

-- ============================================================================
-- STEP 4: Add default_series_id to projects (if not exists)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'default_series_id'
    ) THEN
        ALTER TABLE public.projects
        ADD COLUMN default_series_id UUID REFERENCES public.series(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Add user_id to videos (if not exists)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Populate videos.user_id from project relationships
UPDATE public.videos v
SET user_id = p.user_id
FROM public.projects p
WHERE v.project_id = p.id
  AND v.user_id IS NULL;

-- For videos without projects, try series relationship
UPDATE public.videos v
SET user_id = s.user_id
FROM public.series s
WHERE v.series_id = s.id
  AND v.user_id IS NULL;

-- Make user_id NOT NULL (only if all rows have user_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM videos WHERE user_id IS NULL) THEN
        ALTER TABLE public.videos
        ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Add indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_series_user_id ON public.series(user_id);
CREATE INDEX IF NOT EXISTS idx_series_project_id ON public.series(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON public.videos(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_series_id ON public.videos(series_id);

-- ============================================================================
-- STEP 7: Update RLS Policies for series
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own series" ON public.series;
DROP POLICY IF EXISTS "Users can create series in their projects" ON public.series;
DROP POLICY IF EXISTS "Users can update their own series" ON public.series;
DROP POLICY IF EXISTS "Users can delete their own series" ON public.series;

-- Create new policies using direct user_id
CREATE POLICY "Users can view their own series"
  ON public.series FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own series"
  ON public.series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own series"
  ON public.series FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own series"
  ON public.series FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: Update RLS Policies for videos
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view videos in their projects" ON public.videos;
DROP POLICY IF EXISTS "Users can create videos in their projects" ON public.videos;
DROP POLICY IF EXISTS "Users can update videos in their projects" ON public.videos;
DROP POLICY IF EXISTS "Users can delete videos in their projects" ON public.videos;

-- Create new policies using direct user_id
CREATE POLICY "Users can view their own videos"
  ON public.videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos"
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Migration completed successfully!' as status;
