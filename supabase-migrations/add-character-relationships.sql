-- Character Relationships System Migration
-- Date: 2025-10-20
-- Description: Adds character relationship tracking and visualization system

-- ============================================================================
-- 1. Character Relationships Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.character_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,

  -- Characters involved (from series_characters table)
  character_a_id UUID NOT NULL REFERENCES public.series_characters(id) ON DELETE CASCADE,
  character_b_id UUID NOT NULL REFERENCES public.series_characters(id) ON DELETE CASCADE,

  -- Relationship properties
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'friends',
    'rivals',
    'romantic',
    'family',
    'allies',
    'enemies',
    'mentor_student',
    'custom'
  )),
  custom_label TEXT, -- Only used when relationship_type = 'custom'

  -- Directionality
  is_symmetric BOOLEAN DEFAULT TRUE, -- TRUE = bidirectional (A ↔ B), FALSE = one-way (A → B)

  -- Additional context
  description TEXT, -- Optional context about the relationship
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10), -- Strength of relationship (optional)

  -- Temporal tracking
  established_in_episode_id UUID REFERENCES public.videos(id) ON DELETE SET NULL, -- When relationship started
  evolution_notes TEXT, -- How relationship evolves over time

  -- Future enhancement: Multi-attribute mode (Phase 2)
  attributes JSONB DEFAULT '{}'::jsonb, -- { familiarity, trust, affection, power_dynamic }

  -- Display properties
  display_order INTEGER DEFAULT 0, -- For UI ordering

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_relationship CHECK (character_a_id != character_b_id),
  CONSTRAINT relationship_unique UNIQUE(series_id, character_a_id, character_b_id)
);

-- ============================================================================
-- 2. Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_relationships_series ON public.character_relationships(series_id);
CREATE INDEX IF NOT EXISTS idx_relationships_character_a ON public.character_relationships(character_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_character_b ON public.character_relationships(character_b_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON public.character_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_episode ON public.character_relationships(established_in_episode_id) WHERE established_in_episode_id IS NOT NULL;

-- ============================================================================
-- 3. Row-Level Security Policies
-- ============================================================================

ALTER TABLE public.character_relationships ENABLE ROW LEVEL SECURITY;

-- Users can view relationships in their own series
DROP POLICY IF EXISTS "Users can view relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can view relationships in own series" ON public.character_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = character_relationships.series_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can create relationships in their own series
DROP POLICY IF EXISTS "Users can create relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can create relationships in own series" ON public.character_relationships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = character_relationships.series_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can update relationships in their own series
DROP POLICY IF EXISTS "Users can update relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can update relationships in own series" ON public.character_relationships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = character_relationships.series_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can delete relationships in their own series
DROP POLICY IF EXISTS "Users can delete relationships in own series" ON public.character_relationships;
CREATE POLICY "Users can delete relationships in own series" ON public.character_relationships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = character_relationships.series_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Triggers for updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_character_relationships_updated_at ON public.character_relationships;
CREATE TRIGGER update_character_relationships_updated_at
  BEFORE UPDATE ON public.character_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to get all relationships for a character (both as A and B)
CREATE OR REPLACE FUNCTION public.get_character_relationships(p_character_id UUID)
RETURNS TABLE (
  id UUID,
  other_character_id UUID,
  other_character_name TEXT,
  relationship_type TEXT,
  custom_label TEXT,
  is_symmetric BOOLEAN,
  is_character_a BOOLEAN, -- TRUE if p_character_id is character_a, FALSE if character_b
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Relationships where character is A
  SELECT
    r.id,
    r.character_b_id AS other_character_id,
    cb.name AS other_character_name,
    r.relationship_type,
    r.custom_label,
    r.is_symmetric,
    TRUE AS is_character_a,
    r.description
  FROM public.character_relationships r
  JOIN public.series_characters cb ON r.character_b_id = cb.id
  WHERE r.character_a_id = p_character_id

  UNION ALL

  -- Relationships where character is B (only include if symmetric OR show as reverse)
  SELECT
    r.id,
    r.character_a_id AS other_character_id,
    ca.name AS other_character_name,
    r.relationship_type,
    r.custom_label,
    r.is_symmetric,
    FALSE AS is_character_a,
    r.description
  FROM public.character_relationships r
  JOIN public.series_characters ca ON r.character_a_id = ca.id
  WHERE r.character_b_id = p_character_id
  AND r.is_symmetric = TRUE; -- Only show symmetric relationships from B's perspective
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all relationships in a series (formatted for AI context)
CREATE OR REPLACE FUNCTION public.get_series_relationships_context(p_series_id UUID)
RETURNS TEXT AS $$
DECLARE
  relationship_text TEXT;
  rel_record RECORD;
  arrow TEXT;
BEGIN
  relationship_text := E'CHARACTER RELATIONSHIPS IN THIS SERIES:\n';

  FOR rel_record IN
    SELECT
      ca.name AS character_a_name,
      cb.name AS character_b_name,
      r.relationship_type,
      r.custom_label,
      r.is_symmetric,
      r.description
    FROM public.character_relationships r
    JOIN public.series_characters ca ON r.character_a_id = ca.id
    JOIN public.series_characters cb ON r.character_b_id = cb.id
    WHERE r.series_id = p_series_id
    ORDER BY r.display_order, ca.name, cb.name
  LOOP
    -- Determine arrow based on directionality
    arrow := CASE WHEN rel_record.is_symmetric THEN ' ↔ ' ELSE ' → ' END;

    -- Build relationship description
    relationship_text := relationship_text || '- ' || rel_record.character_a_name || arrow || rel_record.character_b_name || ': ';

    -- Add relationship type
    IF rel_record.relationship_type = 'custom' THEN
      relationship_text := relationship_text || COALESCE(rel_record.custom_label, 'custom relationship');
    ELSE
      relationship_text := relationship_text || rel_record.relationship_type;
    END IF;

    -- Add description if exists
    IF rel_record.description IS NOT NULL THEN
      relationship_text := relationship_text || ' (' || rel_record.description || ')';
    END IF;

    relationship_text := relationship_text || E'\n';
  END LOOP;

  -- Add instruction for AI if relationships exist
  IF relationship_text != E'CHARACTER RELATIONSHIPS IN THIS SERIES:\n' THEN
    relationship_text := relationship_text || E'\nIMPORTANT: When these characters interact, maintain consistency with established relationship dynamics.';
  ELSE
    -- No relationships defined
    RETURN NULL;
  END IF;

  RETURN relationship_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if relationship already exists (prevents duplicates)
CREATE OR REPLACE FUNCTION public.relationship_exists(
  p_series_id UUID,
  p_character_a_id UUID,
  p_character_b_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.character_relationships
    WHERE series_id = p_series_id
    AND (
      (character_a_id = p_character_a_id AND character_b_id = p_character_b_id)
      OR
      (character_a_id = p_character_b_id AND character_b_id = p_character_a_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMENT ON TABLE public.character_relationships IS 'Tracks relationships between characters in a series for continuity and AI context';
COMMENT ON COLUMN public.character_relationships.is_symmetric IS 'TRUE = bidirectional (friends), FALSE = one-way (crush)';
COMMENT ON COLUMN public.character_relationships.attributes IS 'Future: Multi-attribute mode with familiarity, trust, affection, power_dynamic scores';
COMMENT ON FUNCTION public.get_series_relationships_context IS 'Returns formatted relationship context for AI prompt injection';
