-- Character Visual Cues Migration
-- Date: 2025-10-20
-- Description: Adds visual reference image support for characters to maintain appearance consistency

-- ============================================================================
-- 1. Add visual cues fields to series_characters table
-- ============================================================================

ALTER TABLE public.series_characters
  ADD COLUMN IF NOT EXISTS visual_reference_url TEXT, -- URL to main reference image in Supabase storage
  ADD COLUMN IF NOT EXISTS visual_cues JSONB DEFAULT '[]'::jsonb; -- Array of additional reference images with notes

-- visual_cues structure: [
--   {
--     url: string,           -- Image URL in Supabase storage
--     caption: string,        -- Description/note about this reference
--     type: 'full-body' | 'face' | 'costume' | 'expression' | 'other',
--     uploaded_at: timestamp
--   }
-- ]

COMMENT ON COLUMN public.series_characters.visual_reference_url IS 'Primary visual reference image URL for character appearance';
COMMENT ON COLUMN public.series_characters.visual_cues IS 'Array of additional visual reference images with metadata for maintaining visual consistency';

-- ============================================================================
-- Migration complete
-- ============================================================================
