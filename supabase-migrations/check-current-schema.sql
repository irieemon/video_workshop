-- Check current schema state to determine what migration steps are needed

-- Check series table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'series'
ORDER BY ordinal_position;

-- Check videos table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'videos'
ORDER BY ordinal_position;

-- Check projects table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- Check if data exists in series.user_id
SELECT
  COUNT(*) as total_series,
  COUNT(user_id) as with_user_id,
  COUNT(project_id) as with_project_id
FROM series;

-- Check if data exists in videos.user_id
SELECT
  COUNT(*) as total_videos,
  COUNT(user_id) as with_user_id,
  COUNT(project_id) as with_project_id,
  COUNT(series_id) as with_series_id
FROM videos;
