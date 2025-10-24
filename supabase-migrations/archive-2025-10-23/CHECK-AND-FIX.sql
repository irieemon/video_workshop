-- Check current column types and apply appropriate fix
-- This script detects whether columns are TEXT or JSONB and handles both cases

-- Step 1: Check current state
SELECT '=== CURRENT COLUMN TYPES ===' as info;
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- Step 2: Check if trigger exists
SELECT '=== CURRENT TRIGGER STATUS ===' as info;
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'tr_update_sora_template';

-- Step 3: Show sample data
SELECT '=== SAMPLE CHARACTER DATA ===' as info;
SELECT
    name,
    CASE
        WHEN visual_fingerprint IS NULL THEN 'NULL'
        WHEN visual_fingerprint::text = '{}' THEN 'Empty object {}'
        ELSE 'Has data'
    END as visual_status,
    CASE
        WHEN voice_profile IS NULL THEN 'NULL'
        WHEN voice_profile::text = '{}' THEN 'Empty object {}'
        ELSE 'Has data'
    END as voice_status,
    sora_prompt_template
FROM series_characters
ORDER BY name
LIMIT 10;

-- Step 4: Analysis
SELECT '=== DIAGNOSIS ===' as info;
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'series_characters'
            AND column_name = 'visual_fingerprint'
            AND data_type = 'jsonb'
        )
        THEN '✅ Columns are already JSONB - Ready for trigger creation'
        ELSE '❌ Columns are TEXT - Need conversion first'
    END as status;

SELECT '================================================' as divider;
SELECT 'If columns are JSONB: Run CREATE-ENHANCED-TRIGGER.sql' as next_step_1;
SELECT 'If columns are TEXT: Contact for help with conversion' as next_step_2;
