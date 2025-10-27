-- Migration: Add Admin Role System
-- Date: 2025-10-25
-- Description: Adds is_admin column to profiles table for admin privilege management
-- Impact: Enables admin users to bypass rate limits and access admin dashboard

-- Step 1: Add is_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 2: Create index for admin checks (performance optimization)
-- Only indexes rows where is_admin = TRUE (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
ON profiles(is_admin)
WHERE is_admin = TRUE;

-- Step 3: Add column comment for documentation
COMMENT ON COLUMN profiles.is_admin IS
'Admin privilege flag. Admins have unlimited video generations, access to admin dashboard, and can manage other users. Bypasses rate limiting and quota enforcement.';

-- Step 4: Set default admin user (test@example.com)
-- This will be the initial admin account for development/testing
-- Additional admins can be configured via ADMIN_EMAILS environment variable
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'test@example.com'
AND is_admin = FALSE; -- Only update if not already admin

-- Step 5: Create function to safely promote users to admin
-- This ensures only existing admins can grant admin privileges
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID, requesting_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_requester_admin BOOLEAN;
BEGIN
  -- Check if requesting user is admin
  SELECT is_admin INTO is_requester_admin
  FROM profiles
  WHERE id = requesting_user_id;

  IF NOT is_requester_admin THEN
    RAISE EXCEPTION 'Only admins can promote users to admin status';
  END IF;

  -- Promote target user
  UPDATE profiles
  SET is_admin = TRUE
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

-- Step 6: Create function to revoke admin privileges
CREATE OR REPLACE FUNCTION revoke_admin(target_user_id UUID, requesting_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_requester_admin BOOLEAN;
  admin_count INTEGER;
BEGIN
  -- Check if requesting user is admin
  SELECT is_admin INTO is_requester_admin
  FROM profiles
  WHERE id = requesting_user_id;

  IF NOT is_requester_admin THEN
    RAISE EXCEPTION 'Only admins can revoke admin status';
  END IF;

  -- Prevent revoking last admin (must always have at least 1 admin)
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE is_admin = TRUE;

  IF admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot revoke last admin. At least one admin must remain.';
  END IF;

  -- Revoke admin privileges
  UPDATE profiles
  SET is_admin = FALSE
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

-- Step 7: Add RLS policy for admin data access
-- Admins can view all profiles (for user management)
-- Regular users can only view their own profile
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- User can see their own profile OR user is admin
  auth.uid() = id
  OR
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = TRUE
);

-- Step 8: Grant execute permissions on admin functions
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_admin(UUID, UUID) TO authenticated;

-- Verification Query (optional - for testing)
-- SELECT email, is_admin, created_at FROM profiles WHERE is_admin = TRUE;
