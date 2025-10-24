-- EMERGENCY DATA CHECK
-- Check if data still exists in database

-- 1. Check if projects table has data
SELECT 'PROJECTS' as table_name, COUNT(*) as row_count,
       COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id
FROM public.projects;

-- 2. Check if series table has data
SELECT 'SERIES' as table_name, COUNT(*) as row_count,
       COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id,
       COUNT(*) FILTER (WHERE project_id IS NOT NULL) as with_project
FROM public.series;

-- 3. Check if videos table has data
SELECT 'VIDEOS' as table_name, COUNT(*) as row_count,
       COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id,
       COUNT(*) FILTER (WHERE project_id IS NOT NULL) as with_project,
       COUNT(*) FILTER (WHERE series_id IS NOT NULL) as with_series
FROM public.videos;

-- 4. Show actual project records (first 10)
SELECT id, name, user_id, created_at
FROM public.projects
ORDER BY created_at DESC
LIMIT 10;

-- 5. Show actual series records (first 10)
SELECT id, name, user_id, project_id, created_at
FROM public.series
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check current user authentication
SELECT auth.uid() as current_user_id;

-- 7. Check if there's a user_id mismatch
SELECT
  'User ID Analysis' as check_name,
  (SELECT COUNT(DISTINCT user_id) FROM projects) as distinct_project_users,
  (SELECT COUNT(DISTINCT user_id) FROM series) as distinct_series_users,
  auth.uid() as current_authenticated_user;
