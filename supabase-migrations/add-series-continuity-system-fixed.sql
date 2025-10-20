-- Video Series Continuity System Migration
-- Date: 2025-10-19
-- Description: Adds comprehensive series continuity infrastructure for character, setting, and visual style management

-- ============================================================================
-- 1. Extend existing series table with new fields
-- ============================================================================

-- Add new fields to series table
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS genre TEXT CHECK (genre IN ('narrative', 'product-showcase', 'educational', 'brand-content', 'other')),
  ADD COLUMN IF NOT EXISTS enforce_continuity BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_continuity_breaks BOOLEAN DEFAULT TRUE;

-- Add unique constraint (using DO block to handle IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_series_name_per_project'
  ) THEN
    ALTER TABLE public.series
      ADD CONSTRAINT unique_series_name_per_project UNIQUE(project_id, name);
  END IF;
END $$;

-- ============================================================================
-- 2. Series Characters Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.series_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL, -- Full character appearance description
  role TEXT CHECK (role IN ('protagonist', 'supporting', 'background', 'other')),

  -- Character details
  appearance_details JSONB DEFAULT '{}'::jsonb,
  performance_style TEXT, -- "deliberate and unhurried", "energetic", etc.

  -- Evolution tracking
  introduced_episode_id UUID, -- References videos table, added later
  evolution_timeline JSONB DEFAULT '[]'::jsonb, -- Array of { episode_id, episode_number, changes }

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_character_name_per_series UNIQUE(series_id, name)
);

-- Index for characters
CREATE INDEX IF NOT EXISTS idx_characters_series ON public.series_characters(series_id);

-- ============================================================================
-- 3. Series Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.series_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL, -- Full setting/location description

  -- Setting details
  environment_type TEXT CHECK (environment_type IN ('interior', 'exterior', 'mixed', 'other')),
  time_of_day TEXT, -- "morning", "afternoon", "evening", "night", "golden-hour", "varies"
  atmosphere TEXT, -- Atmospheric qualities

  -- Setting details JSONB
  details JSONB DEFAULT '{}'::jsonb, -- { props, mood, etc. }

  -- Usage tracking
  introduced_episode_id UUID, -- References videos table, added later
  is_primary BOOLEAN DEFAULT FALSE, -- Primary/recurring setting

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_setting_name_per_series UNIQUE(series_id, name)
);

-- Index for settings
CREATE INDEX IF NOT EXISTS idx_settings_series ON public.series_settings(series_id);

-- ============================================================================
-- 4. Series Visual Style Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.series_visual_style (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,

  -- Cinematography
  cinematography JSONB DEFAULT '{}'::jsonb, -- { shotTypes, cameraMovements, framingNotes }

  -- Lighting
  lighting JSONB DEFAULT '{}'::jsonb, -- { direction, quality, colorTemperature }

  -- Color grading
  color_palette JSONB DEFAULT '{}'::jsonb, -- { mood, grading }

  -- Composition
  composition_rules JSONB DEFAULT '{}'::jsonb, -- { primaryRule, framingDetails }

  -- Audio style
  audio_style JSONB DEFAULT '{}'::jsonb, -- { foley, ambience, musicMood }

  -- Platform
  default_platform TEXT CHECK (default_platform IN ('tiktok', 'instagram', 'youtube-shorts', 'both')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for visual style
CREATE INDEX IF NOT EXISTS idx_visual_style_series ON public.series_visual_style(series_id);

-- ============================================================================
-- 5. Seasons Table (optional grouping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT, -- "Season 1: The Beginning", optional
  description TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_season_number_per_series UNIQUE(series_id, season_number)
);

-- Index for seasons
CREATE INDEX IF NOT EXISTS idx_seasons_series ON public.seasons(series_id);

-- ============================================================================
-- 6. Series Episodes Table (links videos to series with context)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.series_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL, -- Optional
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  -- Episode metadata
  episode_number INTEGER NOT NULL, -- Within series or season
  episode_title TEXT,

  -- Story tracking
  story_beat TEXT, -- What happens in this episode
  emotional_arc TEXT, -- Emotional progression

  -- Continuity overrides
  continuity_breaks JSONB DEFAULT '[]'::jsonb, -- Array of { type, reason }
  custom_context JSONB DEFAULT '{}'::jsonb, -- Episode-specific context overrides

  -- Episode-specific character/setting usage
  characters_used UUID[] DEFAULT ARRAY[]::UUID[], -- Array of character IDs present
  settings_used UUID[] DEFAULT ARRAY[]::UUID[], -- Array of setting IDs used

  -- Timeline
  timeline_position INTEGER, -- For chronological ordering (may differ from episode_number)
  is_key_episode BOOLEAN DEFAULT FALSE, -- Flagged as important for context

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_episode_number_per_series UNIQUE(series_id, episode_number),
  CONSTRAINT unique_video_per_series UNIQUE(video_id) -- A video can only be in one series
);

-- Indexes for episodes
CREATE INDEX IF NOT EXISTS idx_episodes_series ON public.series_episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON public.series_episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_video ON public.series_episodes(video_id);
CREATE INDEX IF NOT EXISTS idx_episodes_timeline ON public.series_episodes(series_id, timeline_position);
CREATE INDEX IF NOT EXISTS idx_episodes_key ON public.series_episodes(series_id, is_key_episode) WHERE is_key_episode = TRUE;

-- ============================================================================
-- 7. Add foreign key constraints for introduced_episode_id
-- ============================================================================

-- Add constraint for characters.introduced_episode_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_character_intro_episode'
  ) THEN
    ALTER TABLE public.series_characters
      ADD CONSTRAINT fk_character_intro_episode
      FOREIGN KEY (introduced_episode_id)
      REFERENCES public.videos(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for settings.introduced_episode_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_setting_intro_episode'
  ) THEN
    ALTER TABLE public.series_settings
      ADD CONSTRAINT fk_setting_intro_episode
      FOREIGN KEY (introduced_episode_id)
      REFERENCES public.videos(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 8. RLS Policies for new tables
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.series_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_visual_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_episodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for series_characters
DROP POLICY IF EXISTS "Users can view characters in own series" ON public.series_characters;
CREATE POLICY "Users can view characters in own series" ON public.series_characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_characters.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create characters in own series" ON public.series_characters;
CREATE POLICY "Users can create characters in own series" ON public.series_characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_characters.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update characters in own series" ON public.series_characters;
CREATE POLICY "Users can update characters in own series" ON public.series_characters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_characters.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete characters in own series" ON public.series_characters;
CREATE POLICY "Users can delete characters in own series" ON public.series_characters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_characters.series_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for series_settings
DROP POLICY IF EXISTS "Users can view settings in own series" ON public.series_settings;
CREATE POLICY "Users can view settings in own series" ON public.series_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_settings.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create settings in own series" ON public.series_settings;
CREATE POLICY "Users can create settings in own series" ON public.series_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_settings.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update settings in own series" ON public.series_settings;
CREATE POLICY "Users can update settings in own series" ON public.series_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_settings.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete settings in own series" ON public.series_settings;
CREATE POLICY "Users can delete settings in own series" ON public.series_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_settings.series_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for series_visual_style
DROP POLICY IF EXISTS "Users can view visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can view visual style in own series" ON public.series_visual_style
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_style.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can create visual style in own series" ON public.series_visual_style
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_style.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can update visual style in own series" ON public.series_visual_style
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_style.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete visual style in own series" ON public.series_visual_style;
CREATE POLICY "Users can delete visual style in own series" ON public.series_visual_style
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_visual_style.series_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for seasons
DROP POLICY IF EXISTS "Users can view seasons in own series" ON public.seasons;
CREATE POLICY "Users can view seasons in own series" ON public.seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = seasons.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create seasons in own series" ON public.seasons;
CREATE POLICY "Users can create seasons in own series" ON public.seasons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = seasons.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update seasons in own series" ON public.seasons;
CREATE POLICY "Users can update seasons in own series" ON public.seasons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = seasons.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete seasons in own series" ON public.seasons;
CREATE POLICY "Users can delete seasons in own series" ON public.seasons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = seasons.series_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for series_episodes
DROP POLICY IF EXISTS "Users can view episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can view episodes in own series" ON public.series_episodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_episodes.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can create episodes in own series" ON public.series_episodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_episodes.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can update episodes in own series" ON public.series_episodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_episodes.series_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete episodes in own series" ON public.series_episodes;
CREATE POLICY "Users can delete episodes in own series" ON public.series_episodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.series s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = series_episodes.series_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. Triggers for updated_at columns
-- ============================================================================

DROP TRIGGER IF EXISTS update_series_characters_updated_at ON public.series_characters;
CREATE TRIGGER update_series_characters_updated_at BEFORE UPDATE ON public.series_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_series_visual_style_updated_at ON public.series_visual_style;
CREATE TRIGGER update_series_visual_style_updated_at BEFORE UPDATE ON public.series_visual_style
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. Helper functions
-- ============================================================================

-- Function to auto-create visual_style entry when series is created
CREATE OR REPLACE FUNCTION public.auto_create_series_visual_style()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.series_visual_style (series_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_series_created ON public.series;
CREATE TRIGGER on_series_created
  AFTER INSERT ON public.series
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_series_visual_style();

-- Function to get next episode number for a series
CREATE OR REPLACE FUNCTION public.get_next_episode_number(p_series_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(episode_number), 0) + 1
  INTO next_num
  FROM public.series_episodes
  WHERE series_id = p_series_id;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get series episode count
CREATE OR REPLACE FUNCTION public.get_series_episode_count(p_series_id UUID)
RETURNS INTEGER AS $$
DECLARE
  episode_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO episode_count
  FROM public.series_episodes
  WHERE series_id = p_series_id;

  RETURN episode_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Migration complete
-- ============================================================================
