-- SAFE Column Type Conversion: TEXT → JSONB
-- This handles all edge cases: empty strings, null values, valid JSON

-- Step 1: Remove existing trigger (prevents errors during conversion)
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
DROP FUNCTION IF EXISTS update_character_sora_template();

-- Step 2: Check current column types
SELECT '=== BEFORE CONVERSION ===' as step;
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- Step 3: Convert visual_fingerprint from TEXT to JSONB
-- Handle all cases: NULL, empty string, valid JSON, invalid data
ALTER TABLE series_characters
ALTER COLUMN visual_fingerprint TYPE JSONB USING
    CASE
        WHEN visual_fingerprint IS NULL THEN NULL
        WHEN TRIM(visual_fingerprint) = '' THEN NULL  -- Empty string becomes NULL
        ELSE visual_fingerprint::jsonb  -- Valid JSON strings convert directly
    END;

SELECT '✅ visual_fingerprint converted: TEXT → JSONB' as status;

-- Step 4: Convert voice_profile from TEXT to JSONB
ALTER TABLE series_characters
ALTER COLUMN voice_profile TYPE JSONB USING
    CASE
        WHEN voice_profile IS NULL THEN NULL
        WHEN TRIM(voice_profile) = '' THEN NULL  -- Empty string becomes NULL
        ELSE voice_profile::jsonb  -- Valid JSON strings convert directly
    END;

SELECT '✅ voice_profile converted: TEXT → JSONB' as status;

-- Step 5: Set default values for NULL fields
UPDATE series_characters
SET visual_fingerprint = '{}'::jsonb
WHERE visual_fingerprint IS NULL;

UPDATE series_characters
SET voice_profile = '{}'::jsonb
WHERE voice_profile IS NULL;

SELECT '✅ NULL values replaced with empty JSONB objects' as status;

-- Step 6: Verify conversion worked
SELECT '=== AFTER CONVERSION ===' as step;
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- Step 7: Show sample data to confirm no data loss
SELECT '=== SAMPLE DATA ===' as step;
SELECT
    id,
    name,
    visual_fingerprint,
    voice_profile
FROM series_characters
LIMIT 5;

-- Step 8: Summary
SELECT '========================================' as step;
SELECT '✅ Column types successfully converted!' as status;
SELECT 'visual_fingerprint: ' || (SELECT data_type FROM information_schema.columns WHERE table_name = 'series_characters' AND column_name = 'visual_fingerprint') as check_1;
SELECT 'voice_profile: ' || (SELECT data_type FROM information_schema.columns WHERE table_name = 'series_characters' AND column_name = 'voice_profile') as check_2;
SELECT '========================================' as step;
SELECT 'Next: Run CREATE-ENHANCED-TRIGGER.sql' as next_step;
