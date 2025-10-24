-- Verification Queries for Decoupled Model Migration
-- Run these after the migration to ensure everything is correct

-- 1. Verify all series have user_id
SELECT 'Series without user_id:' as check_name, COUNT(*) as count
FROM public.series
WHERE user_id IS NULL;
-- Expected: 0

-- 2. Verify all videos have user_id
SELECT 'Videos without user_id:' as check_name, COUNT(*) as count
FROM public.videos
WHERE user_id IS NULL;
-- Expected: 0

-- 3. Verify no orphaned videos (must have project OR series)
SELECT 'Orphaned videos:' as check_name, COUNT(*) as count
FROM public.videos
WHERE project_id IS NULL AND series_id IS NULL;
-- Expected: 0

-- 4. Count series by relationship status
SELECT
  'Series distribution' as check_name,
  COUNT(*) FILTER (WHERE project_id IS NOT NULL) as with_project,
  COUNT(*) FILTER (WHERE project_id IS NULL) as standalone,
  COUNT(*) as total
FROM public.series;

-- 5. Count videos by relationship status
SELECT
  'Video distribution' as check_name,
  COUNT(*) FILTER (WHERE project_id IS NOT NULL AND series_id IS NOT NULL) as both,
  COUNT(*) FILTER (WHERE project_id IS NOT NULL AND series_id IS NULL) as project_only,
  COUNT(*) FILTER (WHERE project_id IS NULL AND series_id IS NOT NULL) as series_only,
  COUNT(*) as total
FROM public.videos;

-- 6. Verify indexes were created
SELECT
  'Indexes' as check_name,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('series', 'videos', 'projects')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 7. Verify RLS policies are in place
SELECT
  'RLS Policies' as check_name,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('series', 'videos')
  AND policyname LIKE '%own%'
ORDER BY tablename, cmd;

-- 8. Verify helper functions exist
SELECT
  'Helper Functions' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('get_series_videos', 'get_project_videos')
ORDER BY proname;

-- 9. Test helper function (if you have data)
-- SELECT * FROM get_series_videos('your-series-uuid-here') LIMIT 5;
-- SELECT * FROM get_project_videos('your-project-uuid-here') LIMIT 5;

-- 10. Summary report
SELECT
  '=== MIGRATION VERIFICATION SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM public.series) as total_series,
  (SELECT COUNT(*) FROM public.videos) as total_videos,
  (SELECT COUNT(*) FROM public.projects) as total_projects,
  (SELECT COUNT(*) FROM public.series WHERE user_id IS NULL) as series_missing_user_id,
  (SELECT COUNT(*) FROM public.videos WHERE user_id IS NULL) as videos_missing_user_id,
  (SELECT COUNT(*) FROM public.videos WHERE project_id IS NULL AND series_id IS NULL) as orphaned_videos;
