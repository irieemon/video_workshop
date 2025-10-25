-- =====================================================
-- Screenplay Structure Migration
-- Adds professional screenplay planning to series system
-- =====================================================

-- =====================================================
-- 1. EXTEND SERIES TABLE
-- Add screenplay metadata at series level
-- =====================================================

ALTER TABLE series ADD COLUMN IF NOT EXISTS screenplay_data JSONB DEFAULT '{
  "logline": null,
  "premise": null,
  "genre": null,
  "tone": null,
  "target_audience": null,
  "structure_template": "three_act",
  "themes": []
}'::jsonb;

ALTER TABLE series ADD COLUMN IF NOT EXISTS series_bible TEXT;
ALTER TABLE series ADD COLUMN IF NOT EXISTS overall_story_arc TEXT;

COMMENT ON COLUMN series.screenplay_data IS 'Professional screenplay metadata: logline, premise, genre, tone, audience, template';
COMMENT ON COLUMN series.series_bible IS 'Character profiles, world rules, recurring elements';
COMMENT ON COLUMN series.overall_story_arc IS 'Long-term narrative arc for serialized content';

-- =====================================================
-- 2. EXTEND CHARACTERS TABLE
-- Add dramatic character arc fields
-- =====================================================

ALTER TABLE series_characters ADD COLUMN IF NOT EXISTS dramatic_profile JSONB DEFAULT '{
  "want": null,
  "need": null,
  "fatal_flaw": null,
  "backstory_wound": null,
  "arc_type": "growth",
  "transformation_moment": null,
  "role_in_story": "supporting"
}'::jsonb;

ALTER TABLE series_characters ADD COLUMN IF NOT EXISTS character_bio TEXT;

COMMENT ON COLUMN series_characters.dramatic_profile IS 'Screenplay character development: want vs need, flaw, arc type, role';
COMMENT ON COLUMN series_characters.character_bio IS 'Rich text character description and backstory';

-- =====================================================
-- 3. CREATE EPISODES TABLE
-- Professional episode structure with act breaks
-- =====================================================

CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  logline TEXT,

  -- Act structure
  structure_type TEXT DEFAULT 'three_act' CHECK (structure_type IN ('three_act', 'five_act', 'hero_journey', 'save_the_cat')),
  act_breakdown JSONB DEFAULT '[]'::jsonb,

  -- Plot tracking
  plots JSONB DEFAULT '{
    "a_plot": {"description": null, "beats": []},
    "b_plot": {"description": null, "beats": []},
    "c_plot": {"description": null, "beats": []}
  }'::jsonb,

  -- Story beats (professional screenplay structure)
  story_beats JSONB DEFAULT '{
    "inciting_incident": null,
    "first_plot_point": null,
    "midpoint": null,
    "dark_night": null,
    "climax": null,
    "resolution": null
  }'::jsonb,

  -- Character development per episode
  character_development JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  runtime_minutes INTEGER,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'outlined', 'scripted', 'production', 'completed')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(series_id, episode_number)
);

COMMENT ON TABLE episodes IS 'Professional episode structure with act breaks and story beats';
COMMENT ON COLUMN episodes.act_breakdown IS 'Array of acts with scenes and key moments per act';
COMMENT ON COLUMN episodes.plots IS 'A/B/C plot tracking with story beats';
COMMENT ON COLUMN episodes.story_beats IS 'Professional screenplay beats: inciting incident, plot points, climax';
COMMENT ON COLUMN episodes.character_development IS 'Character state changes and growth per episode';

-- =====================================================
-- 4. CREATE SCENES TABLE
-- Individual scenes that become video prompts
-- =====================================================

CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,

  -- Screenplay format
  scene_heading TEXT NOT NULL, -- "INT. DETECTIVE'S OFFICE - DAY"
  location TEXT NOT NULL,
  time_of_day TEXT CHECK (time_of_day IN ('DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS')),
  interior_exterior TEXT CHECK (interior_exterior IN ('INT', 'EXT', 'INT/EXT')),

  -- Scene content
  action_description TEXT, -- What happens in the scene
  dialogue JSONB DEFAULT '[]'::jsonb, -- Array of {character_id, line, parenthetical}
  emotional_beat TEXT, -- Primary emotion/tone of scene

  -- Story structure
  act_number INTEGER,
  plot_line TEXT CHECK (plot_line IN ('A', 'B', 'C', 'NONE')),
  scene_purpose TEXT, -- "Advance plot", "Reveal character", "Plant/payoff"
  story_function TEXT, -- Which beat this serves (inciting_incident, midpoint, etc.)

  -- Production
  characters_present UUID[] DEFAULT ARRAY[]::UUID[],
  props_needed TEXT[],
  estimated_duration_seconds INTEGER,

  -- Video generation
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  video_prompt TEXT, -- Auto-generated from scene details

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(episode_id, scene_number)
);

COMMENT ON TABLE scenes IS 'Individual scenes with screenplay format that become video prompts';
COMMENT ON COLUMN scenes.scene_heading IS 'Standard screenplay heading: INT/EXT. LOCATION - TIME';
COMMENT ON COLUMN scenes.dialogue IS 'Array of dialogue lines with character and parentheticals';
COMMENT ON COLUMN scenes.plot_line IS 'Which plot thread (A/B/C) this scene advances';
COMMENT ON COLUMN scenes.video_prompt IS 'Auto-generated prompt for video generation from scene details';

-- =====================================================
-- 5. CREATE SCREENPLAY SESSIONS TABLE
-- Track agent dialogue sessions for iterative creation
-- =====================================================

CREATE TABLE IF NOT EXISTS screenplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session state
  conversation_history JSONB DEFAULT '[]'::jsonb,
  current_step TEXT DEFAULT 'series_setup',
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- What's being created/edited
  target_type TEXT CHECK (target_type IN ('series', 'episode', 'scene', 'character')),
  target_id UUID,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE screenplay_sessions IS 'Agent dialogue sessions for screenplay creation';
COMMENT ON COLUMN screenplay_sessions.conversation_history IS 'Full conversation between user and screenplay agent';
COMMENT ON COLUMN screenplay_sessions.current_step IS 'Current stage in screenplay creation process';

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_scenes_episode ON scenes(episode_id, scene_number);
CREATE INDEX IF NOT EXISTS idx_scenes_video ON scenes(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screenplay_sessions_series ON screenplay_sessions(series_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_sessions_user ON screenplay_sessions(user_id, completed);

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenplay_sessions ENABLE ROW LEVEL SECURITY;

-- Episodes: Users can only access episodes for their series
CREATE POLICY episodes_select ON episodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = episodes.series_id
      AND series.user_id = auth.uid()
    )
  );

CREATE POLICY episodes_insert ON episodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = episodes.series_id
      AND series.user_id = auth.uid()
    )
  );

CREATE POLICY episodes_update ON episodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = episodes.series_id
      AND series.user_id = auth.uid()
    )
  );

CREATE POLICY episodes_delete ON episodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = episodes.series_id
      AND series.user_id = auth.uid()
    )
  );

-- Scenes: Users can only access scenes for their episodes
CREATE POLICY scenes_select ON scenes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM episodes e
      JOIN series s ON s.id = e.series_id
      WHERE e.id = scenes.episode_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY scenes_insert ON scenes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM episodes e
      JOIN series s ON s.id = e.series_id
      WHERE e.id = scenes.episode_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY scenes_update ON scenes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM episodes e
      JOIN series s ON s.id = e.series_id
      WHERE e.id = scenes.episode_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY scenes_delete ON scenes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM episodes e
      JOIN series s ON s.id = e.series_id
      WHERE e.id = scenes.episode_id
      AND s.user_id = auth.uid()
    )
  );

-- Screenplay sessions: Users can only access their own sessions
CREATE POLICY screenplay_sessions_all ON screenplay_sessions
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to auto-generate video prompt from scene details
CREATE OR REPLACE FUNCTION generate_scene_video_prompt(scene_id UUID)
RETURNS TEXT AS $$
DECLARE
  scene_data RECORD;
  character_names TEXT[];
  prompt TEXT;
BEGIN
  -- Get scene details with character names
  SELECT
    s.*,
    ARRAY_AGG(c.name ORDER BY c.name) FILTER (WHERE c.id = ANY(s.characters_present)) as chars
  INTO scene_data
  FROM scenes s
  LEFT JOIN series_characters c ON c.id = ANY(s.characters_present)
  WHERE s.id = scene_id
  GROUP BY s.id, s.episode_id, s.scene_number, s.scene_heading, s.location,
           s.time_of_day, s.interior_exterior, s.action_description, s.dialogue,
           s.emotional_beat, s.act_number, s.plot_line, s.scene_purpose,
           s.story_function, s.characters_present, s.props_needed,
           s.estimated_duration_seconds, s.video_id, s.video_prompt, s.notes,
           s.created_at, s.updated_at;

  -- Build prompt from scene elements
  prompt := format(
    E'Scene: %s\n\nLocation: %s (%s)\nTime: %s\n\nAction:\n%s\n\nEmotional Tone: %s',
    scene_data.scene_heading,
    scene_data.location,
    scene_data.interior_exterior,
    scene_data.time_of_day,
    scene_data.action_description,
    COALESCE(scene_data.emotional_beat, 'neutral')
  );

  -- Add characters if present
  IF array_length(scene_data.chars, 1) > 0 THEN
    prompt := prompt || E'\n\nCharacters: ' || array_to_string(scene_data.chars, ', ');
  END IF;

  RETURN prompt;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update video_prompt when scene changes
CREATE OR REPLACE FUNCTION update_scene_video_prompt()
RETURNS TRIGGER AS $$
BEGIN
  NEW.video_prompt := generate_scene_video_prompt(NEW.id);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scene_video_prompt_trigger
  BEFORE INSERT OR UPDATE OF action_description, emotional_beat, characters_present, location, time_of_day
  ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_scene_video_prompt();

-- =====================================================
-- 9. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Full episode breakdown with scene count
CREATE OR REPLACE VIEW episode_overview AS
SELECT
  e.*,
  s.name as series_name,
  COUNT(sc.id) as scene_count,
  SUM(sc.estimated_duration_seconds) as total_estimated_duration,
  COUNT(sc.video_id) FILTER (WHERE sc.video_id IS NOT NULL) as videos_generated
FROM episodes e
JOIN series s ON s.id = e.series_id
LEFT JOIN scenes sc ON sc.episode_id = e.id
GROUP BY e.id, s.name;

COMMENT ON VIEW episode_overview IS 'Episode summary with scene counts and production status';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
