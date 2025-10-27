-- Add screenplay enrichment fields to videos table
-- This enables videos to store rich context from episode screenplays

-- Add scene_id to track which screenplay scene this video represents
ALTER TABLE videos
ADD COLUMN scene_id TEXT;

-- Add screenplay_enrichment_data to store extracted screenplay context
ALTER TABLE videos
ADD COLUMN screenplay_enrichment_data JSONB;

-- Add comment explaining the screenplay_enrichment_data structure
COMMENT ON COLUMN videos.screenplay_enrichment_data IS
'Stores enriched screenplay context including:
{
  "sourceScene": {
    "sceneId": "string",
    "sceneNumber": number,
    "location": "string",
    "timeOfDay": "INT|EXT|INT/EXT",
    "timePeriod": "DAY|NIGHT|DAWN|DUSK|CONTINUOUS"
  },
  "extractedDialogue": [
    {
      "character": "string",
      "lines": ["string"]
    }
  ],
  "extractedActions": ["string"],
  "charactersInScene": ["character_id"],
  "settingsInScene": ["setting_id"],
  "emotionalBeat": "string",
  "durationEstimate": number,
  "enrichmentTimestamp": "ISO8601 timestamp"
}';

-- Create index on scene_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_scene_id ON videos(scene_id);

-- Create index on episode_id for finding all videos from an episode
CREATE INDEX IF NOT EXISTS idx_videos_episode_id ON videos(episode_id);

-- Create GIN index on screenplay_enrichment_data for JSONB queries
CREATE INDEX IF NOT EXISTS idx_videos_screenplay_enrichment
ON videos USING GIN (screenplay_enrichment_data);
