-- Fix Character Template Trigger
-- Issue: BEFORE trigger was querying table and getting OLD values instead of NEW values
-- Solution: Rewrite trigger to work directly with NEW record

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
DROP FUNCTION IF EXISTS update_character_sora_template();
DROP FUNCTION IF EXISTS generate_sora_character_template(UUID);

-- Create new inline trigger function that uses NEW record directly
CREATE OR REPLACE FUNCTION update_character_sora_template()
RETURNS TRIGGER AS $$
DECLARE
    template TEXT;
BEGIN
    -- Build template from NEW record's visual_fingerprint
    template := NEW.name || ': ';

    -- Add age if present
    IF NEW.visual_fingerprint->>'age' IS NOT NULL THEN
        template := template || NEW.visual_fingerprint->>'age' || ', ';
    END IF;

    -- Add ethnicity
    IF NEW.visual_fingerprint->>'ethnicity' IS NOT NULL THEN
        template := template || NEW.visual_fingerprint->>'ethnicity' || ', ';
    END IF;

    -- Add hair description
    IF NEW.visual_fingerprint->>'hair' IS NOT NULL THEN
        template := template || NEW.visual_fingerprint->>'hair' || ' hair, ';
    END IF;

    -- Add eyes
    IF NEW.visual_fingerprint->>'eyes' IS NOT NULL THEN
        template := template || NEW.visual_fingerprint->>'eyes' || ' eyes, ';
    END IF;

    -- Add face shape
    IF NEW.visual_fingerprint->>'face_shape' IS NOT NULL THEN
        template := template || NEW.visual_fingerprint->>'face_shape' || ' face, ';
    END IF;

    -- Add body type
    IF NEW.visual_fingerprint->>'body_type' IS NOT NULL THEN
        template := template || NEW.visual_fingerprint->>'body_type' || ' build, ';
    END IF;

    -- Add clothing
    IF NEW.visual_fingerprint->>'default_clothing' IS NOT NULL THEN
        template := template || 'wearing ' || NEW.visual_fingerprint->>'default_clothing' || '. ';
    END IF;

    -- Add voice characteristics
    IF NEW.voice_profile->>'age_sound' IS NOT NULL OR
       NEW.voice_profile->>'accent' IS NOT NULL THEN
        template := template || 'Voice: ';

        IF NEW.voice_profile->>'age_sound' IS NOT NULL THEN
            template := template || 'sounds ' || NEW.voice_profile->>'age_sound' || ', ';
        END IF;

        IF NEW.voice_profile->>'accent' IS NOT NULL THEN
            template := template || NEW.voice_profile->>'accent' || ' accent, ';
        END IF;

        IF NEW.voice_profile->>'pitch' IS NOT NULL THEN
            template := template || NEW.voice_profile->>'pitch' || ' pitch, ';
        END IF;

        IF NEW.voice_profile->>'tone' IS NOT NULL THEN
            template := template || NEW.voice_profile->>'tone' || ' tone. ';
        END IF;
    END IF;

    -- Add performance style
    IF NEW.performance_style IS NOT NULL THEN
        template := template || 'Performance: ' || NEW.performance_style || '.';
    END IF;

    -- Set the template on NEW record
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

SELECT 'Character template trigger fixed!' as status;
