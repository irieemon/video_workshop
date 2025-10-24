-- QUICK DIAGNOSTIC - Run this immediately

-- 1. Is data in database?
SELECT 'Data Check' as test,
  (SELECT COUNT(*) FROM public.projects) as projects_count,
  (SELECT COUNT(*) FROM public.series) as series_count,
  (SELECT COUNT(*) FROM public.videos) as videos_count;

-- 2. Am I authenticated?
SELECT 'Auth Check' as test,
  auth.uid() as current_user_id,
  CASE
    WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED - LOG IN AGAIN'
    ELSE 'Authenticated'
  END as auth_status;

-- 3. Do user_ids match?
SELECT 'User ID Match Check' as test,
  (SELECT DISTINCT user_id FROM public.projects LIMIT 1) as project_user_id,
  auth.uid() as my_current_user_id,
  CASE
    WHEN (SELECT user_id FROM public.projects LIMIT 1) = auth.uid() THEN 'MATCH - Should see data'
    WHEN auth.uid() IS NULL THEN 'NOT LOGGED IN'
    ELSE 'MISMATCH - This is the problem!'
  END as diagnosis;

-- 4. Show me what user_ids exist in projects
SELECT 'Existing User IDs' as info,
  user_id,
  COUNT(*) as project_count
FROM public.projects
GROUP BY user_id;
