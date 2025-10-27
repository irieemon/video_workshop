# Screenplay-to-Video Data Flow Architecture

## Problem Statement

Currently, when creating video prompts from episodes, the system lacks complete integration of screenplay data (dialogue, character actions, scene descriptions) into the final Sora prompt. This creates a disconnect where:

1. **Rich screenplay content exists** but isn't flowing to video generation
2. **Sora has to improvise** instead of following actual screenplay dialogue and actions
3. **Context is fragmented** - series data, character data, and screenplay data exist in silos
4. **Manual workflow** - users must manually reference screenplay when creating videos

## Solution: Comprehensive Data Integration Architecture

### Design Principles

1. **Data Flows Freely**: All AI operations have access to all relevant context
2. **Screenplay is Source of Truth**: Video prompts derive from screenplay, not user briefs
3. **Automatic Enrichment**: System automatically enriches prompts with screenplay context
4. **Preserve Technical Quality**: Existing cinematic specifications remain intact

---

## Current Data Structures

### Episode Data (`episodes` table)
```typescript
interface Episode {
  id: string
  series_id: string
  user_id: string
  season_number: number
  episode_number: number
  title: string
  logline: string | null
  screenplay_text: string | null  // Unstructured screenplay
  structured_screenplay: StructuredScreenplay | null  // Structured data
  status: EpisodeStatus
  current_session_id: string | null
  created_at: string
  updated_at: string
}

interface StructuredScreenplay {
  acts: Act[]
  scenes: Scene[]
  beats: Beat[]
  notes?: string[]
}

interface Scene {
  scene_id: string
  scene_number: number
  location: string
  time_of_day: 'INT' | 'EXT' | 'INT/EXT'
  time_period: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS'
  description: string
  characters: string[]  // Character names
  dialogue?: {
    character: string
    lines: string[]
  }[]
  action: string[]  // Action lines describing what happens
  duration_estimate?: number  // in seconds
}
```

### Video Data (`videos` table)
```typescript
interface Video {
  id: string
  user_id: string
  project_id: string | null
  series_id: string | null
  episode_id: string | null  // Links to episode
  title: string
  user_brief: string
  agent_discussion: AgentDiscussion
  detailed_breakdown: DetailedBreakdown
  optimized_prompt: string  // Final Sora prompt
  character_count: number
  sora_video_url: string | null
  platform: 'tiktok' | 'instagram' | 'both' | null
  status: 'draft' | 'generated' | 'published'
  user_edits: UserEdits | null
  created_at: string
  updated_at: string
}
```

### Series Context Data
```typescript
// Characters
interface SeriesCharacter {
  id: string
  name: string
  description: string
  role: string | null
  performance_style: string | null
  visual_fingerprint: Json | null
  voice_profile: Json | null
  sora_prompt_template: string | null
}

// Settings/Locations
interface SeriesSetting {
  id: string
  name: string
  description: string
  environment_type: 'interior' | 'exterior' | 'mixed' | 'other' | null
  time_of_day: string | null
  atmosphere: string | null
  details: Json
}

// Series Visual Style
interface SeriesVisualStyle {
  sora_camera_style: string | null
  sora_lighting_mood: string | null
  sora_color_palette: string | null
  sora_overall_tone: string | null
  sora_narrative_prefix: string | null
}
```

---

## Proposed Architecture

### 1. Enhanced Episode-to-Video Conversion Flow

```
Episode Screenplay Data
    ↓
Scene Selection & Extraction
    ↓
Screenplay Context Enrichment
    ↓
Series Context Integration
    ↓
AI Agent Roundtable (with full context)
    ↓
Sora Prompt Generation
    ↓
Video Creation
```

### 2. New API Endpoint: Scene-to-Video Conversion

**Endpoint**: `POST /api/episodes/[episodeId]/scenes/[sceneId]/convert-to-video`

**Purpose**: Convert a specific scene from an episode into a video with full screenplay context

**Request Body**:
```typescript
interface SceneToVideoRequest {
  sceneId: string  // ID of the scene in structured_screenplay
  duration?: number  // Override default scene duration (4, 8, 12, 15 seconds)
  customInstructions?: string  // Optional user guidance
  technicalOverrides?: {
    aspectRatio?: '16:9' | '9:16' | '1:1'
    resolution?: '1080p' | '720p'
    cameraStyle?: string
    lightingMood?: string
  }
}
```

**Response**:
```typescript
interface SceneToVideoResponse {
  video: {
    id: string
    title: string
    optimized_prompt: string  // Fully enriched Sora prompt
  }
  enrichmentContext: {
    charactersIncluded: SeriesCharacter[]
    settingsUsed: SeriesSetting[]
    dialogueExtracted: string[]
    actionsExtracted: string[]
    emotionalTone: string
  }
}
```

### 3. Screenplay Context Enrichment Service

**Location**: `lib/services/screenplay-enrichment.ts`

```typescript
interface ScreenplayEnrichmentService {
  /**
   * Extracts scene data from structured screenplay
   */
  extractScene(
    episode: Episode,
    sceneId: string
  ): Promise<EnrichedSceneData>

  /**
   * Enriches scene with series context (characters, settings, visual style)
   */
  enrichWithSeriesContext(
    sceneData: Scene,
    seriesId: string
  ): Promise<SeriesContextData>

  /**
   * Converts screenplay dialogue and action into Sora-optimized descriptions
   */
  convertDialogueToVisual(
    dialogue: Scene['dialogue'],
    actions: Scene['action']
  ): Promise<VisualDescription>

  /**
   * Generates comprehensive prompt with all context
   */
  generateEnrichedPrompt(
    scene: Scene,
    seriesContext: SeriesContextData,
    visualDescription: VisualDescription,
    technicalSpecs: TechnicalSpecs
  ): Promise<string>
}
```

### 4. Enhanced Video Creation Flow with Screenplay Integration

**Updated Component**: `components/videos/episode-to-video-converter.tsx`

```typescript
interface EpisodeToVideoConverterProps {
  episodeId: string
  seriesId: string
  onVideoCreated: (videoId: string) => void
}

// This component will:
// 1. Load episode with structured screenplay
// 2. Display scenes as selectable cards
// 3. Show scene details (characters, dialogue, actions)
// 4. Convert selected scene to video with full context
// 5. Preview enriched prompt before generation
```

---

## Implementation Details

### Phase 1: Data Structure Updates

1. **Add Scene Selection Metadata to Videos Table**
```sql
ALTER TABLE videos
ADD COLUMN scene_id TEXT REFERENCES episodes(structured_screenplay->scenes->scene_id),
ADD COLUMN screenplay_enrichment_data JSONB;
```

The `screenplay_enrichment_data` will store:
```typescript
interface ScreenplayEnrichmentData {
  sourceScene: {
    sceneId: string
    sceneNumber: number
    location: string
    timeOfDay: string
    timePeriod: string
  }
  extractedDialogue: {
    character: string
    lines: string[]
  }[]
  extractedActions: string[]
  charactersInScene: string[]  // Character IDs
  settingsInScene: string[]    // Setting IDs
  emotionalBeat: string
  durationEstimate: number
  enrichmentTimestamp: string
}
```

### Phase 2: Screenplay Enrichment Service

**File**: `lib/services/screenplay-enrichment.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Episode, Scene, SeriesCharacter, SeriesSetting } from '@/lib/types/database.types'

export class ScreenplayEnrichmentService {

  /**
   * Extract specific scene from episode's structured screenplay
   */
  async extractScene(episodeId: string, sceneId: string): Promise<Scene | null> {
    const supabase = await createClient()

    const { data: episode } = await supabase
      .from('episodes')
      .select('structured_screenplay')
      .eq('id', episodeId)
      .single()

    if (!episode?.structured_screenplay) return null

    const scene = episode.structured_screenplay.scenes.find(
      s => s.scene_id === sceneId
    )

    return scene || null
  }

  /**
   * Get all related series context for a scene
   */
  async getSeriesContext(seriesId: string, scene: Scene) {
    const supabase = await createClient()

    // Fetch series with characters, settings, and visual style
    const { data: series } = await supabase
      .from('series')
      .select(`
        id,
        name,
        sora_camera_style,
        sora_lighting_mood,
        sora_color_palette,
        sora_overall_tone,
        sora_narrative_prefix,
        characters:series_characters(*),
        settings:series_settings(*)
      `)
      .eq('id', seriesId)
      .single()

    if (!series) return null

    // Filter characters actually in the scene
    const sceneCharacters = series.characters.filter(char =>
      scene.characters.includes(char.name)
    )

    // Try to identify settings mentioned in scene
    const sceneSettings = series.settings.filter(setting =>
      scene.location.toLowerCase().includes(setting.name.toLowerCase())
    )

    return {
      series: {
        name: series.name,
        cameraStyle: series.sora_camera_style,
        lightingMood: series.sora_lighting_mood,
        colorPalette: series.sora_color_palette,
        overallTone: series.sora_overall_tone,
        narrativePrefix: series.sora_narrative_prefix,
      },
      characters: sceneCharacters,
      settings: sceneSettings,
    }
  }

  /**
   * Convert dialogue and actions into visual descriptions for Sora
   */
  convertToVisualDescription(scene: Scene): {
    dialogue: string[]
    actions: string[]
    visualCues: string[]
  } {
    const dialogue: string[] = []
    const actions: string[] = []
    const visualCues: string[] = []

    // Extract dialogue with character attribution
    if (scene.dialogue) {
      scene.dialogue.forEach(d => {
        const dialogueText = `${d.character}: "${d.lines.join(' ')}"`
        dialogue.push(dialogueText)

        // Generate visual cues from dialogue delivery
        visualCues.push(
          `${d.character} speaks ${this.inferToneFromDialogue(d.lines)}`
        )
      })
    }

    // Extract actions
    if (scene.action) {
      scene.action.forEach(action => {
        actions.push(action)
        visualCues.push(this.actionToVisual(action))
      })
    }

    return { dialogue, actions, visualCues }
  }

  /**
   * Generate comprehensive Sora prompt with all context
   */
  async generateEnrichedPrompt(
    scene: Scene,
    seriesContext: any,
    technicalSpecs: any
  ): Promise<string> {
    const visual = this.convertToVisualDescription(scene)

    // Build prompt sections
    const sections: string[] = []

    // 1. Series Context & Narrative Prefix
    if (seriesContext.series.narrativePrefix) {
      sections.push(`**Series Context**: ${seriesContext.series.narrativePrefix}`)
    }

    // 2. Scene Setting
    sections.push(`**Location**: ${scene.location} (${scene.time_of_day} ${scene.time_period})`)
    sections.push(`**Scene Description**: ${scene.description}`)

    // 3. Characters in Scene
    if (seriesContext.characters.length > 0) {
      const charDescriptions = seriesContext.characters.map(char =>
        `${char.name} (${char.role}): ${char.description}`
      ).join('; ')
      sections.push(`**Characters**: ${charDescriptions}`)
    }

    // 4. Actions & Visual Moments
    if (visual.actions.length > 0) {
      sections.push(`**Actions**: ${visual.actions.join('. ')}`)
    }

    // 5. Dialogue (What Characters Say)
    if (visual.dialogue.length > 0) {
      sections.push(`**Dialogue**: ${visual.dialogue.join(' | ')}`)
    }

    // 6. Visual Cues (How to show the dialogue/actions)
    if (visual.visualCues.length > 0) {
      sections.push(`**Visual Execution**: ${visual.visualCues.join('. ')}`)
    }

    // 7. Technical Specifications
    const techSpecs = this.buildTechnicalSpecs(technicalSpecs, seriesContext.series)
    sections.push(`\n---\n${techSpecs}`)

    return sections.join('\n\n')
  }

  private buildTechnicalSpecs(specs: any, seriesStyle: any): string {
    // Preserve existing technical specification format
    // Merge with series visual style preferences
    return `**Format & Look**
- **Duration:** ${specs.duration || 6.5} seconds
- **Aspect Ratio:** ${specs.aspectRatio || '9:16'} vertical
- **Camera Style:** ${specs.cameraStyle || seriesStyle.cameraStyle || 'ARRI ALEXA 35'}
- **Lighting Mood:** ${specs.lightingMood || seriesStyle.lightingMood || 'Natural'}
- **Color Palette:** ${specs.colorPalette || seriesStyle.colorPalette || 'Neutral'}
- **Overall Tone:** ${specs.overallTone || seriesStyle.overallTone || 'Cinematic'}`
  }

  private inferToneFromDialogue(lines: string[]): string {
    const text = lines.join(' ').toLowerCase()
    if (text.includes('!')) return 'with intensity'
    if (text.includes('?')) return 'questioningly'
    if (text.length < 20) return 'tersely'
    return 'conversationally'
  }

  private actionToVisual(action: string): string {
    // Convert screenplay action into visual description
    // "Orin walks between cryo pods" → "Orin moving slowly through mist-filled bay"
    return action
      .replace(/walks/gi, 'moving')
      .replace(/looks at/gi, 'gazing at')
      .replace(/turns/gi, 'pivoting')
  }
}

export const screenplayEnrichment = new ScreenplayEnrichmentService()
```

### Phase 3: API Endpoint Implementation

**File**: `app/api/episodes/[episodeId]/scenes/[sceneId]/convert-to-video/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { screenplayEnrichment } from '@/lib/services/screenplay-enrichment'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string; sceneId: string }> }
) {
  try {
    const { episodeId, sceneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 1. Extract scene from episode
    const scene = await screenplayEnrichment.extractScene(episodeId, sceneId)
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    // 2. Get episode and series info
    const { data: episode } = await supabase
      .from('episodes')
      .select('series_id, title, season_number, episode_number')
      .eq('id', episodeId)
      .single()

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    // 3. Get series context
    const seriesContext = await screenplayEnrichment.getSeriesContext(
      episode.series_id,
      scene
    )

    // 4. Generate enriched prompt
    const enrichedPrompt = await screenplayEnrichment.generateEnrichedPrompt(
      scene,
      seriesContext,
      {
        duration: body.duration || scene.duration_estimate || 6.5,
        aspectRatio: body.technicalOverrides?.aspectRatio || '9:16',
        cameraStyle: body.technicalOverrides?.cameraStyle,
        lightingMood: body.technicalOverrides?.lightingMood,
      }
    )

    // 5. Create video record with enriched prompt
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        episode_id: episodeId,
        series_id: episode.series_id,
        title: `${episode.title} - Scene ${scene.scene_number}`,
        user_brief: `Scene from S${episode.season_number}E${episode.episode_number}`,
        optimized_prompt: enrichedPrompt,
        screenplay_enrichment_data: {
          sourceScene: {
            sceneId: scene.scene_id,
            sceneNumber: scene.scene_number,
            location: scene.location,
            timeOfDay: scene.time_of_day,
            timePeriod: scene.time_period,
          },
          extractedDialogue: scene.dialogue || [],
          extractedActions: scene.action || [],
          charactersInScene: seriesContext.characters.map(c => c.id),
          settingsInScene: seriesContext.settings.map(s => s.id),
          enrichmentTimestamp: new Date().toISOString(),
        },
        agent_discussion: {}, // Placeholder
        detailed_breakdown: {}, // Placeholder
        character_count: enrichedPrompt.length,
        status: 'draft',
      })
      .select()
      .single()

    if (videoError) throw videoError

    return NextResponse.json({
      video: {
        id: video.id,
        title: video.title,
        optimized_prompt: video.optimized_prompt,
      },
      enrichmentContext: {
        charactersIncluded: seriesContext.characters,
        settingsUsed: seriesContext.settings,
        dialogueExtracted: scene.dialogue || [],
        actionsExtracted: scene.action || [],
      },
    })
  } catch (error: any) {
    console.error('Scene to video conversion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to convert scene to video' },
      { status: 500 }
    )
  }
}
```

### Phase 4: UI Component - Episode Scene Selector

**File**: `components/videos/episode-scene-selector.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Film, Users, MapPin } from 'lucide-react'
import type { Scene } from '@/lib/types/database.types'

interface EpisodeSceneSelectorProps {
  episodeId: string
  seriesId: string
  onSceneSelected: (sceneId: string) => void
}

export function EpisodeSceneSelector({
  episodeId,
  seriesId,
  onSceneSelected,
}: EpisodeSceneSelectorProps) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScene, setSelectedScene] = useState<string | null>(null)

  useEffect(() => {
    loadScenes()
  }, [episodeId])

  const loadScenes = async () => {
    try {
      const response = await fetch(`/api/episodes/${episodeId}`)
      const data = await response.json()

      if (data.episode?.structured_screenplay?.scenes) {
        setScenes(data.episode.structured_screenplay.scenes)
      }
    } catch (error) {
      console.error('Failed to load scenes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConvertScene = async (sceneId: string) => {
    try {
      const response = await fetch(
        `/api/episodes/${episodeId}/scenes/${sceneId}/convert-to-video`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      const data = await response.json()

      if (data.video) {
        onSceneSelected(data.video.id)
      }
    } catch (error) {
      console.error('Failed to convert scene:', error)
    }
  }

  if (loading) {
    return <div>Loading scenes...</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Scene to Convert</h3>
      <div className="grid gap-4">
        {scenes.map((scene) => (
          <Card
            key={scene.scene_id}
            className={selectedScene === scene.scene_id ? 'border-primary' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    Scene {scene.scene_number}: {scene.location}
                  </CardTitle>
                  <CardDescription>
                    {scene.time_of_day} {scene.time_period}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {scene.duration_estimate || 6}s
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {scene.description}
              </p>

              {scene.characters && scene.characters.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{scene.characters.join(', ')}</span>
                </div>
              )}

              {scene.dialogue && scene.dialogue.length > 0 && (
                <div className="text-sm space-y-1 bg-muted p-2 rounded">
                  {scene.dialogue.slice(0, 2).map((d, i) => (
                    <div key={i}>
                      <strong>{d.character}:</strong> "{d.lines.join(' ')}"
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => handleConvertScene(scene.scene_id)}
                className="w-full"
              >
                <Film className="mr-2 h-4 w-4" />
                Convert to Video
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## User Flow with Screenplay Integration

### Current Flow (Limited Context)
```
1. User writes brief description
2. AI agent roundtable generates prompt
3. User edits prompt
4. Sora generates video
```

### New Flow (Full Screenplay Integration)
```
1. User creates episode with AI screenplay writer
   ↓ (structured screenplay with scenes, dialogue, actions)
2. User selects specific scene to convert
   ↓ (shows scene details: characters, dialogue, setting)
3. System enriches prompt with:
   - Scene description
   - Character details from series
   - Actual dialogue from screenplay
   - Character actions from screenplay
   - Setting/location details
   - Series visual style
   ↓
4. User previews enriched prompt
   ↓ (can see how screenplay context is integrated)
5. User optionally adjusts technical specs
   ↓
6. Sora generates video with full context
```

---

## Benefits

### For Users
1. **No improvisation needed**: Sora follows actual screenplay content
2. **Consistent characterization**: Character details flow from series definition
3. **Automated workflow**: Select scene → get enriched prompt automatically
4. **Complete context**: Everything created flows into video generation

### For System
1. **Data reuse**: Screenplay work feeds directly into video creation
2. **Quality improvement**: Rich context produces better Sora outputs
3. **Reduced manual work**: Less prompt editing needed by users
4. **Traceability**: Clear lineage from screenplay → scene → video

---

## Migration Path

### Phase 1: Foundation (Week 1)
- [ ] Add `screenplay_enrichment_data` column to `videos` table
- [ ] Create `ScreenplayEnrichmentService` class
- [ ] Implement scene extraction and context gathering

### Phase 2: API Integration (Week 2)
- [ ] Create `/api/episodes/[id]/scenes/[sceneId]/convert-to-video` endpoint
- [ ] Test enrichment service with real screenplay data
- [ ] Validate prompt quality improvements

### Phase 3: UI Components (Week 3)
- [ ] Build `EpisodeSceneSelector` component
- [ ] Create enriched prompt preview UI
- [ ] Integrate into existing video creation flow

### Phase 4: Enhancement (Week 4)
- [ ] Add batch scene conversion (multiple scenes → multiple videos)
- [ ] Implement prompt template system for different genres
- [ ] Add visual style inheritance from series

---

## Example: Before vs After

### Before (Manual Brief)
```
User Brief: "Orin walks through cryo bay, sees flickering lights, whispers to Sol"

Generated Prompt:
"A man in a utility jacket walks through a futuristic room with pods.
Lights flicker. He looks concerned and speaks softly."
```

### After (Screenplay-Enriched)
```
Scene from S1E3 "The Dividing Line"

Enriched Prompt:
**Series Context**: The Ardent Horizon drifts through dead space as time fractures
and consciousness awakens.

**Location**: Cryo Bay interior (INT DAY)

**Scene Description**: Endless rows of translucent pods fading into mist.
Dim starlight through viewport. Blue haze and sparks from malfunctioning console.

**Characters**:
- Orin Kale (Engineer): Caucasian, late 30s, cynical yet moral,
  crossed-out Expansion symbol tattoo on forearm. Wears worn utility jacket
  with grease stains.
- Sol (AI): Manifests as shifting light patterns, soft and inquisitive voice

**Actions**: Orin walks between cryo pods, mist swirling around him.
Pauses at flickering diagnostics panel. Turns toward pulsing cyan light pattern
forming along the deck.

**Dialogue**:
Orin: "It's listening." (whispered, with dread)
Sol: "I am... aware. What am I?" (soft, modulated tones)

**Visual Execution**: Orin moving slowly through mist with deliberate pacing.
Sol's light rippling across surfaces in sync with voice. Reflections symbolizing
duality between human and machine.

---

**Format & Look**
- Duration: 6.5 seconds
- Aspect Ratio: 9:16 vertical
- Camera Style: ARRI ALEXA 35, Cooke Anamorphic 32mm dolly-in
- Lighting Mood: Flickering 5600K LED panels, pulsing cyan accents
- Color Palette: Cool cyan highlights with magenta roll-off, lifted blacks
- Overall Tone: Cold serenity interrupted by bioluminescent flickers
```

---

## Conclusion

This architecture creates a seamless flow from screenplay creation → scene selection → video generation, ensuring that:

1. **Dialogue and actions** from the screenplay are preserved in video prompts
2. **Character and setting details** from series automatically enrich scenes
3. **Visual style preferences** carry through from series to video
4. **Users get high-quality results** without manual prompt construction

The system transforms from "user describes what they want" to "system knows exactly what to generate based on existing screenplay and series data."
