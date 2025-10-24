-- Add Character Consistency Fields for Sora Prompt Generation
-- This migration enhances character profiles with detailed visual and voice fingerprints

-- ============================================================================
-- STEP 1: Add new JSONB columns for detailed character profiles
-- ============================================================================

-- Add visual_fingerprint for precise physical appearance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters' AND column_name = 'visual_fingerprint'
    ) THEN
        ALTER TABLE public.series_characters
        ADD COLUMN visual_fingerprint JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN public.series_characters.visual_fingerprint IS
        'Detailed physical appearance for Sora consistency: age, ethnicity, hair, eyes, face, body, clothing';
    END IF;
END $$;

-- Add voice_profile for audio consistency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters' AND column_name = 'voice_profile'
    ) THEN
        ALTER TABLE public.series_characters
        ADD COLUMN voice_profile JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN public.series_characters.voice_profile IS
        'Voice characteristics for Sora: age_sound, accent, pitch, tone, pace, energy, distinctive_traits';
    END IF;
END $$;

-- Add sora_prompt_template for locked character description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series_characters' AND column_name = 'sora_prompt_template'
    ) THEN
        ALTER TABLE public.series_characters
        ADD COLUMN sora_prompt_template TEXT;

        COMMENT ON COLUMN public.series_characters.sora_prompt_template IS
        'Auto-generated character description template injected into every Sora prompt';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update character_relationships table for interaction context
-- ============================================================================

-- Add interaction_context for relationship dynamics
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_relationships' AND column_name = 'interaction_context'
    ) THEN
        ALTER TABLE public.character_relationships
        ADD COLUMN interaction_context JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN public.character_relationships.interaction_context IS
        'How characters interact: familiarity_level, communication_style, typical_dynamics';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Create helper function to generate Sora prompt template
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_sora_character_template(character_id UUID)
RETURNS TEXT AS $$
DECLARE
    char_record RECORD;
    template TEXT;
BEGIN
    SELECT * INTO char_record
    FROM series_characters
    WHERE id = character_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Build template from visual_fingerprint
    template := char_record.name || ': ';

    -- Add age if present
    IF char_record.visual_fingerprint->>'age' IS NOT NULL THEN
        template := template || char_record.visual_fingerprint->>'age' || ', ';
    END IF;

    -- Add ethnicity
    IF char_record.visual_fingerprint->>'ethnicity' IS NOT NULL THEN
        template := template || char_record.visual_fingerprint->>'ethnicity' || ', ';
    END IF;

    -- Add hair description
    IF char_record.visual_fingerprint->>'hair' IS NOT NULL THEN
        template := template || char_record.visual_fingerprint->>'hair' || ' hair, ';
    END IF;

    -- Add eyes
    IF char_record.visual_fingerprint->>'eyes' IS NOT NULL THEN
        template := template || char_record.visual_fingerprint->>'eyes' || ' eyes, ';
    END IF;

    -- Add face shape
    IF char_record.visual_fingerprint->>'face_shape' IS NOT NULL THEN
        template := template || char_record.visual_fingerprint->>'face_shape' || ' face, ';
    END IF;

    -- Add body type
    IF char_record.visual_fingerprint->>'body_type' IS NOT NULL THEN
        template := template || char_record.visual_fingerprint->>'body_type' || ' build, ';
    END IF;

    -- Add clothing
    IF char_record.visual_fingerprint->>'default_clothing' IS NOT NULL THEN
        template := template || 'wearing ' || char_record.visual_fingerprint->>'default_clothing' || '. ';
    END IF;

    -- Add voice characteristics
    IF char_record.voice_profile->>'age_sound' IS NOT NULL OR
       char_record.voice_profile->>'accent' IS NOT NULL THEN
        template := template || 'Voice: ';

        IF char_record.voice_profile->>'age_sound' IS NOT NULL THEN
            template := template || 'sounds ' || char_record.voice_profile->>'age_sound' || ', ';
        END IF;

        IF char_record.voice_profile->>'accent' IS NOT NULL THEN
            template := template || char_record.voice_profile->>'accent' || ' accent, ';
        END IF;

        IF char_record.voice_profile->>'pitch' IS NOT NULL THEN
            template := template || char_record.voice_profile->>'pitch' || ' pitch, ';
        END IF;

        IF char_record.voice_profile->>'tone' IS NOT NULL THEN
            template := template || char_record.voice_profile->>'tone' || ' tone. ';
        END IF;
    END IF;

    -- Add performance style
    IF char_record.performance_style IS NOT NULL THEN
        template := template || 'Performance: ' || char_record.performance_style || '.';
    END IF;

    RETURN TRIM(template);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create trigger to auto-update sora_prompt_template
-- ============================================================================

CREATE OR REPLACE FUNCTION update_character_sora_template()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sora_prompt_template := generate_sora_character_template(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_sora_template ON series_characters;
CREATE TRIGGER tr_update_sora_template
    BEFORE INSERT OR UPDATE OF visual_fingerprint, voice_profile, performance_style
    ON series_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_character_sora_template();

-- ============================================================================
-- STEP 5: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_characters_visual_fingerprint
ON public.series_characters USING GIN (visual_fingerprint);

CREATE INDEX IF NOT EXISTS idx_characters_voice_profile
ON public.series_characters USING GIN (voice_profile);

CREATE INDEX IF NOT EXISTS idx_relationships_interaction_context
ON public.character_relationships USING GIN (interaction_context);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Character consistency migration completed!' as status;
