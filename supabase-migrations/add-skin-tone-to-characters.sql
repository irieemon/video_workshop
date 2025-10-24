-- Add skin_tone to existing characters with ethnicity

-- Lyle: Black child - deep brown skin with warm undertones
UPDATE series_characters
SET visual_fingerprint = jsonb_set(
    visual_fingerprint,
    '{skin_tone}',
    '"deep brown with warm undertones"'
)
WHERE name = 'Lyle';

-- Dad: White early 30s - fair skin with warm undertones
UPDATE series_characters
SET visual_fingerprint = jsonb_set(
    visual_fingerprint,
    '{skin_tone}',
    '"fair with warm undertones"'
)
WHERE name = 'Dad';

-- Tom: White early teens - fair skin with neutral undertones
UPDATE series_characters
SET visual_fingerprint = jsonb_set(
    visual_fingerprint,
    '{skin_tone}',
    '"fair with neutral undertones"'
)
WHERE name = 'Tom';

-- Show updated templates
SELECT '=== Updated Character Templates ===' as section;

SELECT
    name,
    visual_fingerprint->>'ethnicity' as ethnicity,
    visual_fingerprint->>'skin_tone' as skin_tone,
    sora_prompt_template
FROM series_characters
WHERE name IN ('Lyle', 'Dad', 'Tom')
ORDER BY name;

SELECT '✅ Skin tone added to all characters with ethnicity!' as status;
