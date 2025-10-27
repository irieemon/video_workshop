-- Add theme preference to user profiles
-- Supports: 'light', 'dark', 'system'

-- Add theme_preference column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'));
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_theme_preference ON profiles(theme_preference);

-- Update RLS policies to allow users to read/update their theme preference
-- (Assuming profiles table already has RLS policies for user access)

COMMENT ON COLUMN profiles.theme_preference IS 'User theme preference: light, dark, or system (follows OS)';
