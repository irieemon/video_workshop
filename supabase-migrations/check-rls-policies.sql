-- Check RLS policies for projects, series, videos

-- 1. Check if RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'series', 'videos')
ORDER BY tablename;

-- 2. Show all policies for these tables
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'series', 'videos')
ORDER BY tablename, cmd, policyname;

-- 3. Test if current user can see projects
SELECT 'Current user projects test' as test,
  auth.uid() as my_user_id,
  (SELECT COUNT(*) FROM public.projects) as total_projects_in_db,
  (SELECT COUNT(*) FROM public.projects WHERE user_id = auth.uid()) as my_projects;

-- 4. Show actual project data
SELECT
  id,
  name,
  user_id,
  CASE
    WHEN user_id = auth.uid() THEN 'MY PROJECT'
    ELSE 'NOT MINE'
  END as ownership
FROM public.projects
ORDER BY created_at;
