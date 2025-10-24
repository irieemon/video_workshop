-- Find the user_id for test@example.com

-- 1. Check auth.users table
SELECT id, email, created_at
FROM auth.users
WHERE email = 'test@example.com';

-- 2. Check what user_id the current session has
SELECT auth.uid() as current_session_user_id;

-- 3. See which projects belong to which users
SELECT
  p.id,
  p.name,
  p.user_id,
  u.email
FROM public.projects p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- 4. Check series table as well
SELECT
  s.id,
  s.name,
  s.user_id,
  s.project_id,
  u.email
FROM public.series s
LEFT JOIN auth.users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
