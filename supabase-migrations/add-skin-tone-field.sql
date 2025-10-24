-- Add skin_tone field to series_characters for enhanced Sora consistency
-- This field provides specific skin tone descriptions that prevent Sora from
-- making up character appearances based on ambiguous ethnicity descriptors

-- CRITICAL: First ensure columns are JSONB type, not TEXT
-- Step 1: Fix column types if they are TEXT
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
DROP FUNCTION IF EXISTS update_character_sora_template();

DO $$
BEGIN
    -- Fix visual_fingerprint if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters'
        AND column_name = 'visual_fingerprint'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE series_characters
        ALTER COLUMN visual_fingerprint TYPE JSONB USING
            CASE
                WHEN visual_fingerprint IS NULL OR visual_fingerprint = '' THEN '{}'::jsonb
                WHEN visual_fingerprint ~ '^[\s]*\{' THEN visual_fingerprint::jsonb
                ELSE '{}'::jsonb
            END;
        RAISE NOTICE 'Fixed visual_fingerprint: TEXT → JSONB';
    END IF;

    -- Fix voice_profile if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters'
        AND column_name = 'voice_profile'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE series_characters
        ALTER COLUMN voice_profile TYPE JSONB USING
            CASE
                WHEN voice_profile IS NULL OR voice_profile = '' THEN '{}'::jsonb
                WHEN voice_profile ~ '^[\s]*\{' THEN voice_profile::jsonb
                ELSE '{}'::jsonb
            END;
        RAISE NOTICE 'Fixed voice_profile: TEXT → JSONB';
    END IF;
END $$;

-- Step 2: Now create the enhanced trigger with JSONB support

-- Create enhanced trigger function with skin_tone and better formatting
CREATE OR REPLACE FUNCTION update_character_sora_template()
RETURNS TRIGGER AS $$
DECLARE
    template TEXT;
    core_identity TEXT := '';
    physical_desc TEXT := '';
    clothing TEXT := '';
    features TEXT := '';
BEGIN
    -- Build character template with ultra-detailed Sora 2 format

    -- SECTION 1: Core Identity (Ethnicity + Age) - CRITICAL FOR CONSISTENCY
    IF NEW.visual_fingerprint->>'ethnicity' IS NOT NULL THEN
        core_identity := NEW.visual_fingerprint->>'ethnicity';

        -- Add age if present
        IF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
            core_identity := core_identity || ' ' || NEW.visual_fingerprint->>'age';
        END IF;
    ELSIF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
        -- Age without ethnicity
        core_identity := NEW.visual_fingerprint->>'age';
    END IF;

    -- Start template with name and core identity
    IF core_identity != '' THEN
        template := NEW.name || ': ' || core_identity || ', ';
    ELSE
        template := NEW.name || ': ';
    END IF;

    -- SECTION 2: Physical Description (Hair, Eyes, Face, Body)

    -- Hair (with texture details)
    IF NEW.visual_fingerprint->>'hair' IS NOT NULL THEN
        physical_desc := NEW.visual_fingerprint->>'hair';
    END IF;

    -- Eyes
    IF NEW.visual_fingerprint->>'eyes' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || NEW.visual_fingerprint->>'eyes';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'eyes';
        END IF;
    END IF;

    -- Body type
    IF NEW.visual_fingerprint->>'body_type' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || NEW.visual_fingerprint->>'body_type' || ' build';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'body_type' || ' build';
        END IF;
    END IF;

    -- Face shape
    IF NEW.visual_fingerprint->>'face_shape' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ' with ' || NEW.visual_fingerprint->>'face_shape' || ' face';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'face_shape' || ' face';
        END IF;
    END IF;

    -- Height
    IF NEW.visual_fingerprint->>'height' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || NEW.visual_fingerprint->>'height';
        ELSE
            physical_desc := NEW.visual_fingerprint->>'height';
        END IF;
    END IF;

    -- Add physical description to template
    IF physical_desc != '' THEN
        template := template || physical_desc || '. ';
    END IF;

    -- SECTION 3: Clothing (Detailed)
    IF NEW.visual_fingerprint->>'default_clothing' IS NOT NULL THEN
        clothing := 'Wearing ' || NEW.visual_fingerprint->>'default_clothing' || '. ';
        template := template || clothing;
    END IF;

    -- SECTION 4: Skin Tone (CRITICAL for ethnicity accuracy)
    IF NEW.visual_fingerprint->>'skin_tone' IS NOT NULL THEN
        template := template || 'Skin tone: ' || NEW.visual_fingerprint->>'skin_tone' || '. ';
    END IF;

    -- SECTION 5: Distinctive Features
    IF NEW.visual_fingerprint->>'distinctive_features' IS NOT NULL AND
       NEW.visual_fingerprint->>'distinctive_features' != '' THEN
        -- Handle both string and array formats
        features := NEW.visual_fingerprint->>'distinctive_features';
        IF features LIKE '[%' THEN
            -- It's a JSON array, extract text
            features := REPLACE(REPLACE(REPLACE(features, '[', ''), ']', ''), '"', '');
        END IF;

        IF features != '' AND features != 'null' THEN
            template := template || 'Notable features: ' || features || '. ';
        END IF;
    END IF;

    -- SECTION 6: Voice Characteristics (if present)
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

    -- Clean up template
    NEW.sora_prompt_template := TRIM(template);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER tr_update_sora_template
    BEFORE INSERT OR UPDATE OF visual_fingerprint, voice_profile, performance_style, name
    ON series_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_character_sora_template();

-- Update existing characters to regenerate templates
-- This will trigger the new template generation for all existing characters
UPDATE series_characters SET visual_fingerprint = visual_fingerprint WHERE visual_fingerprint IS NOT NULL;

SELECT 'Enhanced character template trigger created with skin_tone support!' as status;
SELECT 'Existing character templates have been regenerated.' as info;
