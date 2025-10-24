-- ================================================
-- VOICE PROFILE VERIFICATION AND POPULATION
-- ================================================
-- Purpose: Check current voice_profile status and populate if empty
-- Date: 2025-10-23
-- Issue: Character vocals not appearing in Sora prompts

-- ================================================
-- STEP 1: VERIFY CURRENT STATE
-- ================================================
-- Check if Dad, Lyle, Tom have voice_profile data
SELECT
  name,
  jsonb_pretty(voice_profile) as voice_data,
  LEFT(sora_prompt_template, 200) || '...' as template_preview
FROM series_characters
WHERE name IN ('Dad', 'Lyle', 'Tom')
ORDER BY name;

-- Expected issue: voice_profile is {} or NULL
-- Expected result: sora_prompt_template does NOT contain "Voice:" section

-- ================================================
-- STEP 2: POPULATE VOICE PROFILES
-- ================================================

-- Dad: Early 30s father character
UPDATE series_characters
SET voice_profile = '{
  "age_sound": "early 30s",
  "accent": "neutral American",
  "pitch": "medium",
  "tone": "warm",
  "pace": "moderate",
  "energy": "moderate"
}'::jsonb
WHERE name = 'Dad';

-- Lyle: Young child character
UPDATE series_characters
SET voice_profile = '{
  "age_sound": "young child",
  "accent": "neutral American",
  "pitch": "high",
  "tone": "playful",
  "pace": "fast",
  "energy": "high"
}'::jsonb
WHERE name = 'Lyle';

-- Tom: Early teen character
UPDATE series_characters
SET voice_profile = '{
  "age_sound": "early teens",
  "accent": "neutral American",
  "pitch": "medium",
  "tone": "neutral",
  "pace": "moderate",
  "energy": "moderate"
}'::jsonb
WHERE name = 'Tom';

-- ================================================
-- STEP 3: VERIFY TEMPLATE REGENERATION
-- ================================================
-- After UPDATE, database trigger should regenerate sora_prompt_template
-- Check that templates now include "Voice:" sections

SELECT
  name,
  jsonb_pretty(voice_profile) as voice_data,
  sora_prompt_template
FROM series_characters
WHERE name IN ('Dad', 'Lyle', 'Tom')
ORDER BY name;

-- Expected result: sora_prompt_template should now contain lines like:
-- "Voice: sounds early 30s, neutral American accent, warm tone, medium pitch."
-- "Voice: sounds young child, neutral American accent, playful tone, high pitch."
-- "Voice: sounds early teens, neutral American accent, neutral tone, medium pitch."

-- ================================================
-- OPTIONAL: VIEW ALL CHARACTERS WITH VOICE DATA
-- ================================================
SELECT
  name,
  CASE
    WHEN voice_profile IS NULL THEN '❌ NULL'
    WHEN voice_profile = '{}'::jsonb THEN '❌ Empty'
    ELSE '✅ Has Data'
  END as voice_status,
  CASE
    WHEN sora_prompt_template LIKE '%Voice:%' THEN '✅ Has Voice Section'
    ELSE '❌ Missing Voice Section'
  END as template_status
FROM series_characters
ORDER BY name;

-- ================================================
-- NOTES
-- ================================================
-- 1. The UPDATE statements will trigger: update_character_sora_template()
-- 2. Trigger regenerates sora_prompt_template with voice sections
-- 3. Future video generations will include character vocals in SOUND section
-- 4. Format in prompts: "Character vocals: [Name]: [characteristics]; [Name]: [characteristics]."
--
-- Voice Profile Fields:
-- - age_sound: "sounds [age]" (e.g., "early 30s", "young child", "mid-40s")
-- - accent: Dialect/accent (e.g., "neutral American", "British RP", "Southern US")
-- - pitch: "high" | "medium" | "low"
-- - tone: Vocal quality (e.g., "warm", "playful", "authoritative", "neutral")
-- - pace: "fast" | "moderate" | "slow"
-- - energy: "high" | "moderate" | "calm" | "low"
-- - distinctive_traits: Optional array of unique characteristics
