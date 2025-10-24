-- Check if profiles table is in sync with auth.users

-- 1. Check all users in auth.users
SELECT 'Auth Users' as table_name, id, email, created_at
FROM auth.users
ORDER BY created_at;

-- 2. Check all profiles
SELECT 'Profiles' as table_name, id, email, created_at
FROM public.profiles
ORDER BY created_at;

-- 3. Find users in auth.users but not in profiles
SELECT 'Users missing from profiles' as issue,
  u.id,
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Check if test@example.com has a profile
SELECT 'test@example.com profile check' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'test@example.com') THEN 'Profile exists'
    ELSE 'MISSING PROFILE - This is the problem!'
  END as status,
  (SELECT id FROM auth.users WHERE email = 'test@example.com') as auth_user_id,
  (SELECT id FROM public.profiles WHERE email = 'test@example.com') as profile_id;

-- 5. Current session info
SELECT 'Current session' as info,
  auth.uid() as session_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as session_email;
