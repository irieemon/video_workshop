-- Diagnose Current Trigger State
-- This will show you the ACTUAL trigger function code that's currently active

-- 1. Check if the buggy function still exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'generate_sora_character_template'
        ) THEN '❌ BUGGY FUNCTION STILL EXISTS!'
        ELSE '✅ Buggy function removed'
    END as buggy_function_status;

-- 2. Show the ACTUAL current trigger function code
SELECT pg_get_functiondef(p.oid) as current_trigger_function
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_character_sora_template';

-- 3. Check trigger configuration
SELECT
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'series_characters'
  AND trigger_name = 'tr_update_sora_template';

-- 4. Test if visual_fingerprint column is JSONB
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'series_characters'
  AND column_name = 'visual_fingerprint';
