-- Migration: Add user_edits column to videos table for Advanced Mode
-- This stores user's manual edits, shot lists, and iteration history

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS user_edits JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.videos.user_edits IS 'Stores Advanced Mode edits: {mode, iterations, edits[], final_version}';

-- Example structure:
-- {
--   "mode": "advanced",
--   "iterations": 2,
--   "edits": [
--     {
--       "timestamp": "2025-01-17T10:30:00Z",
--       "prompt_changes": "edited prompt text",
--       "shot_list": [
--         {
--           "timing": "0-3s",
--           "description": "Wide establishing shot",
--           "camera": "Slow dolly in, eye level",
--           "order": 1
--         }
--       ],
--       "additional_guidance": "Focus more on emotional journey",
--       "regenerated_agents": ["director", "music_producer"]
--     }
--   ],
--   "final_version": {
--     "prompt": "final optimized prompt",
--     "shot_list": [...],
--     "character_count": 487
--   }
-- }
