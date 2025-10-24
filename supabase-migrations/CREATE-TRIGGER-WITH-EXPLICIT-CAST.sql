-- Create enhanced trigger with explicit JSONB casts to avoid type inference issues

DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
DROP FUNCTION IF EXISTS update_character_sora_template();

CREATE OR REPLACE FUNCTION update_character_sora_template()
RETURNS TRIGGER AS $$
DECLARE
    template TEXT;
    core_identity TEXT := '';
    physical_desc TEXT := '';
    clothing TEXT := '';
    features TEXT := '';
    vf JSONB;  -- Explicit variable for visual_fingerprint
    vp JSONB;  -- Explicit variable for voice_profile
BEGIN
    -- Assign to local variables with explicit type
    vf := NEW.visual_fingerprint;
    vp := NEW.voice_profile;

    -- SECTION 1: Core Identity (Ethnicity + Age) - CRITICAL FOR CONSISTENCY
    IF vf->>'ethnicity' IS NOT NULL THEN
        core_identity := vf->>'ethnicity';
        IF vf->>'age' IS NOT NULL THEN
            core_identity := core_identity || ' ' || vf->>'age';
        END IF;
    ELSIF vf->>'age' IS NOT NULL THEN
        core_identity := vf->>'age';
    END IF;

    IF core_identity != '' THEN
        template := NEW.name || ': ' || core_identity || ', ';
    ELSE
        template := NEW.name || ': ';
    END IF;

    -- SECTION 2: Physical Description
    IF vf->>'hair' IS NOT NULL THEN
        physical_desc := vf->>'hair';
    END IF;

    IF vf->>'eyes' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || vf->>'eyes';
        ELSE
            physical_desc := vf->>'eyes';
        END IF;
    END IF;

    IF vf->>'body_type' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || vf->>'body_type' || ' build';
        ELSE
            physical_desc := vf->>'body_type' || ' build';
        END IF;
    END IF;

    IF vf->>'face_shape' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ' with ' || vf->>'face_shape' || ' face';
        ELSE
            physical_desc := vf->>'face_shape' || ' face';
        END IF;
    END IF;

    IF vf->>'height' IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || vf->>'height';
        ELSE
            physical_desc := vf->>'height';
        END IF;
    END IF;

    IF physical_desc != '' THEN
        template := template || physical_desc || '. ';
    END IF;

    -- SECTION 3: Clothing
    IF vf->>'default_clothing' IS NOT NULL THEN
        template := template || 'Wearing ' || vf->>'default_clothing' || '. ';
    END IF;

    -- SECTION 4: Skin Tone (CRITICAL for ethnicity accuracy)
    IF vf->>'skin_tone' IS NOT NULL THEN
        template := template || 'Skin tone: ' || vf->>'skin_tone' || '. ';
    END IF;

    -- SECTION 5: Distinctive Features
    IF vf->>'distinctive_features' IS NOT NULL AND
       vf->>'distinctive_features' != '' AND
       vf->>'distinctive_features' != 'none' THEN
        features := vf->>'distinctive_features';
        -- Handle array format if present
        IF features LIKE '[%' THEN
            features := REPLACE(REPLACE(REPLACE(features, '[', ''), ']', ''), '"', '');
        END IF;
        IF features != '' AND features != 'null' THEN
            template := template || 'Notable features: ' || features || '. ';
        END IF;
    END IF;

    -- SECTION 6: Voice
    IF vp IS NOT NULL AND vp != '{}'::jsonb THEN
        IF vp->>'age_sound' IS NOT NULL OR
           vp->>'accent' IS NOT NULL OR
           vp->>'tone' IS NOT NULL THEN
            template := template || 'Voice: ';

            IF vp->>'age_sound' IS NOT NULL THEN
                template := template || 'sounds ' || vp->>'age_sound';
            END IF;

            IF vp->>'accent' IS NOT NULL THEN
                IF vp->>'age_sound' IS NOT NULL THEN
                    template := template || ', ';
                END IF;
                template := template || vp->>'accent' || ' accent';
            END IF;

            IF vp->>'tone' IS NOT NULL THEN
                IF vp->>'age_sound' IS NOT NULL OR
                   vp->>'accent' IS NOT NULL THEN
                    template := template || ', ';
                END IF;
                template := template || vp->>'tone' || ' tone';
            END IF;

            IF vp->>'pitch' IS NOT NULL THEN
                template := template || ', ' || vp->>'pitch' || ' pitch';
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

-- Create trigger
CREATE TRIGGER tr_update_sora_template
    BEFORE INSERT OR UPDATE OF visual_fingerprint, voice_profile, performance_style, name
    ON series_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_character_sora_template();

-- Regenerate all templates to test
UPDATE series_characters
SET visual_fingerprint = visual_fingerprint
WHERE visual_fingerprint IS NOT NULL;

-- Show results
SELECT
    name,
    LEFT(sora_prompt_template, 100) || '...' as template_preview
FROM series_characters
WHERE sora_prompt_template IS NOT NULL
ORDER BY name;

SELECT '✅ Trigger created successfully with explicit JSONB casts!' as status;
