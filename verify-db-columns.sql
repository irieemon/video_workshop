-- Verify actual database column types in PRODUCTION
-- Run this in Supabase Studio SQL Editor for the production database

-- Check 1: Column types from information_schema
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'series_characters'
    AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
ORDER BY column_name;

-- Check 2: Column types from pg_attribute (more accurate)
SELECT
    attname AS column_name,
    format_type(atttypid, atttypmod) AS data_type,
    atttypid::regtype AS type_name
FROM pg_attribute
WHERE attrelid = 'public.series_characters'::regclass
    AND attname IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
    AND NOT attisdropped
ORDER BY attname;

-- Check 3: Verify trigger exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'tr_update_sora_template';

-- Check 4: Get trigger function source
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'update_character_sora_template';
