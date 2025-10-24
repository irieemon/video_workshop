-- Fix videos INSERT RLS policy to check through projects relationship
-- This fixes the "new row violates row-level security policy" error

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create own videos" ON public.videos;

-- Create new INSERT policy that checks through projects relationship
CREATE POLICY "Users can create own videos" ON public.videos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow insert if user owns the project
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = videos.project_id
      AND projects.user_id = auth.uid()
    )
    -- OR if user_id matches (for backwards compatibility)
    OR auth.uid() = user_id
  );

-- Verify the new policy
SELECT
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'videos'
  AND cmd = 'INSERT';
