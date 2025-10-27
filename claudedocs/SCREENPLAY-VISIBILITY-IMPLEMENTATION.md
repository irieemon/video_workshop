# Screenplay Visibility & Prompt Integration - Implementation Plan

## Problem Statement

User feedback:
> "when I'm working with the screenplay writer, I get so much more detail and then I can never access it again. I need to be able to see what the screenplay writer has created, and this data needs to be part of the prompt. We are losing the screenplay due to bad data practices"

**Current State**:
- ✅ Screenplay data IS being created and stored in database
- ✅ Episode table has `screenplay_text` and `structured_screenplay` fields
- ✅ Scenes table has dialogue, actions, characters, descriptions
- ❌ No UI to view screenplay after creation
- ❌ Screenplay data not included in video prompts
- ❌ User must manually re-enter screenplay content when creating videos

## Immediate Solution (Phase 1)

### 1. Add Screenplay Viewer to Episode Manager

**Location**: `components/screenplay/episode-manager.tsx`

**Changes**:
- Add "View Screenplay" button to each episode card
- Open modal/dialog showing full screenplay text
- Display structured scenes if available (expandable cards)
- Show dialogue, actions, character lists per scene

**Why**: Users can immediately see the screenplay they created

### 2. Add Episode Selection to Video Creation

**Location**: `app/dashboard/projects/[id]/videos/new/page.tsx`

**Changes**:
- Existing `EpisodeSelector` component is already there (line 20)
- Hook up episode selection to pull screenplay data
- When episode selected, pre-fill brief with screenplay content
- Add "Use Scene" dropdown to select specific scenes

**Why**: Users can reference screenplay when creating videos

### 3. Enhance Prompt Generation with Screenplay Context

**Location**: Video creation flow

**Changes**:
- When episode/scene selected, fetch full screenplay data
- Pass screenplay context to agent roundtable:
  - Scene description
  - Character dialogue
  - Actions
  - Setting/location details
- Include in system prompt for agents
- Display in final optimized prompt

**Why**: Screenplay content automatically enriches video prompts

## Detailed Implementation

### Task 1: Screenplay Viewer Component

**File**: `components/screenplay/screenplay-viewer.tsx` (NEW)

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Episode, Scene } from '@/lib/types/database.types'

interface ScreenplayViewerProps {
  open: boolean
  onClose: () => void
  episode: Episode
}

export function ScreenplayViewer({ open, onClose, episode }: ScreenplayViewerProps) {
  const hasStructured = episode.structured_screenplay?.scenes?.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {episode.title} - Screenplay
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          {hasStructured ? (
            // Show structured scenes
            <div className="space-y-4">
              {episode.structured_screenplay.scenes.map((scene: Scene, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Scene {scene.scene_number}: {scene.location}</span>
                      <Badge>{scene.time_of_day} {scene.time_period}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{scene.description}</p>

                    {scene.characters?.length > 0 && (
                      <div className="text-sm">
                        <strong>Characters:</strong> {scene.characters.join(', ')}
                      </div>
                    )}

                    {scene.dialogue && scene.dialogue.length > 0 && (
                      <div className="space-y-2 bg-muted p-3 rounded">
                        {scene.dialogue.map((d, i) => (
                          <div key={i}>
                            <div className="font-semibold text-sm">{d.character}</div>
                            <div className="text-sm italic">"{d.lines.join(' ')}"</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {scene.action && scene.action.length > 0 && (
                      <div className="text-sm">
                        <strong>Actions:</strong>
                        <ul className="list-disc pl-5 mt-1">
                          {scene.action.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : episode.screenplay_text ? (
            // Show unstructured text
            <div className="whitespace-pre-wrap font-mono text-sm">
              {episode.screenplay_text}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No screenplay content available
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
```

### Task 2: Update Episode Manager

**File**: `components/screenplay/episode-manager.tsx`

**Changes**:
1. Import ScreenplayViewer component
2. Add state for viewer modal
3. Add "View Screenplay" button to episode cards
4. Pass episode data to viewer

```typescript
// Add imports
import { ScreenplayViewer } from './screenplay-viewer'
import { Eye } from 'lucide-react'

// Add state
const [viewingEpisode, setViewingEpisode] = useState<Episode | null>(null)
const [viewerOpen, setViewerOpen] = useState(false)

// Add button in episode card actions (around line 195)
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    setViewingEpisode(episode)
    setViewerOpen(true)
  }}
  title="View screenplay"
>
  <Eye className="h-4 w-4" />
</Button>

// Add viewer component at end (after ScreenplayChat)
{viewingEpisode && (
  <ScreenplayViewer
    open={viewerOpen}
    onClose={() => {
      setViewerOpen(false)
      setViewingEpisode(null)
    }}
    episode={viewingEpisode}
  />
)}
```

### Task 3: Enhance Video Creation with Episode Data

**File**: `app/dashboard/projects/[id]/videos/new/page.tsx`

**Changes**:
1. When episode selected, fetch full episode data including screenplay
2. Pre-populate brief field with screenplay summary
3. Pass screenplay context to agent roundtable
4. Display selected scene info

```typescript
// Add state for episode data
const [episodeData, setEpisodeData] = useState<any>(null)
const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)

// Fetch episode data when episode selected
useEffect(() => {
  if (episodeId) {
    fetchEpisodeData()
  }
}, [episodeId])

const fetchEpisodeData = async () => {
  try {
    const response = await fetch(`/api/episodes/${episodeId}`)
    if (response.ok) {
      const data = await response.json()
      setEpisodeData(data.episode)

      // Auto-populate brief with screenplay summary
      if (data.episode.structured_screenplay?.scenes?.length > 0) {
        const firstScene = data.episode.structured_screenplay.scenes[0]
        setBrief(firstScene.description || '')
      } else if (data.episode.screenplay_text) {
        // Use first 200 chars of screenplay as brief
        setBrief(data.episode.screenplay_text.substring(0, 200))
      }
    }
  } catch (error) {
    console.error('Failed to fetch episode data:', error)
  }
}

// Add scene selector if episode has scenes
{episodeData?.structured_screenplay?.scenes?.length > 0 && (
  <div className="space-y-2">
    <Label>Select Scene</Label>
    <select
      value={selectedSceneId || ''}
      onChange={(e) => {
        setSelectedSceneId(e.target.value)
        const scene = episodeData.structured_screenplay.scenes.find(
          (s: any) => s.scene_id === e.target.value
        )
        if (scene) {
          setBrief(scene.description)
        }
      }}
      className="w-full px-3 py-2 border rounded-md"
    >
      <option value="">All scenes</option>
      {episodeData.structured_screenplay.scenes.map((scene: any) => (
        <option key={scene.scene_id} value={scene.scene_id}>
          Scene {scene.scene_number}: {scene.location}
        </option>
      ))}
    </select>
  </div>
)}
```

### Task 4: Pass Screenplay Context to Agent Roundtable

**File**: `app/api/agent/roundtable/route.ts`

**Changes**: Include screenplay context in agent system prompt

```typescript
// When episodeId is provided in request
if (episodeId) {
  const { data: episode } = await supabase
    .from('episodes')
    .select('*, structured_screenplay, screenplay_text')
    .eq('id', episodeId)
    .single()

  if (episode) {
    let screenplayContext = '\n\n## SCREENPLAY CONTEXT\n\n'

    if (sceneId && episode.structured_screenplay?.scenes) {
      const scene = episode.structured_screenplay.scenes.find(
        (s: any) => s.scene_id === sceneId
      )
      if (scene) {
        screenplayContext += `**Scene ${scene.scene_number}**: ${scene.location}\n`
        screenplayContext += `**Description**: ${scene.description}\n\n`

        if (scene.characters?.length > 0) {
          screenplayContext += `**Characters in Scene**: ${scene.characters.join(', ')}\n\n`
        }

        if (scene.dialogue && scene.dialogue.length > 0) {
          screenplayContext += '**Dialogue**:\n'
          scene.dialogue.forEach((d: any) => {
            screenplayContext += `${d.character}: "${d.lines.join(' ')}"\n`
          })
          screenplayContext += '\n'
        }

        if (scene.action && scene.action.length > 0) {
          screenplayContext += '**Actions**:\n'
          scene.action.forEach((action: string) => {
            screenplayContext += `- ${action}\n`
          })
        }
      }
    } else if (episode.screenplay_text) {
      screenplayContext += episode.screenplay_text.substring(0, 1000)
      screenplayContext += '\n\n(Screenplay excerpt - use this as reference for character dialogue and actions)'
    }

    // Add to system prompt for each agent
    systemPrompt += screenplayContext
  }
}
```

## Implementation Order

1. **Build ScreenplayViewer component** (30 min)
   - Create new component file
   - Handle both structured and unstructured screenplay display
   - Make it visually appealing with cards and badges

2. **Update EpisodeManager** (15 min)
   - Add "View Screenplay" button
   - Wire up to viewer modal

3. **Enhance Video Creation** (45 min)
   - Fetch episode data when selected
   - Add scene selector dropdown
   - Auto-populate brief from screenplay

4. **Update Agent Roundtable API** (30 min)
   - Accept episodeId and sceneId
   - Fetch screenplay data
   - Include in system prompts

## Testing

1. **Create test episode with screenplay**
   - Use screenplay chat to create episode
   - Verify data is saved to database

2. **View screenplay**
   - Click "View Screenplay" button
   - Verify all scenes display correctly
   - Check dialogue and actions are visible

3. **Create video from screenplay**
   - Select episode in video creation
   - Verify brief auto-populates
   - Select specific scene
   - Verify scene data appears in brief
   - Generate prompt
   - Verify screenplay context in final prompt

## Success Criteria

- ✅ Users can view screenplays they created
- ✅ Screenplay data auto-populates video creation
- ✅ Scene details (dialogue, actions) included in prompts
- ✅ No manual re-entry of screenplay content needed
- ✅ Clear traceability: Episode → Scene → Video

## Future Enhancements (Not in this phase)

- Scene-to-video direct conversion (per architecture doc)
- Screenplay enrichment service (per architecture doc)
- Batch scene conversion
- Video-screenplay linking for playback
- Screenplay editing capabilities
