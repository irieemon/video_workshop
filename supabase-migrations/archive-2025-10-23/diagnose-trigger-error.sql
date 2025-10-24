-- Diagnose why trigger sees TEXT when columns are JSONB

-- 1. Check column types in information_schema
SELECT 'Column types from information_schema:' as step;
SELECT
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- 2. Check actual column types using pg_catalog
SELECT E'\nColumn types from pg_catalog:' as step;
SELECT
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = 'public.series_characters'::regclass
  AND a.attname IN ('visual_fingerprint', 'voice_profile')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attname;

-- 3. Test JSONB operator directly
SELECT E'\nTest JSONB operator on actual data:' as step;
SELECT
    id,
    name,
    pg_typeof(visual_fingerprint) as vf_type,
    pg_typeof(voice_profile) as vp_type,
    visual_fingerprint->>'ethnicity' as ethnicity_test,
    visual_fingerprint->>'age' as age_test
FROM series_characters
LIMIT 3;

-- 4. Try to create a simple test function
SELECT E'\nCreating test function...' as step;

DROP FUNCTION IF EXISTS test_jsonb_access();

CREATE OR REPLACE FUNCTION test_jsonb_access()
RETURNS TEXT AS $$
DECLARE
    test_char RECORD;
    result TEXT;
BEGIN
    SELECT * INTO test_char FROM series_characters LIMIT 1;

    -- This should work if column is JSONB
    result := test_char.visual_fingerprint->>'ethnicity';

    RETURN 'Success: ' || COALESCE(result, 'NULL');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

SELECT test_jsonb_access() as test_result;
