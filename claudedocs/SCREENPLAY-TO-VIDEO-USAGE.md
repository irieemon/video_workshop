# Screenplay-to-Video Feature Usage Guide

## Overview

The screenplay-to-video feature allows you to convert individual scenes from your AI-generated episode screenplays directly into Sora video prompts. This ensures that your videos follow the exact dialogue, character actions, and scene descriptions from your screenplay, eliminating guesswork and improvisation.

## How It Works

### Data Flow
```
Episode Screenplay
    ↓
Select Scene
    ↓
System Enriches with:
- Character details from series
- Setting/location information
- Visual style from series
- Actual dialogue from screenplay
- Character actions from screenplay
    ↓
Comprehensive Sora Prompt Generated
    ↓
Video Created with Full Context
```

## Using the Feature

### Step 1: Create an Episode with Screenplay

1. Navigate to your series detail page
2. Use the **Screenplay Writer AI** to create an episode
3. Work with the AI to develop:
   - Episode structure (acts, scenes, beats)
   - Scene descriptions and locations
   - Character dialogue
   - Character actions

### Step 2: Access Scene Conversion

**Option A: Via API (for developers)**
```typescript
// GET all scenes from an episode
const response = await fetch(`/api/episodes/${episodeId}/scenes`)
const { scenes } = await response.json()

// POST to convert a scene to video
const conversion = await fetch(
  `/api/episodes/${episodeId}/scenes/${sceneId}/convert-to-video`,
  {
    method: 'POST',
    body: JSON.stringify({
      duration: 8, // Optional: 4, 8, 12, or 15 seconds
      customInstructions: 'Optional additional guidance',
      technicalOverrides: {
        aspectRatio: '9:16',
        resolution: '1080p',
        cameraStyle: 'ARRI ALEXA 35',
        // ... other overrides
      }
    })
  }
)
```

**Option B: Via UI Component**
```tsx
import { EpisodeSceneSelector } from '@/components/videos/episode-scene-selector'

<EpisodeSceneSelector
  episodeId={episodeId}
  projectId={projectId}
  onSceneConverted={(videoId) => {
    // Navigate to video editor or handle conversion
  }}
/>
```

### Step 3: Review Enriched Prompt

The system automatically generates a comprehensive prompt that includes:

1. **Series Context** - Your series' narrative world and tone
2. **Scene Setting** - Location, time of day, atmosphere
3. **Characters** - Full character descriptions from series database
4. **Dialogue** - Exact dialogue lines from screenplay
5. **Actions** - Character movements and actions from screenplay
6. **Visual Cues** - How to visually represent dialogue and actions
7. **Technical Specs** - Camera work, lighting, color palette from series visual style

### Step 4: Generate Video

Once the enriched prompt is created:
1. Review the prompt (optional)
2. Adjust technical specifications if needed
3. Generate Sora video with full screenplay context

## What Gets Enriched

### From the Scene
- **Location**: "Cryo Bay interior"
- **Time**: "INT DAY"
- **Description**: Scene description text
- **Dialogue**: All character dialogue lines
- **Actions**: All action lines (what characters do)
- **Duration**: Estimated scene duration

### From the Series
- **Characters**: Full descriptions, roles, visual details
- **Settings**: Location details, atmosphere, environment type
- **Visual Style**: Camera work preferences, lighting mood, color palette
- **Narrative Context**: Series-wide story context

### Example: Before vs After

**Before (Manual Entry)**
```
User writes: "Orin walks through cryo bay, whispers to Sol"
```

**After (Screenplay-Enriched)**
```
**Series Context**: The Ardent Horizon drifts through dead space
as time fractures and consciousness awakens.

**Location**: Cryo Bay interior (INT DAY)

**Scene Description**: Endless rows of translucent pods fading into mist.
Dim starlight through viewport.

**Characters**:
- Orin Kale (Engineer): Caucasian, late 30s, cynical yet moral,
  crossed-out Expansion symbol tattoo on forearm. Wears worn utility
  jacket with grease stains.
- Sol (AI): Manifests as shifting light patterns, soft and inquisitive voice

**Actions**: Orin walks between cryo pods, mist swirling around him.
Pauses at flickering diagnostics panel. Turns toward pulsing cyan light.

**Dialogue**:
Orin: "It's listening." (whispered, with dread)
Sol: "I am... aware. What am I?" (soft, modulated tones)

**Visual Execution**: Orin moving slowly through mist with deliberate pacing.
Sol's light rippling across surfaces in sync with voice.

---

**Format & Look**
- Duration: 6.5 seconds
- Camera Style: ARRI ALEXA 35, Cooke Anamorphic 32mm dolly-in
- Lighting Mood: Flickering 5600K LED panels, pulsing cyan accents
- Color Palette: Cool cyan highlights with magenta roll-off
```

## API Reference

### GET /api/episodes/[episodeId]/scenes

Returns all scenes from an episode's structured screenplay.

**Response:**
```json
{
  "episode": {
    "id": "uuid",
    "title": "Episode Title",
    "season_number": 1,
    "episode_number": 3
  },
  "scenes": [
    {
      "scene_id": "scene-1",
      "scene_number": 1,
      "location": "Cryo Bay interior",
      "time_of_day": "INT",
      "time_period": "DAY",
      "description": "Scene description...",
      "characters": ["Orin Kale", "Sol"],
      "hasDialogue": true,
      "hasActions": true,
      "duration_estimate": 6.5,
      "dialoguePreview": [
        {
          "character": "Orin",
          "firstLine": "It's listening."
        }
      ]
    }
  ],
  "totalScenes": 4
}
```

### POST /api/episodes/[episodeId]/scenes/[sceneId]/convert-to-video

Converts a scene into a video with full screenplay enrichment.

**Request Body:**
```json
{
  "duration": 8,
  "customInstructions": "Focus on close-ups of faces",
  "technicalOverrides": {
    "aspectRatio": "9:16",
    "resolution": "1080p",
    "cameraStyle": "ARRI ALEXA 35",
    "lightingMood": "Moody and atmospheric",
    "colorPalette": "Cool tones with cyan accents",
    "overallTone": "Tense sci-fi"
  }
}
```

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "video-uuid",
    "title": "Episode Title - Scene 1",
    "optimized_prompt": "Full enriched prompt...",
    "scene_id": "scene-1"
  },
  "enrichmentContext": {
    "charactersIncluded": [
      {
        "id": "char-uuid",
        "name": "Orin Kale",
        "role": "Engineer"
      }
    ],
    "settingsUsed": [
      {
        "id": "setting-uuid",
        "name": "Cryo Bay",
        "description": "Ship's cryogenic storage bay"
      }
    ],
    "dialogueExtracted": [...],
    "actionsExtracted": [...],
    "sceneInfo": {
      "location": "Cryo Bay interior",
      "timeOfDay": "INT",
      "timePeriod": "DAY",
      "sceneNumber": 1
    }
  }
}
```

## Database Schema

### Videos Table (Updated)

```sql
-- New columns added
scene_id TEXT -- Links to screenplay scene
screenplay_enrichment_data JSONB -- Stores enrichment context

-- Enrichment data structure
{
  "sourceScene": {
    "sceneId": "scene-1",
    "sceneNumber": 1,
    "location": "Cryo Bay interior",
    "timeOfDay": "INT",
    "timePeriod": "DAY"
  },
  "extractedDialogue": [
    {
      "character": "Orin",
      "lines": ["It's listening."]
    }
  ],
  "extractedActions": ["Orin walks between cryo pods..."],
  "charactersInScene": ["char-uuid-1", "char-uuid-2"],
  "settingsInScene": ["setting-uuid-1"],
  "emotionalBeat": "tension",
  "durationEstimate": 6.5,
  "enrichmentTimestamp": "2025-10-26T12:00:00Z"
}
```

## Benefits

### For Users
1. **No Manual Prompt Writing** - Screenplay content flows automatically
2. **Consistent Characters** - Character details from series are always used
3. **Accurate Dialogue** - Sora receives exact dialogue lines to include
4. **Visual Continuity** - Series visual style is maintained
5. **Faster Workflow** - Select scene → generate video

### For Content Quality
1. **Screenplay Fidelity** - Videos match the written screenplay
2. **Character Consistency** - Characters look and act as defined
3. **Setting Accuracy** - Locations match series descriptions
4. **Tone Preservation** - Series tone and style are maintained
5. **Reduced Improvisation** - Sora follows specific instructions

## Troubleshooting

### "Episode does not have a structured screenplay"
**Solution**: Work with the Screenplay Writer AI to create a structured screenplay for the episode first.

### "Scene not found"
**Solution**: Verify the scene ID exists in the episode's structured screenplay.

### "Failed to load series context"
**Solution**: Ensure the series has characters and settings defined before converting scenes.

### Empty or incomplete prompts
**Solution**: Check that:
1. Episode has structured screenplay with scenes
2. Scenes have dialogue and actions
3. Series has characters and settings defined
4. Character names in scenes match series character names

## Best Practices

### 1. Define Series Elements First
Before creating episodes:
- Add all main characters to the series
- Define key locations/settings
- Set up series visual style preferences

### 2. Develop Complete Screenplays
Work with the AI to create:
- Detailed scene descriptions
- Character dialogue with proper attribution
- Action lines describing what happens
- Duration estimates for each scene

### 3. Review Before Generating
- Check that the enriched prompt includes all expected elements
- Verify character descriptions are correct
- Ensure dialogue matches your screenplay
- Confirm visual style aligns with your series

### 4. Iterate and Refine
- Generate initial video
- Review Sora output
- Adjust screenplay if needed
- Re-convert scene with improvements

## Future Enhancements

Planned features for the screenplay-to-video system:

- **Batch Conversion**: Convert multiple scenes at once
- **Shot-by-Shot Mapping**: Map screenplay beats to individual shots
- **Visual Style Templates**: Genre-specific visual style presets
- **Character Visual References**: Upload reference images for characters
- **Location References**: Upload or generate location concept art
- **Automated Scene Selection**: AI suggests best scenes for video
- **Series Continuity Checking**: Verify character/setting consistency
- **Multi-Episode Arcs**: Track story arcs across episodes

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the example usage in the design document
3. Verify your database schema is up to date
4. Check API endpoint responses for error details
