-- Diagnostic: Check series_characters column types
-- Run this in Supabase Studio SQL Editor

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

-- Also check if the columns have the correct type at the PostgreSQL level
SELECT
    attname AS column_name,
    format_type(atttypid, atttypmod) AS data_type
FROM pg_attribute
WHERE attrelid = 'public.series_characters'::regclass
    AND attname IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
    AND NOT attisdropped
ORDER BY attname;

-- Check if there are any type casts or domains affecting these columns
SELECT
    c.column_name,
    c.data_type,
    c.udt_name,
    d.typname AS domain_type
FROM information_schema.columns c
LEFT JOIN pg_type d ON c.udt_name = d.typname
WHERE c.table_schema = 'public'
    AND c.table_name = 'series_characters'
    AND c.column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template');
