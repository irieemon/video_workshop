-- EMERGENCY FIX: Remove Trigger + Fix Column Types
-- This completely removes the trigger issue and fixes columns
-- Run this in Supabase Studio SQL Editor if nothing else works

-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;

-- Step 2: Drop the trigger function
DROP FUNCTION IF EXISTS update_character_sora_template();

-- Step 3: Fix column types
DO $$
BEGIN
    -- Fix visual_fingerprint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters'
        AND column_name = 'visual_fingerprint'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE series_characters
        ALTER COLUMN visual_fingerprint TYPE JSONB USING
            CASE
                WHEN visual_fingerprint IS NULL OR visual_fingerprint = '' THEN '{}'::jsonb
                WHEN visual_fingerprint ~ '^[\s]*\{' THEN visual_fingerprint::jsonb
                ELSE '{}'::jsonb
            END;
        RAISE NOTICE 'Fixed visual_fingerprint: TEXT → JSONB';
    END IF;

    -- Fix voice_profile
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters'
        AND column_name = 'voice_profile'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE series_characters
        ALTER COLUMN voice_profile TYPE JSONB USING
            CASE
                WHEN voice_profile IS NULL OR voice_profile = '' THEN '{}'::jsonb
                WHEN voice_profile ~ '^[\s]*\{' THEN voice_profile::jsonb
                ELSE '{}'::jsonb
            END;
        RAISE NOTICE 'Fixed voice_profile: TEXT → JSONB';
    END IF;
END $$;

-- Step 4: Verify columns are now JSONB
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
ORDER BY column_name;

-- Step 5: Test that character creation works now
-- You can manually test by creating a character after running this

SELECT 'EMERGENCY FIX COMPLETE - Trigger removed, columns fixed' AS status;
SELECT 'You can now create characters. sora_prompt_template will NOT auto-generate (trigger removed)' AS note;
SELECT 'Run fix-column-types.sql later to restore trigger functionality' AS next_step;
