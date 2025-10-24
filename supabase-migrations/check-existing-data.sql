-- Check existing character data state
SELECT 
    id,
    name,
    visual_reference_url IS NOT NULL as has_image,
    visual_fingerprint IS NOT NULL as has_fingerprint,
    pg_typeof(visual_fingerprint) as fingerprint_type,
    sora_prompt_template IS NOT NULL as has_template
FROM series_characters
ORDER BY created_at DESC
LIMIT 5;
