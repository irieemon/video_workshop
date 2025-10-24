-- MANUAL FIX: Convert TEXT columns to JSONB step by step
-- Run this BEFORE creating the enhanced trigger

-- Step 1: Remove existing trigger (if present)
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
DROP FUNCTION IF EXISTS update_character_sora_template();

-- Step 2: Check current column types
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- Step 3: Convert visual_fingerprint from TEXT to JSONB
ALTER TABLE series_characters
ALTER COLUMN visual_fingerprint TYPE JSONB USING
    CASE
        WHEN visual_fingerprint IS NULL THEN NULL
        WHEN visual_fingerprint = '' THEN '{}'::jsonb
        WHEN visual_fingerprint ~ '^[\s]*\{.*\}[\s]*$' THEN visual_fingerprint::jsonb
        ELSE '{}'::jsonb
    END;

-- Step 4: Convert voice_profile from TEXT to JSONB
ALTER TABLE series_characters
ALTER COLUMN voice_profile TYPE JSONB USING
    CASE
        WHEN voice_profile IS NULL THEN NULL
        WHEN voice_profile = '' THEN '{}'::jsonb
        WHEN voice_profile ~ '^[\s]*\{.*\}[\s]*$' THEN voice_profile::jsonb
        ELSE '{}'::jsonb
    END;

-- Step 5: Verify conversion worked
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- Step 6: Check existing data to ensure no data loss
SELECT
    id,
    name,
    visual_fingerprint,
    voice_profile,
    sora_prompt_template
FROM series_characters
LIMIT 5;

SELECT '✅ Column types converted: TEXT → JSONB' as status;
SELECT 'visual_fingerprint: ' || (SELECT data_type FROM information_schema.columns WHERE table_name = 'series_characters' AND column_name = 'visual_fingerprint') as visual_check;
SELECT 'voice_profile: ' || (SELECT data_type FROM information_schema.columns WHERE table_name = 'series_characters' AND column_name = 'voice_profile') as voice_check;
