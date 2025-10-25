-- FINAL FIX: Check actual column types and convert if needed
-- This script will work regardless of current state

-- Step 1: Drop any existing trigger
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
DROP FUNCTION IF EXISTS update_character_sora_template();

-- Step 2: Force conversion to JSONB (idempotent - safe to run multiple times)
-- If already JSONB, this becomes a no-op
-- If TEXT, this converts to JSONB

DO $$
DECLARE
    v_data_type text;
BEGIN
    -- Check visual_fingerprint type
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_name = 'series_characters'
    AND column_name = 'visual_fingerprint';

    RAISE NOTICE 'Current visual_fingerprint type: %', v_data_type;

    IF v_data_type = 'text' THEN
        RAISE NOTICE 'Converting visual_fingerprint from TEXT to JSONB...';

        -- Convert TEXT to JSONB
        ALTER TABLE series_characters
        ALTER COLUMN visual_fingerprint TYPE JSONB USING
            CASE
                WHEN visual_fingerprint IS NULL THEN NULL
                WHEN visual_fingerprint::text = '' THEN NULL
                ELSE visual_fingerprint::jsonb
            END;

        -- Replace NULLs with empty objects
        UPDATE series_characters
        SET visual_fingerprint = '{}'::jsonb
        WHERE visual_fingerprint IS NULL;

        RAISE NOTICE '✅ visual_fingerprint converted to JSONB';
    ELSE
        RAISE NOTICE '✅ visual_fingerprint already JSONB';
    END IF;

    -- Check voice_profile type
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_name = 'series_characters'
    AND column_name = 'voice_profile';

    RAISE NOTICE 'Current voice_profile type: %', v_data_type;

    IF v_data_type = 'text' THEN
        RAISE NOTICE 'Converting voice_profile from TEXT to JSONB...';

        -- Convert TEXT to JSONB
        ALTER TABLE series_characters
        ALTER COLUMN voice_profile TYPE JSONB USING
            CASE
                WHEN voice_profile IS NULL THEN NULL
                WHEN voice_profile::text = '' THEN NULL
                ELSE voice_profile::jsonb
            END;

        -- Replace NULLs with empty objects
        UPDATE series_characters
        SET voice_profile = '{}'::jsonb
        WHERE voice_profile IS NULL;

        RAISE NOTICE '✅ voice_profile converted to JSONB';
    ELSE
        RAISE NOTICE '✅ voice_profile already JSONB';
    END IF;
END $$;

-- Step 3: Verify conversion
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'series_characters'
  AND column_name IN ('visual_fingerprint', 'voice_profile')
ORDER BY column_name;

-- Step 4: Now create the trigger (this will only work if columns are JSONB)
CREATE OR REPLACE FUNCTION update_character_sora_template()
RETURNS TRIGGER AS $$
DECLARE
    template TEXT;
    core_identity TEXT := '';
    physical_desc TEXT := '';
    clothing TEXT := '';
    features TEXT := '';
BEGIN
    -- SECTION 1: Core Identity (Ethnicity + Age)
    IF NEW.visual_fingerprint->>'ethnicity' IS NOT NULL THEN
        core_identity := NEW.visual_fingerprint->>'ethnicity';
        IF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
            core_identity := core_identity || ' ' || NEW.visual_fingerprint->>'age';
        END IF;
    ELSIF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
        core_identity := NEW.visual_fingerprint->>'age';
    END IF;

    IF core_identity != '' THEN
        template := NEW.name || ': ' || core_identity || ', ';
    ELSE
        template := NEW.name || ': ';
    END IF;

    -- SECTION 2: Physical Description
    IF NEW.visual_fingerprint->>'hair' IS NOT NULL THEN
        physical_desc := NEW.visual_fingerprint->>'hair';
    END IF;

    IF NEW.visual_fingerprint->>'eyes' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || NEW.visual_fingerprint->>'eyes';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'eyes';
        END IF;
    END IF;

    IF NEW.visual_fingerprint->>'body_type' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || NEW.visual_fingerprint->>'body_type' || ' build';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'body_type' || ' build';
        END IF;
    END IF;

    IF NEW.visual_fingerprint->>'face_shape' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ' with ' || NEW.visual_fingerprint->>'face_shape' || ' face';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'face_shape' || ' face';
        END IF;
    END IF;

    IF NEW.visual_fingerprint->>'height' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || NEW.visual_fingerprint->>'height';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'height';
        END IF;
    END IF;

    IF physical_desc != '' THEN
        template := template || physical_desc || '. ';
    END IF;

    -- SECTION 3: Clothing
    IF NEW.visual_fingerprint->>'default_clothing' IS NOT NULL THEN
        template := template || 'Wearing ' || NEW.visual_fingerprint->>'default_clothing' || '. ';
    END IF;

    -- SECTION 4: Skin Tone (NEW)
    IF NEW.visual_fingerprint->>'skin_tone' IS NOT NULL THEN
        template := template || 'Skin tone: ' || NEW.visual_fingerprint->>'skin_tone' || '. ';
    END IF;

    -- SECTION 5: Distinctive Features
    IF NEW.visual_fingerprint->>'distinctive_features' IS NOT NULL AND
       NEW.visual_fingerprint->>'distinctive_features' != '' AND
       NEW.visual_fingerprint->>'distinctive_features' != 'none' THEN
        features := NEW.visual_fingerprint->>'distinctive_features';
        IF features LIKE '[%' THEN
            features := REPLACE(REPLACE(REPLACE(features, '[', ''), ']', ''), '"', '');
        END IF;
        IF features != '' AND features != 'null' THEN
            template := template || 'Notable features: ' || features || '. ';
        END IF;
    END IF;

    -- SECTION 6: Voice
    IF NEW.voice_profile IS NOT NULL AND NEW.voice_profile != '{}'::jsonb THEN
        IF NEW.voice_profile->>'age_sound' IS NOT NULL OR
           NEW.voice_profile->>'accent' IS NOT NULL OR
           NEW.voice_profile->>'tone' IS NOT NULL THEN
            template := template || 'Voice: ';

            IF NEW.voice_profile->>'age_sound' IS NOT NULL THEN
                template := template || 'sounds ' || NEW.voice_profile->>'age_sound';
            END IF;

            IF NEW.voice_profile->>'accent' IS NOT NULL THEN
                IF NEW.voice_profile->>'age_sound' IS NOT NULL THEN
                    template := template || ', ';
                END IF;
                template := template || NEW.voice_profile->>'accent' || ' accent';
            END IF;

            IF NEW.voice_profile->>'tone' IS NOT NULL THEN
                IF NEW.voice_profile->>'age_sound' IS NOT NULL OR
                   NEW.voice_profile->>'accent' IS NOT NULL THEN
                    template := template || ', ';
                END IF;
                template := template || NEW.voice_profile->>'tone' || ' tone';
            END IF;

            IF NEW.voice_profile->>'pitch' IS NOT NULL THEN
                template := template || ', ' || NEW.voice_profile->>'pitch' || ' pitch';
            END IF;

            template := template || '. ';
        END IF;
    END IF;

    -- SECTION 7: Performance Style
    IF NEW.performance_style IS NOT NULL AND NEW.performance_style != '' THEN
        template := template || 'Performance: ' || NEW.performance_style || '.';
    END IF;

    NEW.sora_prompt_template := TRIM(template);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
CREATE TRIGGER tr_update_sora_template
    BEFORE INSERT OR UPDATE OF visual_fingerprint, voice_profile, performance_style, name
    ON series_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_character_sora_template();

-- Step 6: Regenerate all templates
UPDATE series_characters
SET visual_fingerprint = visual_fingerprint
WHERE visual_fingerprint IS NOT NULL;

-- Step 7: Show results
SELECT
    name,
    LEFT(sora_prompt_template, 100) || '...' as template_preview
FROM series_characters
WHERE sora_prompt_template IS NOT NULL
ORDER BY name;

SELECT '========================================' as divider;
SELECT '✅ COMPLETE: Enhanced trigger installed!' as status;
SELECT 'Character templates auto-generated with skin_tone support' as note;
