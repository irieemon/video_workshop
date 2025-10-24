-- Transfer all projects, series, and videos to test@example.com
-- Run this ONLY if you want test@example.com to own all existing data

-- STEP 1: Find test@example.com user_id
DO $$
DECLARE
  test_user_id UUID;
  old_user_ids UUID[];
BEGIN
  -- Get test@example.com user_id
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'test@example.com';

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'test@example.com user not found in auth.users';
  END IF;

  -- Get all current user_ids from projects
  SELECT ARRAY_AGG(DISTINCT user_id) INTO old_user_ids
  FROM public.projects;

  RAISE NOTICE 'Found test@example.com user_id: %', test_user_id;
  RAISE NOTICE 'Will transfer from user_ids: %', old_user_ids;

  -- Update all projects to test@example.com
  UPDATE public.projects
  SET user_id = test_user_id
  WHERE user_id = ANY(old_user_ids);

  -- Update all series to test@example.com
  UPDATE public.series
  SET user_id = test_user_id
  WHERE user_id = ANY(old_user_ids);

  -- Update all videos to test@example.com
  UPDATE public.videos
  SET user_id = test_user_id
  WHERE user_id = ANY(old_user_ids);

  RAISE NOTICE 'Transfer complete!';
  RAISE NOTICE 'Projects transferred: %', (SELECT COUNT(*) FROM public.projects WHERE user_id = test_user_id);
  RAISE NOTICE 'Series transferred: %', (SELECT COUNT(*) FROM public.series WHERE user_id = test_user_id);
  RAISE NOTICE 'Videos transferred: %', (SELECT COUNT(*) FROM public.videos WHERE user_id = test_user_id);
END $$;

-- Verify the transfer
SELECT 'Verification' as status,
  (SELECT COUNT(*) FROM public.projects WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')) as projects_count,
  (SELECT COUNT(*) FROM public.series WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')) as series_count,
  (SELECT COUNT(*) FROM public.videos WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')) as videos_count;
