# Episode-Aware Video Creation - Technical Requirements Document

## Executive Summary

Transform video creation from standalone process into episode-aware workflow that preserves series context, automatically inherits episode characters/settings, and enriches AI prompts with narrative context.

**Target Impact**:
- 30% reduction in video creation time
- 15% improvement in character consistency scores
- Seamless context flow from episode planning to video execution

**Implementation Timeline**: 3 weeks (3 phases)

---

## Problem Statement

### Current State Issues
1. **Context Disconnect**: Episodes contain rich data (characters, settings, narrative) but video creation ignores it
2. **Manual Re-entry**: Users must manually re-select characters already defined in episodes
3. **Missing Settings**: No way to select episode settings for videos
4. **Lost Narrative Context**: AI agents don't receive episode story context, limiting prompt quality
5. **No Episode Linkage**: Videos can't be tracked back to which episode they belong to

### User Pain Points
- "I planned Episode 1 with specific characters - why doesn't the system remember this?"
- "I have to keep switching between episode page and video creation to remember what I planned"
- "Settings are defined in my episode but I can't use them for videos"
- "The AI doesn't understand this video is part of a larger story arc"

---

## Solution Architecture

### Three-Phase Implementation

#### Phase 1: Foundation & Data Flow (Week 1)
Enable videos to link to episodes with proper data relationships.

#### Phase 2: Automatic Context Inheritance (Week 2)
Auto-populate characters/settings from selected episode.

#### Phase 3: Enhanced UX & Polish (Week 3)
Multiple entry points and narrative suggestions.

---

## Phase 1: Foundation & Data Flow

### Database Schema Changes

#### 1. Add episode_id to videos table

```sql
-- Migration: 20251030_add_episode_to_videos.sql

-- Add episode relationship to videos
ALTER TABLE videos
ADD COLUMN episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL;

COMMENT ON COLUMN videos.episode_id IS 'Links video to episode for context inheritance';

-- Create index for episode lookup
CREATE INDEX idx_videos_episode_id ON videos(episode_id);

-- Update RLS policies to ensure users can only link to their own episodes
CREATE POLICY "Users can only link videos to their episodes"
ON videos
FOR INSERT
WITH CHECK (
  episode_id IS NULL OR
  EXISTS (
    SELECT 1 FROM episodes
    WHERE episodes.id = videos.episode_id
    AND episodes.user_id = auth.uid()
  )
);
```

#### 2. Optional: Add plot_summary to episodes

```sql
-- If we want to display full plot summary (currently only in concept phase)
ALTER TABLE episodes
ADD COLUMN plot_summary TEXT;

COMMENT ON COLUMN episodes.plot_summary IS 'Full paragraph episode summary from concept generation';
```

### TypeScript Type Updates

**File**: `lib/types/database.types.ts`

```typescript
// Add episode_id to videos table types
videos: {
  Row: {
    // ... existing fields
    episode_id: string | null
  }
  Insert: {
    // ... existing fields
    episode_id?: string | null
  }
  Update: {
    // ... existing fields
    episode_id?: string | null
  }
}

// Add plot_summary to episodes if implementing
episodes: {
  Row: {
    // ... existing fields
    plot_summary: string | null
  }
}
```

### New Components

#### 1. SettingsSelector Component

**File**: `components/videos/settings-selector.tsx`

**Purpose**: Multi-select component for choosing series settings (mirrors CharacterSelector)

**Props**:
```typescript
interface SettingsSelectorProps {
  seriesId: string
  value: string[]
  onChange: (settingIds: string[]) => void
  disabled?: boolean
}
```

**Features**:
- Fetches settings via `/api/series/${seriesId}/settings`
- Checkbox-based multi-select
- Displays: setting name, description, environment_type badge
- Visual reference indicators (if available)
- Select all / deselect all buttons
- Loading, error, and empty states
- ScrollArea for handling many settings
- Responsive design

**API Endpoint** (already exists):
- GET `/api/series/[seriesId]/settings`
- Returns: `{ settings: SeriesSetting[] }`

**Similar to**: `components/videos/character-selector.tsx` (existing)

#### 2. EpisodeSelector Component

**File**: `components/videos/episode-selector.tsx`

**Purpose**: Dropdown to select which episode the video belongs to

**Props**:
```typescript
interface EpisodeSelectorProps {
  seriesId: string
  value: string | null
  onChange: (episodeId: string | null) => void
  disabled?: boolean
}
```

**Features**:
- Fetches episodes via `/api/episodes?seriesId=${seriesId}`
- Dropdown/Combobox with search
- Display format: "S{season}E{episode}: {title}"
- Groups by season (expandable sections)
- "None (Standalone Video)" option
- Shows episode status badge (concept/draft/complete)
- Loading and error states

**Data Structure**:
```typescript
interface EpisodeOption {
  id: string
  season_number: number
  episode_number: number
  title: string
  status: 'concept' | 'draft' | 'in-progress' | 'complete'
}
```

### UI Changes to quick-create-video-dialog

**File**: `components/videos/quick-create-video-dialog.tsx`

**Changes**:

1. **Add Episode Selector** (above series selector):
```tsx
{selectedSeries && !isStandalone && (
  <div className="space-y-2">
    <Label htmlFor="episode">Episode (Optional)</Label>
    <EpisodeSelector
      seriesId={selectedSeries}
      value={selectedEpisode}
      onChange={setSelectedEpisode}
    />
  </div>
)}
```

2. **Add Settings Selector** (below character selector):
```tsx
{selectedSeries && !isStandalone && (
  <div className="space-y-2">
    <Label htmlFor="settings">Settings</Label>
    <SettingsSelector
      seriesId={selectedSeries}
      value={selectedSettings}
      onChange={setSelectedSettings}
    />
  </div>
)}
```

3. **Add State Management**:
```typescript
const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null)
const [selectedSettings, setSelectedSettings] = useState<string[]>([])

// Reset when series changes
useEffect(() => {
  setSelectedEpisode(null)
  setSelectedSettings([])
}, [selectedSeries])
```

4. **Pass to API**:
```typescript
const response = await fetch('/api/videos', {
  method: 'POST',
  body: JSON.stringify({
    // ... existing fields
    episodeId: selectedEpisode,
    selectedSettings
  })
})
```

### API Modifications

#### POST /api/videos

**File**: `app/api/videos/route.ts`

**Changes**:

1. **Accept new parameters**:
```typescript
const {
  // ... existing
  episodeId,
  selectedSettings
} = await request.json()
```

2. **Store in database**:
```typescript
const { data: video, error } = await supabase
  .from('videos')
  .insert({
    // ... existing fields
    episode_id: episodeId || null,
    series_settings_used: selectedSettings || null
  })
  .select()
  .single()
```

3. **Validation**: Ensure episode belongs to user's series

#### GET /api/episodes/[id]/full-data

**File**: `app/api/episodes/[id]/full-data/route.ts`

**Fix Bug** (line 92):
```typescript
// BEFORE (bug - synopsis doesn't exist):
synopsis: episode.synopsis

// AFTER (use logline):
logline: episode.logline
```

### Testing Checklist - Phase 1

- [ ] Database migration applies successfully
- [ ] episode_id column created with proper foreign key
- [ ] Index created on videos.episode_id
- [ ] RLS policy prevents cross-user episode linking
- [ ] SettingsSelector fetches and displays settings correctly
- [ ] SettingsSelector allows multi-select with checkboxes
- [ ] EpisodeSelector fetches and displays episodes by season
- [ ] EpisodeSelector allows "None (Standalone)" option
- [ ] quick-create-video-dialog shows episode and settings selectors
- [ ] Video creation stores episode_id and series_settings_used
- [ ] Standalone videos work without episode (episode_id = null)
- [ ] TypeScript types updated for videos and episodes

---

## Phase 2: Automatic Context Inheritance

### Context Fetching Service

**File**: `lib/services/episode-context.ts`

**Purpose**: Fetch and format episode context for video creation

```typescript
export interface EpisodeContext {
  episodeId: string
  episodeTitle: string
  logline: string
  storyBeat?: string
  emotionalArc?: string
  narrativeBeats: NarrativeBeat[]
  characters: string[]  // Character IDs
  settings: string[]    // Setting IDs
}

export interface NarrativeBeat {
  description: string
  emotional_tone?: string
  beat_type?: string
}

export async function fetchEpisodeContext(
  episodeId: string
): Promise<EpisodeContext> {
  const response = await fetch(`/api/episodes/${episodeId}/context`)
  if (!response.ok) throw new Error('Failed to fetch episode context')

  const data = await response.json()

  return {
    episodeId: data.episode.id,
    episodeTitle: data.episode.title,
    logline: data.episode.logline,
    storyBeat: data.episode.story_beat,
    emotionalArc: data.episode.emotional_arc,
    narrativeBeats: extractNarrativeBeats(data.episode.structured_screenplay),
    characters: data.episode.characters_used || [],
    settings: data.episode.settings_used || []
  }
}

function extractNarrativeBeats(
  screenplay: StructuredScreenplay | null
): NarrativeBeat[] {
  if (!screenplay?.beats) return []

  return screenplay.beats.map(beat => ({
    description: beat.description,
    emotional_tone: beat.emotional_tone,
    beat_type: beat.beat_type
  }))
}

export function formatEpisodeContextForAgents(
  context: EpisodeContext
): string {
  return `
EPISODE CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Episode: "${context.episodeTitle}"
Logline: ${context.logline}
${context.storyBeat ? `Key Story Beat: ${context.storyBeat}` : ''}
${context.emotionalArc ? `Emotional Arc: ${context.emotionalArc}` : ''}

${context.narrativeBeats.length > 0 ? `
Narrative Beats:
${context.narrativeBeats.map((beat, i) => `${i + 1}. ${beat.description}${beat.emotional_tone ? ` [${beat.emotional_tone}]` : ''}`).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This video is part of the episode narrative above. Ensure the generated content aligns with the episode's story arc, emotional tone, and narrative context.
`
}
```

### New API Endpoint

**File**: `app/api/episodes/[id]/context/route.ts`

**Purpose**: Fetch episode context specifically for video creation

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: episodeId } = params

  // Fetch episode with full context
  const { data: episode, error } = await supabase
    .from('episodes')
    .select(`
      id,
      title,
      logline,
      story_beat,
      emotional_arc,
      structured_screenplay,
      characters_used,
      settings_used,
      series:series_id (
        id,
        name
      )
    `)
    .eq('id', episodeId)
    .eq('user_id', user.id)
    .single()

  if (error || !episode) {
    return NextResponse.json(
      { error: 'Episode not found' },
      { status: 404 }
    )
  }

  // Fetch full character details
  let characters = []
  if (episode.characters_used && episode.characters_used.length > 0) {
    const { data: chars } = await supabase
      .from('series_characters')
      .select('*')
      .in('id', episode.characters_used)
    characters = chars || []
  }

  // Fetch full setting details
  let settings = []
  if (episode.settings_used && episode.settings_used.length > 0) {
    const { data: sets } = await supabase
      .from('series_settings')
      .select('*')
      .in('id', episode.settings_used)
    settings = sets || []
  }

  return NextResponse.json({
    episode: {
      id: episode.id,
      title: episode.title,
      logline: episode.logline,
      story_beat: episode.story_beat,
      emotional_arc: episode.emotional_arc,
      structured_screenplay: episode.structured_screenplay,
      characters_used: episode.characters_used,
      settings_used: episode.settings_used
    },
    series: episode.series,
    characters,
    settings
  })
}
```

### UI Changes - Auto-Population

**File**: `components/videos/quick-create-video-dialog.tsx`

**Add Effect for Episode Selection**:

```typescript
// Auto-populate when episode selected
useEffect(() => {
  if (!selectedEpisode) return

  async function loadEpisodeContext() {
    try {
      setIsLoadingEpisode(true)
      const context = await fetchEpisodeContext(selectedEpisode)

      // Auto-select characters from episode
      setSelectedCharacters(context.characters)

      // Auto-select settings from episode
      setSelectedSettings(context.settings)

      // Store episode context for display
      setEpisodeContext(context)
    } catch (error) {
      console.error('Failed to load episode context:', error)
      toast.error('Failed to load episode details')
    } finally {
      setIsLoadingEpisode(false)
    }
  }

  loadEpisodeContext()
}, [selectedEpisode])
```

**Add Episode Context Display**:

```tsx
{episodeContext && (
  <div className="bg-muted/50 rounded-lg p-4 border">
    <div className="flex items-start justify-between mb-2">
      <h4 className="font-semibold text-sm">Episode Context</h4>
      <Badge variant="outline" className="text-xs">
        {episodeContext.episodeTitle}
      </Badge>
    </div>
    <p className="text-sm text-muted-foreground mb-2">
      {episodeContext.logline}
    </p>
    {episodeContext.storyBeat && (
      <p className="text-xs text-muted-foreground">
        <strong>Key Beat:</strong> {episodeContext.storyBeat}
      </p>
    )}
    <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
      <span>📌 {episodeContext.characters.length} characters</span>
      <span>📌 {episodeContext.settings.length} settings</span>
    </div>
  </div>
)}
```

### AI Roundtable Integration

**File**: `app/api/agent/roundtable/route.ts`

**Accept Episode Context**:

```typescript
const {
  brief,
  platform,
  seriesId,
  episodeId,
  // ... other params
} = validation.data

// Fetch episode context if episodeId provided
let episodeContext: string | undefined
if (episodeId) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/episodes/${episodeId}/context`,
      { headers: { /* auth headers */ } }
    )
    const data = await response.json()

    const context: EpisodeContext = {
      episodeId: data.episode.id,
      episodeTitle: data.episode.title,
      logline: data.episode.logline,
      storyBeat: data.episode.story_beat,
      emotionalArc: data.episode.emotional_arc,
      narrativeBeats: extractNarrativeBeats(data.episode.structured_screenplay),
      characters: data.episode.characters_used || [],
      settings: data.episode.settings_used || []
    }

    episodeContext = formatEpisodeContextForAgents(context)
  } catch (error) {
    logger.warn('Failed to fetch episode context', { episodeId, error })
  }
}

// Pass to agent orchestrator
const result = await runAgentRoundtable({
  brief,
  platform,
  // ... existing params
  episodeContext,  // NEW
})
```

**File**: `lib/ai/agent-orchestrator-stream.ts`

**Update Agent Context String**:

```typescript
let contextString = ''
if (visualTemplate) {
  contextString += `\n\nVISUAL TEMPLATE:\n${visualTemplate}`
}
if (episodeContext) {
  contextString += episodeContext  // Episode narrative context
}
if (characterContext) {
  contextString += characterContext  // Character specs (already exists)
}
if (screenplayContext) {
  contextString += screenplayContext
}
if (seriesSettings && seriesSettings.length > 0) {
  contextString += `\n\nSETTINGS:\n${seriesSettings.map(s => `- ${s.name}: ${s.description}`).join('\n')}`
}
```

### Testing Checklist - Phase 2

- [ ] fetchEpisodeContext() retrieves episode data correctly
- [ ] Episode selection auto-populates characters
- [ ] Episode selection auto-populates settings
- [ ] Users can deselect auto-populated items
- [ ] Users can add additional characters/settings
- [ ] Episode context displayed in modal
- [ ] Episode context formatted correctly for agents
- [ ] AI agents receive episode narrative context
- [ ] Character consistency improves with episode context
- [ ] Standalone videos still work (no episode context)

---

## Phase 3: Enhanced UX & Polish

### Episode Context Panel Component

**File**: `components/videos/episode-context-panel.tsx`

**Purpose**: Collapsible panel showing episode details

```typescript
interface EpisodeContextPanelProps {
  episodeContext: EpisodeContext
}

export function EpisodeContextPanel({ episodeContext }: EpisodeContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-muted/50 rounded-lg border">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/70">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Episode Context
            </Badge>
            <h4 className="font-semibold text-sm">
              {episodeContext.episodeTitle}
            </h4>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isExpanded && "transform rotate-180"
          )} />
        </CollapsibleTrigger>

        <CollapsibleContent className="p-4 pt-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            {episodeContext.logline}
          </p>

          {episodeContext.storyBeat && (
            <div className="text-xs">
              <strong className="text-foreground">Key Story Beat:</strong>
              <p className="text-muted-foreground mt-1">
                {episodeContext.storyBeat}
              </p>
            </div>
          )}

          {episodeContext.emotionalArc && (
            <div className="text-xs">
              <strong className="text-foreground">Emotional Arc:</strong>
              <p className="text-muted-foreground mt-1">
                {episodeContext.emotionalArc}
              </p>
            </div>
          )}

          <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span>📌 {episodeContext.characters.length} characters inherited</span>
            <span>📌 {episodeContext.settings.length} settings inherited</span>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
```

### Narrative Beat Suggestions Component

**File**: `components/videos/narrative-beat-suggestions.tsx`

**Purpose**: Show episode beats as suggested prompts

```typescript
interface NarrativeBeatSuggestionsProps {
  narrativeBeats: NarrativeBeat[]
  onSelect: (beat: NarrativeBeat) => void
}

export function NarrativeBeatSuggestions({
  narrativeBeats,
  onSelect
}: NarrativeBeatSuggestionsProps) {
  if (narrativeBeats.length === 0) return null

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Suggested from Episode Beats
      </Label>
      <div className="flex flex-wrap gap-2">
        {narrativeBeats.map((beat, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 text-xs"
            onClick={() => onSelect(beat)}
          >
            <span className="text-left">
              {beat.description}
              {beat.emotional_tone && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {beat.emotional_tone}
                </Badge>
              )}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
```

### Enhanced quick-create-video-dialog

**Add Narrative Suggestions**:

```tsx
{episodeContext && episodeContext.narrativeBeats.length > 0 && (
  <NarrativeBeatSuggestions
    narrativeBeats={episodeContext.narrativeBeats}
    onSelect={(beat) => {
      // Populate brief with selected beat
      form.setValue('userBrief', beat.description)
    }}
  />
)}
```

**Add Context Panel**:

```tsx
{episodeContext && (
  <EpisodeContextPanel episodeContext={episodeContext} />
)}
```

**Add Inherited Item Badges**:

```typescript
// In CharacterSelector component
interface CharacterItemProps {
  character: SeriesCharacter
  isSelected: boolean
  isInherited: boolean  // NEW
  onChange: (checked: boolean) => void
}

// Display inherited badge
{isInherited && (
  <Badge variant="secondary" className="text-[10px]">
    📌 From Episode
  </Badge>
)}
```

### Episode Detail Page Integration

**File**: `app/dashboard/series/[seriesId]/episodes/[episodeId]/page.tsx` (if exists) or create

**Add "Create Video" Button**:

```tsx
<div className="flex gap-2">
  <Button
    onClick={() => {
      // Open video creation modal with episode pre-selected
      setIsVideoDialogOpen(true)
      setPreselectedEpisode(episode.id)
    }}
  >
    <Video className="mr-2 h-4 w-4" />
    Create Video for This Episode
  </Button>

  {/* Other episode actions */}
</div>

<QuickCreateVideoDialog
  isOpen={isVideoDialogOpen}
  onClose={() => setIsVideoDialogOpen(false)}
  preselectedSeries={episode.series_id}
  preselectedEpisode={preselectedEpisode}
/>
```

### Dual Entry Point Support

**Global "New Video" Button**:
- Shows full modal with episode selector
- User can choose episode or standalone

**Episode Page "Create Video" Button**:
- Opens modal with episode pre-selected
- Episode context auto-loaded
- Characters/settings auto-populated

### Testing Checklist - Phase 3

- [ ] Episode context panel displays correctly
- [ ] Panel is collapsible and preserves state
- [ ] Narrative beat suggestions render as chips
- [ ] Clicking beat populates brief field
- [ ] Inherited items show "From Episode" badge
- [ ] Episode detail page has "Create Video" button
- [ ] Button opens modal with episode pre-selected
- [ ] Both entry points work (global + episode page)
- [ ] Context panel shows character/setting counts
- [ ] Visual polish matches design system

---

## Success Metrics & KPIs

### Quantitative Metrics

1. **Context Retention Rate**
   - Formula: (Videos with episode_id / Total videos) × 100
   - Target: >60% of new videos link to episodes
   - Measurement: Weekly dashboard query

2. **Time to Create Video**
   - Baseline: Average 3 minutes (current flow)
   - Target: Average 2 minutes (30% reduction)
   - Measurement: Track from dialog open to submission

3. **Character Consistency Score**
   - Baseline: Current average from validation system
   - Target: +15 percentage points improvement
   - Measurement: Compare before/after episode context

4. **Settings Usage Rate**
   - Baseline: 0% (feature doesn't exist)
   - Target: >40% of videos use settings
   - Measurement: Videos with series_settings_used

### Qualitative Metrics

1. **User Satisfaction**
   - Method: In-app survey after video creation
   - Question: "How smooth was the video creation workflow?"
   - Target: >4.0/5.0 average rating

2. **Feature Adoption**
   - Track: % users using episode selector vs. standalone
   - Track: % users modifying vs. keeping inherited selections
   - Track: % users using narrative beat suggestions

3. **Support Tickets**
   - Monitor: Reduction in "can't find my characters" issues
   - Monitor: Questions about episode-video relationship

### Analytics Events

Track these events for feature analysis:

```typescript
// Episode selector usage
analytics.track('episode_selected', { episodeId, seriesId })

// Auto-population engagement
analytics.track('characters_auto_populated', { count, accepted, modified })
analytics.track('settings_auto_populated', { count, accepted, modified })

// Narrative suggestions
analytics.track('narrative_beat_clicked', { beatDescription })

// Entry point tracking
analytics.track('video_creation_started', {
  source: 'global_button' | 'episode_page',
  hasEpisode: boolean
})
```

---

## Testing Strategy

### Unit Tests

**Components**:
- SettingsSelector renders and handles selection
- EpisodeSelector renders and groups by season
- EpisodeContextPanel displays context correctly
- NarrativeBeatSuggestions handles click events

**Services**:
- fetchEpisodeContext() returns correct structure
- formatEpisodeContextForAgents() formats properly
- extractNarrativeBeats() parses screenplay beats

### Integration Tests

**API Routes**:
- POST /api/videos stores episode_id correctly
- GET /api/episodes/[id]/context returns full data
- Episode context passed to AI roundtable

**Data Flow**:
- Episode selection → context fetch → auto-population
- Video creation → episode_id storage → relationship query

### E2E Tests (Playwright)

**Scenario 1: Episode-Based Video Creation**
```typescript
test('create video from episode with context inheritance', async ({ page }) => {
  // Navigate to series page
  await page.goto('/dashboard/series/[seriesId]')

  // Click episode
  await page.click('text=Episode 1: The Pilot')

  // Click "Create Video" button
  await page.click('button:has-text("Create Video for This Episode")')

  // Verify episode is pre-selected
  await expect(page.locator('[data-testid="episode-selector"]')).toHaveValue('episode-id')

  // Verify characters auto-populated
  await expect(page.locator('[data-testid="character-1"]')).toBeChecked()
  await expect(page.locator('[data-testid="character-2"]')).toBeChecked()

  // Verify settings auto-populated
  await expect(page.locator('[data-testid="setting-1"]')).toBeChecked()

  // Fill brief
  await page.fill('[data-testid="user-brief"]', 'Create opening scene')

  // Submit
  await page.click('button:has-text("Create Video")')

  // Verify redirect to roundtable
  await expect(page).toHaveURL(/\/roundtable/)
})
```

**Scenario 2: Standalone Video Creation**
```typescript
test('create standalone video without episode', async ({ page }) => {
  await page.goto('/dashboard/videos')
  await page.click('button:has-text("New Video")')

  // Select series
  await page.selectOption('[data-testid="series-selector"]', 'series-id')

  // Leave episode as "None (Standalone)"
  // Manually select character
  await page.check('[data-testid="character-1"]')

  // Fill brief and submit
  await page.fill('[data-testid="user-brief"]', 'Create standalone scene')
  await page.click('button:has-text("Create Video")')

  // Verify video created without episode_id
  // ... assertions
})
```

### Manual Testing Checklist

**Phase 1 Testing**:
- [ ] Create video with episode selected, verify episode_id stored
- [ ] Create video without episode, verify episode_id is null
- [ ] Settings selector displays all series settings
- [ ] Episode selector groups by season correctly
- [ ] Episode deletion sets videos.episode_id to NULL

**Phase 2 Testing**:
- [ ] Select episode, verify characters auto-populate
- [ ] Select episode, verify settings auto-populate
- [ ] Deselect inherited character, verify change persists
- [ ] Add additional character beyond episode, verify both stored
- [ ] Episode context displays in modal
- [ ] AI roundtable receives episode context
- [ ] Check generated prompt quality with vs without episode context

**Phase 3 Testing**:
- [ ] Episode detail page "Create Video" button works
- [ ] Narrative beat suggestions populate brief
- [ ] Inherited items show "From Episode" badge
- [ ] Episode context panel expands/collapses
- [ ] Both entry points (global + episode page) work seamlessly

---

## Migration & Rollout Plan

### Pre-Deployment

1. **Database Backup**: Full backup before migration
2. **Staging Test**: Apply migration and test on staging
3. **Performance Test**: Check query performance with indexes
4. **Rollback Plan**: Have rollback migration ready

### Deployment Steps

**Week 1 - Phase 1**:
```bash
# 1. Apply database migration
supabase db push

# 2. Deploy backend changes (API routes)
vercel deploy --prod

# 3. Deploy frontend changes (UI components)
# Components, types, and new selectors

# 4. Verify in production
# Create test video with episode
# Create test video without episode
```

**Week 2 - Phase 2**:
```bash
# 1. Deploy context fetching service
# 2. Deploy AI roundtable changes
# 3. Test auto-population in production
# 4. Monitor character consistency scores
```

**Week 3 - Phase 3**:
```bash
# 1. Deploy enhanced UI components
# 2. Deploy episode page integration
# 3. Enable feature flag (if using)
# 4. Monitor adoption metrics
```

### Feature Flag Strategy

Optional: Use feature flag for gradual rollout

```typescript
// Feature flag check
const isEpisodeContextEnabled = useFeatureFlag('episode-context-video-creation')

// Conditionally render new features
{isEpisodeContextEnabled && (
  <EpisodeSelector {...props} />
)}
```

### Rollback Procedure

If critical issues arise:

```sql
-- Remove episode_id column (reversible)
ALTER TABLE videos DROP COLUMN episode_id;

-- Revert to previous deployment
git revert [commit-hash]
vercel rollback
```

---

## Edge Cases & Error Handling

### Edge Case 1: Episode with No Characters

**Scenario**: Episode defined but no characters_used yet

**Handling**:
- Show empty state in inherited section
- Allow manual selection from series-level characters
- Prompt: "This episode doesn't have characters yet. Select from series characters or add new ones."

### Edge Case 2: Episode with No Settings

**Scenario**: Episode defined but no settings_used yet

**Handling**:
- Show empty state in inherited section
- Allow manual selection from series-level settings
- Prompt: "This episode doesn't have settings yet. Select from series settings."

### Edge Case 3: User Changes Series After Selecting Episode

**Scenario**: Episode selected, then user changes series dropdown

**Handling**:
```typescript
useEffect(() => {
  // Reset episode when series changes
  setSelectedEpisode(null)
  setEpisodeContext(null)
  setSelectedCharacters([])
  setSelectedSettings([])
}, [selectedSeries])
```

### Edge Case 4: Episode Deleted After Video Created

**Scenario**: Video has episode_id, but episode is deleted

**Handling**:
- Foreign key with `ON DELETE SET NULL` sets episode_id to null
- Video continues to exist as standalone
- UI shows: "Original episode no longer available"

### Edge Case 5: Multiple Videos Per Episode

**Scenario**: User creates 5 videos all for Episode 1

**Handling**:
- Fully supported - multiple videos can link to same episode
- Episode detail page shows: "3 videos created for this episode"
- Each video maintains its own brief and selections

### Edge Case 6: Episode Changes After Video Created

**Scenario**: Episode characters change, but video already created with old characters

**Handling**:
- Video retains its original character selection
- No automatic sync (videos are snapshots)
- Display: "Video created with Episode 1 context (as of Jan 28, 2025)"

### Edge Case 7: User Wants Different Characters Than Episode

**Scenario**: Episode has Sarah and John, but user wants to add Michael

**Handling**:
- Allow adding characters beyond inherited ones
- Store all selected characters in series_characters_used
- Badge shows: "2 from episode, 1 added"

### Edge Case 8: Episode Context Fetch Fails

**Scenario**: API error when fetching episode context

**Handling**:
```typescript
try {
  const context = await fetchEpisodeContext(episodeId)
  setEpisodeContext(context)
} catch (error) {
  console.error('Failed to load episode context:', error)
  toast.error('Could not load episode details. You can still create the video manually.')
  // Don't auto-populate, but allow manual selection
}
```

### Edge Case 9: Extremely Long Episode Title or Logline

**Scenario**: Episode title is 200 characters

**Handling**:
- Truncate in UI with tooltip for full text
- Display format: `{truncate(title, 50)}...`
- Full text available on hover

### Edge Case 10: Episode in Draft Status

**Scenario**: User selects episode that's still in draft

**Handling**:
- Show status badge: "Draft Episode"
- Allow video creation (episode doesn't need to be complete)
- Warning: "Episode is still in draft. Context may change."

---

## Future Enhancements (Post-MVP)

### 1. Visual Episode Timeline

**Description**: Visual representation showing all videos within an episode

**Features**:
- Timeline view of episode with video markers
- Click video marker to view/edit
- Drag-and-drop reordering
- Progress bar: % of episode scenes videoed

**Value**: Better episode production tracking

### 2. Scene-Level Selection

**Description**: Select specific scene from episode's structured_screenplay

**Features**:
- Dropdown showing all scenes from episode
- Scene details: location, characters, time of day
- Auto-populate from scene data (more specific than episode)
- Video tracks scene_id in addition to episode_id

**Value**: More granular context, better organization

### 3. Beat-to-Video Mapping

**Description**: Track which narrative beat each video covers

**Features**:
- Episode detail shows: Beat 1 (2 videos), Beat 2 (0 videos), Beat 3 (1 video)
- Visual indicator of coverage
- One-click "Create video for Beat 2"
- Report: "Episode 60% complete"

**Value**: Production management, completeness tracking

### 4. Episode Completion Tracker

**Description**: Dashboard showing episode production status

**Features**:
- % of scenes with videos
- % of narrative beats covered
- Character appearance tracking
- Setting coverage analysis

**Value**: Project management, production oversight

### 5. Auto-Brief Generation

**Description**: Generate video brief automatically from selected beat

**Features**:
- Click narrative beat → AI generates detailed brief
- Uses episode context + beat description
- Editable before submission
- "Regenerate" option

**Value**: Faster video creation, consistency

### 6. Episode Style Inheritance

**Description**: Visual style settings from episode-level configuration

**Features**:
- Episode has Sora style settings (mood, palette, tone)
- Videos inherit these automatically
- Override available per video
- Consistency across episode

**Value**: Visual consistency, brand alignment

### 7. Multi-Video Batch Creation

**Description**: Create multiple videos for episode at once

**Features**:
- Select multiple beats/scenes
- Generate briefs for all
- Batch submit to AI roundtable
- Queue management

**Value**: Efficiency for high-volume production

### 8. Episode Template System

**Description**: Reusable episode templates for series patterns

**Features**:
- Save episode structure as template
- Apply template to new episodes
- Character/setting templates
- Workflow templates

**Value**: Consistency, speed for episodic content

---

## Documentation & Training

### User Documentation

**Help Article**: "Creating Videos from Episodes"
- Step-by-step guide with screenshots
- Video walkthrough
- FAQs section

**In-App Tooltips**:
- Episode selector: "Select an episode to inherit characters and settings"
- Inherited badge: "This item is from the selected episode. You can deselect if not needed."

### Developer Documentation

**README Updates**:
- Episode-video relationship explanation
- Database schema documentation
- API endpoint documentation

**Code Comments**:
- Clear comments in fetchEpisodeContext
- Agent context formatting logic explanation
- Edge case handling notes

### Training Materials

**Internal Team**:
- Feature demo video
- Testing playbook
- Support ticket response guide

**Users**:
- Release announcement with benefits
- Tutorial video: "Episode-Based Video Creation Workflow"
- Best practices guide

---

## Appendix

### Database Schema - Complete

```sql
-- episodes table (existing, no changes except optional plot_summary)
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  logline TEXT,
  plot_summary TEXT,  -- OPTIONAL ADD
  screenplay_text TEXT,
  structured_screenplay JSONB,
  story_beat TEXT,
  emotional_arc TEXT,
  continuity_breaks JSONB DEFAULT '[]',
  custom_context JSONB DEFAULT '{}',
  characters_used TEXT[],
  settings_used TEXT[],
  timeline_position INTEGER,
  is_key_episode BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  current_session_id UUID REFERENCES screenplay_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(series_id, season_number, episode_number)
);

-- videos table (with new episode_id column)
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE SET NULL,
  episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,  -- NEW
  title TEXT NOT NULL,
  user_brief TEXT NOT NULL,
  platform TEXT NOT NULL,
  optimized_prompt TEXT,
  detailed_breakdown JSONB,
  agent_discussion JSONB,
  character_count INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  series_characters_used TEXT[],
  series_settings_used TEXT[],  -- Already exists from previous phase
  sora_video_url TEXT,
  sora_generation_status TEXT,
  sora_generation_cost DECIMAL(10, 2),
  sora_completed_at TIMESTAMPTZ,
  sora_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_videos_episode_id ON videos(episode_id);
CREATE INDEX idx_episodes_characters_used ON episodes USING GIN (characters_used);
CREATE INDEX idx_episodes_settings_used ON episodes USING GIN (settings_used);
```

### API Endpoints - Complete List

**Videos**:
- POST `/api/videos` - Create video (accepts episodeId, selectedSettings)
- GET `/api/videos` - List videos (can filter by episode_id)
- GET `/api/videos/[id]` - Get single video
- PATCH `/api/videos/[id]` - Update video

**Episodes**:
- GET `/api/episodes?seriesId={id}` - List episodes for series
- GET `/api/episodes/[id]` - Get single episode
- GET `/api/episodes/[id]/context` - Get episode context for video creation (NEW)
- GET `/api/episodes/[id]/full-data` - Get episode with series data
- POST `/api/episodes` - Create episode
- PUT `/api/episodes/[id]` - Update episode
- DELETE `/api/episodes/[id]` - Delete episode

**Series**:
- GET `/api/series/[id]/settings` - Get series settings (already exists)
- GET `/api/series/[id]/characters` - Get series characters (already exists)

**AI Roundtable**:
- POST `/api/agent/roundtable` - Generate optimized prompt (accepts episodeContext)

### Component Hierarchy

```
QuickCreateVideoDialog
├── SeriesSelector (existing)
├── EpisodeSelector (NEW)
│   └── Episodes grouped by season
├── EpisodeContextPanel (NEW)
│   └── Episode details display
├── NarrativeBeatSuggestions (NEW)
│   └── Clickable beat chips
├── CharacterSelector (existing)
│   └── With inherited badges (ENHANCED)
├── SettingsSelector (NEW)
│   └── Multi-select settings
├── BriefInput (existing)
└── SubmitButton (existing)
```

---

## Summary & Next Steps

This requirements document provides a complete specification for implementing episode-aware video creation across three phases:

1. **Phase 1** (Week 1): Foundation with episode_id, settings selector, episode selector
2. **Phase 2** (Week 2): Auto-population of characters/settings, episode context to AI
3. **Phase 3** (Week 3): Enhanced UX with narrative suggestions and dual entry points

**Expected Outcomes**:
- 30% faster video creation
- 15% better character consistency
- Seamless context flow from episode to video
- Foundation for advanced production management features

**Ready to Implement**: All specifications, components, API changes, and testing strategies defined.

---

**Document Version**: 1.0
**Last Updated**: October 30, 2025
**Status**: Ready for Implementation
