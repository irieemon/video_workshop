-- Check which characters have ethnicity but missing skin_tone

SELECT
    name,
    visual_fingerprint->>'ethnicity' as ethnicity,
    visual_fingerprint->>'skin_tone' as skin_tone,
    CASE
        WHEN visual_fingerprint->>'skin_tone' IS NULL THEN '❌ Missing'
        ELSE '✅ Has skin_tone'
    END as status
FROM series_characters
WHERE visual_fingerprint->>'ethnicity' IS NOT NULL
ORDER BY name;
