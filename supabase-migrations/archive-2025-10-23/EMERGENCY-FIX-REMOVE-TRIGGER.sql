-- EMERGENCY FIX: Remove problematic trigger entirely
-- This allows character creation/editing to work without template auto-generation
-- You'll need to manually ensure character descriptions are complete

-- Step 1: Remove the trigger
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;

-- Step 2: Remove the trigger function
DROP FUNCTION IF EXISTS update_character_sora_template();

-- Step 3: Verify columns are now usable
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
ORDER BY column_name;

SELECT '✅ EMERGENCY FIX APPLIED - Trigger removed' as status;
SELECT 'Characters can now be created and edited' as note;
SELECT 'sora_prompt_template will NOT auto-generate (you must ensure complete character descriptions in ethnicity, skin_tone, etc.)' as warning;
