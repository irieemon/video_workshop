-- ================================================================
-- FUNCTION SEARCH PATH SECURITY MIGRATION
-- ================================================================
-- Purpose: Fix search_path security vulnerabilities in PostgreSQL functions
-- Date: 2025-10-23
-- Issues Fixed:
--   - 13 functions with mutable search_path (search path injection vulnerability)
-- Security Impact: Prevents search path injection attacks
-- ================================================================

BEGIN;

-- ================================================================
-- SECURITY VULNERABILITY: Function Search Path Mutable
-- ================================================================
-- Without SET search_path, functions are vulnerable to search path injection.
-- An attacker could create malicious objects in schemas earlier in the
-- search path to hijack function behavior.
--
-- Solution: Add "SET search_path = pg_catalog, public" to all functions
-- This ensures functions only search in trusted schemas.
-- ================================================================

-- ================================================================
-- TRIGGER FUNCTIONS (4 functions)
-- ================================================================

-- 1. auto_create_series_visual_style
-- ================================================================
CREATE OR REPLACE FUNCTION public.auto_create_series_visual_style()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.series_visual_style (series_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- 2. update_updated_at_column
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. handle_new_user
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- 4. update_character_sora_template
-- ================================================================
CREATE OR REPLACE FUNCTION public.update_character_sora_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    template TEXT;
    core_identity TEXT := '';
    physical_desc TEXT := '';
    clothing TEXT := '';
    features TEXT := '';
    vf JSONB;
    vp JSONB;
BEGIN
    -- Triple explicit cast: NEW.field::jsonb
    vf := (NEW.visual_fingerprint)::jsonb;
    vp := (NEW.voice_profile)::jsonb;

    -- SECTION 1: Core Identity (Ethnicity + Age)
    IF (vf->>'ethnicity') IS NOT NULL THEN
        core_identity := (vf->>'ethnicity');
        IF (vf->>'age') IS NOT NULL THEN
            core_identity := core_identity || ' ' || (vf->>'age');
        END IF;
    ELSIF (vf->>'age') IS NOT NULL THEN
        core_identity := (vf->>'age');
    END IF;

    IF core_identity != '' THEN
        template := NEW.name || ': ' || core_identity || ', ';
    ELSE
        template := NEW.name || ': ';
    END IF;

    -- SECTION 2: Physical Description
    IF (vf->>'hair') IS NOT NULL THEN
        physical_desc := (vf->>'hair');
    END IF;

    IF (vf->>'eyes') IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || (vf->>'eyes');
        ELSE
            physical_desc := (vf->>'eyes');
        END IF;
    END IF;

    IF (vf->>'body_type') IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || (vf->>'body_type') || ' build';
        ELSE
            physical_desc := (vf->>'body_type') || ' build';
        END IF;
    END IF;

    IF (vf->>'face_shape') IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ' with ' || (vf->>'face_shape') || ' face';
        ELSE
            physical_desc := (vf->>'face_shape') || ' face';
        END IF;
    END IF;

    IF (vf->>'height') IS NOT NULL THEN
        IF physical_desc != '' THEN
            physical_desc := physical_desc || ', ' || (vf->>'height');
        ELSE
            physical_desc := (vf->>'height');
        END IF;
    END IF;

    IF physical_desc != '' THEN
        template := template || physical_desc || '. ';
    END IF;

    -- SECTION 3: Clothing
    IF (vf->>'default_clothing') IS NOT NULL THEN
        template := template || 'Wearing ' || (vf->>'default_clothing') || '. ';
    END IF;

    -- SECTION 4: Skin Tone (NEW - CRITICAL)
    IF (vf->>'skin_tone') IS NOT NULL THEN
        template := template || 'Skin tone: ' || (vf->>'skin_tone') || '. ';
    END IF;

    -- SECTION 5: Distinctive Features
    IF (vf->>'distinctive_features') IS NOT NULL AND
       (vf->>'distinctive_features') != '' AND
       (vf->>'distinctive_features') != 'none' THEN
        features := (vf->>'distinctive_features');
        IF features LIKE '[%' THEN
            features := REPLACE(REPLACE(REPLACE(features, '[', ''), ']', ''), '"', '');
        END IF;
        IF features != '' AND features != 'null' THEN
            template := template || 'Notable features: ' || features || '. ';
        END IF;
    END IF;

    -- SECTION 6: Voice
    IF vp IS NOT NULL AND vp != '{}'::jsonb THEN
        IF (vp->>'age_sound') IS NOT NULL OR
           (vp->>'accent') IS NOT NULL OR
           (vp->>'tone') IS NOT NULL THEN
            template := template || 'Voice: ';

            IF (vp->>'age_sound') IS NOT NULL THEN
                template := template || 'sounds ' || (vp->>'age_sound');
            END IF;

            IF (vp->>'accent') IS NOT NULL THEN
                IF (vp->>'age_sound') IS NOT NULL THEN
                    template := template || ', ';
                END IF;
                template := template || (vp->>'accent') || ' accent';
            END IF;

            IF (vp->>'tone') IS NOT NULL THEN
                IF (vp->>'age_sound') IS NOT NULL OR
                   (vp->>'accent') IS NOT NULL THEN
                    template := template || ', ';
                END IF;
                template := template || (vp->>'tone') || ' tone';
            END IF;

            IF (vp->>'pitch') IS NOT NULL THEN
                template := template || ', ' || (vp->>'pitch') || ' pitch';
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
$$;

-- ================================================================
-- QUERY FUNCTIONS (9 functions)
-- ================================================================

-- 5. get_next_episode_number
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_next_episode_number(p_series_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(episode_number), 0) + 1
  INTO next_num
  FROM public.series_episodes
  WHERE series_id = p_series_id;

  RETURN next_num;
END;
$$;

-- 6. get_series_episode_count
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_series_episode_count(p_series_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  episode_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO episode_count
  FROM public.series_episodes
  WHERE series_id = p_series_id;

  RETURN episode_count;
END;
$$;

-- 7. get_character_relationships
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_character_relationships(p_character_id uuid)
RETURNS TABLE(
  id uuid,
  other_character_id uuid,
  other_character_name text,
  relationship_type text,
  custom_label text,
  is_symmetric boolean,
  is_character_a boolean,
  description text
)
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    CASE
      WHEN cr.character_a_id = p_character_id THEN cr.character_b_id
      ELSE cr.character_a_id
    END as other_character_id,
    CASE
      WHEN cr.character_a_id = p_character_id THEN sc_b.name
      ELSE sc_a.name
    END as other_character_name,
    cr.relationship_type,
    cr.custom_label,
    cr.is_symmetric,
    (cr.character_a_id = p_character_id) as is_character_a,
    cr.description
  FROM public.character_relationships cr
  JOIN public.series_characters sc_a ON cr.character_a_id = sc_a.id
  JOIN public.series_characters sc_b ON cr.character_b_id = sc_b.id
  WHERE cr.character_a_id = p_character_id OR cr.character_b_id = p_character_id;
END;
$$;

-- 8. get_series_relationships_context
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_series_relationships_context(p_series_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  context_text TEXT := '';
  rel_record RECORD;
BEGIN
  FOR rel_record IN
    SELECT
      sc_a.name as char_a_name,
      sc_b.name as char_b_name,
      cr.relationship_type,
      cr.custom_label,
      cr.description
    FROM public.character_relationships cr
    JOIN public.series_characters sc_a ON cr.character_a_id = sc_a.id
    JOIN public.series_characters sc_b ON cr.character_b_id = sc_b.id
    WHERE cr.series_id = p_series_id
    ORDER BY sc_a.name, sc_b.name
  LOOP
    context_text := context_text || rel_record.char_a_name || ' and ' || rel_record.char_b_name || ': ';

    IF rel_record.custom_label IS NOT NULL THEN
      context_text := context_text || rel_record.custom_label;
    ELSE
      context_text := context_text || rel_record.relationship_type;
    END IF;

    IF rel_record.description IS NOT NULL THEN
      context_text := context_text || ' (' || rel_record.description || ')';
    END IF;

    context_text := context_text || E'\n';
  END LOOP;

  RETURN NULLIF(TRIM(context_text), '');
END;
$$;

-- 9. relationship_exists
-- ================================================================
CREATE OR REPLACE FUNCTION public.relationship_exists(
  p_series_id uuid,
  p_character_a_id uuid,
  p_character_b_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  exists_flag BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.character_relationships
    WHERE series_id = p_series_id
    AND (
      (character_a_id = p_character_a_id AND character_b_id = p_character_b_id)
      OR
      (character_a_id = p_character_b_id AND character_b_id = p_character_a_id)
    )
  ) INTO exists_flag;

  RETURN exists_flag;
END;
$$;

-- 10. get_series_videos
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_series_videos(series_uuid uuid)
RETURNS TABLE(
  id uuid,
  title text,
  project_id uuid,
  project_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.project_id,
    p.name as project_name,
    v.created_at
  FROM public.videos v
  LEFT JOIN public.projects p ON v.project_id = p.id
  WHERE v.series_id = series_uuid
  ORDER BY v.created_at DESC;
END;
$$;

-- 11. get_project_videos
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_project_videos(project_uuid uuid)
RETURNS TABLE(
  id uuid,
  title text,
  series_id uuid,
  series_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.series_id,
    s.name as series_name,
    v.created_at
  FROM public.videos v
  LEFT JOIN public.series s ON v.series_id = s.id
  WHERE v.project_id = project_uuid
  ORDER BY v.created_at DESC;
END;
$$;

-- 12. test_jsonb_access
-- ================================================================
CREATE OR REPLACE FUNCTION public.test_jsonb_access()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT 'JSONB access test successful' INTO result;
  RETURN result;
END;
$$;

-- 13. increment_consultation_usage
-- ================================================================
CREATE OR REPLACE FUNCTION public.increment_consultation_usage(user_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.profiles
  SET consultation_count = COALESCE(consultation_count, 0) + 1
  WHERE id = user_id;
END;
$$;

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these after migration to verify fixes

-- Check all functions now have search_path set
SELECT
  p.proname as function_name,
  CASE
    WHEN p.proconfig IS NULL THEN '❌ No search_path'
    WHEN EXISTS (
      SELECT 1 FROM unnest(p.proconfig) cfg
      WHERE cfg LIKE 'search_path=%'
    ) THEN '✅ search_path set'
    ELSE '❌ No search_path'
  END as status,
  p.proconfig as config
FROM pg_proc p
WHERE p.proname IN (
  'auto_create_series_visual_style',
  'get_next_episode_number',
  'get_series_episode_count',
  'get_character_relationships',
  'get_series_relationships_context',
  'relationship_exists',
  'get_series_videos',
  'get_project_videos',
  'test_jsonb_access',
  'update_updated_at_column',
  'handle_new_user',
  'increment_consultation_usage',
  'update_character_sora_template'
)
AND p.pronamespace = 'public'::regnamespace
ORDER BY p.proname;

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================
-- After this migration:
-- - All 13 functions should show "✅ search_path set"
-- - Search path injection vulnerability eliminated
-- - Supabase linter should show 0 function_search_path_mutable warnings
-- ================================================================
