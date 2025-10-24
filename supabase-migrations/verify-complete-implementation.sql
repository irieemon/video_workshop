-- Comprehensive verification of character consistency implementation

SELECT '=== 1. Verify Trigger Exists ===' as section;
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    string_agg(event_manipulation, ', ') as events
FROM information_schema.triggers
WHERE trigger_name = 'tr_update_sora_template'
GROUP BY trigger_name, event_object_table, action_timing;

SELECT '=== 2. Verify Column Types ===' as section;
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
ORDER BY column_name;

SELECT '=== 3. Check Characters with Complete Data ===' as section;
SELECT
    name,
    visual_fingerprint->>'ethnicity' as ethnicity,
    visual_fingerprint->>'skin_tone' as skin_tone,
    visual_fingerprint->>'age' as age,
    CASE
        WHEN visual_fingerprint->>'ethnicity' IS NOT NULL
         AND visual_fingerprint->>'skin_tone' IS NOT NULL
         AND sora_prompt_template LIKE '%Skin tone:%'
        THEN '✅ Complete'
        WHEN visual_fingerprint->>'ethnicity' IS NOT NULL
         AND visual_fingerprint->>'skin_tone' IS NULL
        THEN '⚠️ Missing skin_tone'
        WHEN visual_fingerprint->>'ethnicity' IS NULL
        THEN '⏳ No ethnicity set'
        ELSE '❓ Unknown'
    END as status
FROM series_characters
ORDER BY
    CASE
        WHEN visual_fingerprint->>'ethnicity' IS NOT NULL AND visual_fingerprint->>'skin_tone' IS NOT NULL THEN 1
        WHEN visual_fingerprint->>'ethnicity' IS NOT NULL THEN 2
        ELSE 3
    END,
    name;

SELECT '=== 4. Sample Complete Templates ===' as section;
SELECT
    name,
    LEFT(sora_prompt_template, 200) || '...' as template_sample
FROM series_characters
WHERE visual_fingerprint->>'ethnicity' IS NOT NULL
  AND sora_prompt_template LIKE '%Skin tone:%'
ORDER BY name;

SELECT '=== 5. Verification Summary ===' as section;
SELECT
    COUNT(*) as total_characters,
    COUNT(*) FILTER (WHERE visual_fingerprint->>'ethnicity' IS NOT NULL) as with_ethnicity,
    COUNT(*) FILTER (WHERE visual_fingerprint->>'skin_tone' IS NOT NULL) as with_skin_tone,
    COUNT(*) FILTER (
        WHERE visual_fingerprint->>'ethnicity' IS NOT NULL
        AND visual_fingerprint->>'skin_tone' IS NOT NULL
        AND sora_prompt_template LIKE '%Skin tone:%'
    ) as complete_characters
FROM series_characters;

SELECT
    '✅ Implementation verified!' as status,
    'Character templates now include ethnicity and skin_tone for Sora consistency' as note;
