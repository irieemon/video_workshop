-- Quick Check: Is the trigger fixed?
-- Run this to see if the trigger fix was applied

-- Check if the buggy function still exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'generate_sora_character_template'
        ) THEN '❌ BUGGY TRIGGER STILL EXISTS - Run fix-character-template-trigger.sql'
        ELSE '✅ Trigger is fixed!'
    END as trigger_status;

-- Show current trigger function source
SELECT pg_get_functiondef(p.oid) as current_trigger_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_character_sora_template';
