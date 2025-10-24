-- Fix Series RLS Policy for INSERT
-- Issue: Users cannot create new series due to missing INSERT policy

-- Drop existing policies if they exist and recreate them properly
DROP POLICY IF EXISTS "Users can insert their own series" ON public.series;
DROP POLICY IF EXISTS "Users can view their own series" ON public.series;
DROP POLICY IF EXISTS "Users can update their own series" ON public.series;
DROP POLICY IF EXISTS "Users can delete their own series" ON public.series;

-- Enable RLS on series table (idempotent)
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to INSERT their own series
-- This allows creating standalone series (no project_id required)
CREATE POLICY "Users can insert their own series"
ON public.series
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 2: Allow users to SELECT their own series
-- This covers both standalone series and project-linked series
CREATE POLICY "Users can view their own series"
ON public.series
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Policy 3: Allow users to UPDATE their own series
CREATE POLICY "Users can update their own series"
ON public.series
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow users to DELETE their own series
CREATE POLICY "Users can delete their own series"
ON public.series
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify policies were created
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'series'
ORDER BY cmd;

-- Return success message
SELECT 'Series RLS policies fixed successfully!' as status;
