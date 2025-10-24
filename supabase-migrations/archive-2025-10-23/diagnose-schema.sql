-- Comprehensive Schema Diagnostic for Character Consistency Issue
-- Run this in Supabase Studio to diagnose the "operator does not exist" error

-- ============================================================================
-- 1. Check if columns exist and their data types
-- ============================================================================
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template', 'interaction_context')
ORDER BY ordinal_position;

-- ============================================================================
-- 2. Check trigger function implementation
-- ============================================================================
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_character_sora_template', 'generate_sora_character_template');

-- ============================================================================
-- 3. Get actual trigger function source code
-- ============================================================================
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('update_character_sora_template', 'generate_sora_character_template');

-- ============================================================================
-- 4. Check trigger configuration
-- ============================================================================
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'series_characters'
  AND trigger_name = 'tr_update_sora_template';

-- ============================================================================
-- 5. Test JSONB column access directly
-- ============================================================================
-- This will fail if columns are TEXT instead of JSONB
SELECT
    id,
    name,
    pg_typeof(visual_fingerprint) as vf_type,
    pg_typeof(voice_profile) as vp_type,
    visual_fingerprint->>'age' as age_test
FROM series_characters
LIMIT 1;

-- ============================================================================
-- 6. Check for any existing data that might cause issues
-- ============================================================================
SELECT
    COUNT(*) as total_characters,
    COUNT(visual_fingerprint) as with_visual_fp,
    COUNT(voice_profile) as with_voice_profile,
    COUNT(sora_prompt_template) as with_template
FROM series_characters;

SELECT '========================================' as separator;
SELECT 'Diagnostic complete! Review results above.' as status;
