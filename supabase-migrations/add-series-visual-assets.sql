-- Add visual assets table for series (logos, color palettes, reference images)
-- These assets help the AI creative team understand brand identity and visual style

-- Create enum for asset types
DO $$ BEGIN
  CREATE TYPE public.visual_asset_type AS ENUM ('logo', 'color_palette', 'setting_reference', 'style_reference', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create visual_assets table
CREATE TABLE IF NOT EXISTS public.series_visual_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,

  -- Asset metadata
  name TEXT NOT NULL,
  description TEXT,
  asset_type public.visual_asset_type NOT NULL DEFAULT 'other',

  -- File storage (using Supabase Storage)
  storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  mime_type TEXT,

  -- Dimensions for images
  width INTEGER,
  height INTEGER,

  -- AI analysis (we can extract colors, objects, etc. from images)
  ai_analysis JSONB DEFAULT '{}',

  -- Display order
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_series_visual_assets_series_id ON public.series_visual_assets(series_id);
CREATE INDEX IF NOT EXISTS idx_series_visual_assets_type ON public.series_visual_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_series_visual_assets_order ON public.series_visual_assets(series_id, display_order);

-- Enable RLS
ALTER TABLE public.series_visual_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can view assets in own series" ON public.series_visual_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.series s
      INNER JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_assets.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can insert assets in own series" ON public.series_visual_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      INNER JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_assets.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can update assets in own series" ON public.series_visual_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.series s
      INNER JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_assets.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete assets in own series" ON public.series_visual_assets;
CREATE POLICY "Users can delete assets in own series" ON public.series_visual_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.series s
      INNER JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_assets.series_id
      AND p.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_series_visual_assets_updated_at ON public.series_visual_assets;
CREATE TRIGGER update_series_visual_assets_updated_at
  BEFORE UPDATE ON public.series_visual_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.series_visual_assets IS 'Visual reference assets (logos, color palettes, images) for AI creative team';
COMMENT ON COLUMN public.series_visual_assets.asset_type IS 'Type of visual asset for categorization';
COMMENT ON COLUMN public.series_visual_assets.storage_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN public.series_visual_assets.ai_analysis IS 'AI-extracted metadata like dominant colors, detected objects, etc.';
