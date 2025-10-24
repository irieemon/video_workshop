-- Fix Character Consistency Column Types
-- This script ensures visual_fingerprint and voice_profile are JSONB, not TEXT

-- Step 1: Check current types
DO $$
DECLARE
    vf_type text;
    vp_type text;
BEGIN
    SELECT data_type INTO vf_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'series_characters'
        AND column_name = 'visual_fingerprint';

    SELECT data_type INTO vp_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'series_characters'
        AND column_name = 'voice_profile';

    RAISE NOTICE 'visual_fingerprint type: %', COALESCE(vf_type, 'NOT FOUND');
    RAISE NOTICE 'voice_profile type: %', COALESCE(vp_type, 'NOT FOUND');
END $$;

-- Step 2: Drop trigger temporarily (will recreate later)
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;

-- Step 3: Fix visual_fingerprint if it's TEXT
DO $$
BEGIN
    -- Check if column exists and is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'series_characters'
            AND column_name = 'visual_fingerprint'
            AND data_type = 'text'
    ) THEN
        -- Convert TEXT to JSONB
        ALTER TABLE public.series_characters
        ALTER COLUMN visual_fingerprint TYPE JSONB USING
            CASE
                WHEN visual_fingerprint IS NULL OR visual_fingerprint = '' THEN '{}'::jsonb
                WHEN visual_fingerprint ~ '^[\s]*\{' THEN visual_fingerprint::jsonb
                ELSE '{}'::jsonb
            END;

        RAISE NOTICE 'Fixed visual_fingerprint: TEXT → JSONB';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'series_characters'
            AND column_name = 'visual_fingerprint'
    ) THEN
        -- Column doesn't exist, create it
        ALTER TABLE public.series_characters
        ADD COLUMN visual_fingerprint JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Created visual_fingerprint column as JSONB';
    ELSE
        RAISE NOTICE 'visual_fingerprint is already JSONB';
    END IF;
END $$;

-- Step 4: Fix voice_profile if it's TEXT
DO $$
BEGIN
    -- Check if column exists and is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'series_characters'
            AND column_name = 'voice_profile'
            AND data_type = 'text'
    ) THEN
        -- Convert TEXT to JSONB
        ALTER TABLE public.series_characters
        ALTER COLUMN voice_profile TYPE JSONB USING
            CASE
                WHEN voice_profile IS NULL OR voice_profile = '' THEN '{}'::jsonb
                WHEN voice_profile ~ '^[\s]*\{' THEN voice_profile::jsonb
                ELSE '{}'::jsonb
            END;

        RAISE NOTICE 'Fixed voice_profile: TEXT → JSONB';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'series_characters'
            AND column_name = 'voice_profile'
    ) THEN
        -- Column doesn't exist, create it
        ALTER TABLE public.series_characters
        ADD COLUMN voice_profile JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Created voice_profile column as JSONB';
    ELSE
        RAISE NOTICE 'voice_profile is already JSONB';
    END IF;
END $$;

-- Step 5: Ensure sora_prompt_template exists as TEXT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'series_characters'
            AND column_name = 'sora_prompt_template'
    ) THEN
        ALTER TABLE public.series_characters
        ADD COLUMN sora_prompt_template TEXT;

        RAISE NOTICE 'Created sora_prompt_template column as TEXT';
    ELSE
        RAISE NOTICE 'sora_prompt_template already exists';
    END IF;
END $$;

-- Step 6: Recreate trigger function with correct types
CREATE OR REPLACE FUNCTION update_character_sora_template()
RETURNS TRIGGER AS $$
DECLARE
    template TEXT;
BEGIN
    -- Build template from NEW record's visual_fingerprint
    template := NEW.name || ': ';

    -- Add age if present
    IF NEW.visual_fingerprint->>'age' IS NOT NULL AND NEW.visual_fingerprint->>'age' != '' THEN
        template := template || NEW.visual_fingerprint->>'age' || ', ';
    END IF;

    -- Add ethnicity
    IF NEW.visual_fingerprint->>'ethnicity' IS NOT NULL AND NEW.visual_fingerprint->>'ethnicity' != '' THEN
        template := template || NEW.visual_fingerprint->>'ethnicity' || ', ';
    END IF;

    -- Add hair description
    IF NEW.visual_fingerprint->>'hair' IS NOT NULL AND NEW.visual_fingerprint->>'hair' != '' THEN
        template := template || NEW.visual_fingerprint->>'hair' || ' hair, ';
    END IF;

    -- Add eyes
    IF NEW.visual_fingerprint->>'eyes' IS NOT NULL AND NEW.visual_fingerprint->>'eyes' != '' THEN
        template := template || NEW.visual_fingerprint->>'eyes' || ' eyes, ';
    END IF;

    -- Add face shape
    IF NEW.visual_fingerprint->>'face_shape' IS NOT NULL AND NEW.visual_fingerprint->>'face_shape' != '' THEN
        template := template || NEW.visual_fingerprint->>'face_shape' || ' face, ';
    END IF;

    -- Add body type
    IF NEW.visual_fingerprint->>'body_type' IS NOT NULL AND NEW.visual_fingerprint->>'body_type' != '' THEN
        template := template || NEW.visual_fingerprint->>'body_type' || ' build, ';
    END IF;

    -- Add clothing
    IF NEW.visual_fingerprint->>'default_clothing' IS NOT NULL AND NEW.visual_fingerprint->>'default_clothing' != '' THEN
        template := template || 'wearing ' || NEW.visual_fingerprint->>'default_clothing' || '. ';
    END IF;

    -- Add voice characteristics
    IF NEW.voice_profile->>'age_sound' IS NOT NULL OR
       NEW.voice_profile->>'accent' IS NOT NULL THEN
        template := template || 'Voice: ';

        IF NEW.voice_profile->>'age_sound' IS NOT NULL AND NEW.voice_profile->>'age_sound' != '' THEN
            template := template || 'sounds ' || NEW.voice_profile->>'age_sound' || ', ';
        END IF;

        IF NEW.voice_profile->>'accent' IS NOT NULL AND NEW.voice_profile->>'accent' != '' THEN
            template := template || NEW.voice_profile->>'accent' || ' accent, ';
        END IF;

        IF NEW.voice_profile->>'pitch' IS NOT NULL AND NEW.voice_profile->>'pitch' != '' THEN
            template := template || NEW.voice_profile->>'pitch' || ' pitch, ';
        END IF;

        IF NEW.voice_profile->>'tone' IS NOT NULL AND NEW.voice_profile->>'tone' != '' THEN
            template := template || NEW.voice_profile->>'tone' || ' tone. ';
        END IF;
    END IF;

    -- Add performance style
    IF NEW.performance_style IS NOT NULL AND NEW.performance_style != '' THEN
        template := template || 'Performance: ' || NEW.performance_style || '.';
    END IF;

    -- Set the template on NEW record
    NEW.sora_prompt_template := TRIM(template);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Recreate trigger
CREATE TRIGGER tr_update_sora_template
    BEFORE INSERT OR UPDATE OF visual_fingerprint, voice_profile, performance_style, name
    ON series_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_character_sora_template();

-- Step 8: Add/recreate indexes
CREATE INDEX IF NOT EXISTS idx_characters_visual_fingerprint
ON public.series_characters USING GIN (visual_fingerprint);

CREATE INDEX IF NOT EXISTS idx_characters_voice_profile
ON public.series_characters USING GIN (voice_profile);

-- Step 9: Verify final types
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'series_characters'
    AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
ORDER BY column_name;

SELECT 'Column types fixed successfully! All character consistency columns are now correct.' AS status;
