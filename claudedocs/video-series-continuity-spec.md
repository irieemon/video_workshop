# Video Series Continuity System - Product Specification

**Date**: 2025-10-19
**Status**: 📋 Specification Phase
**Type**: Major Feature Addition

---

## Executive Summary

### Vision
Enable users to create **episodic video series** with automated continuity for characters, settings, and visual style. The system maintains narrative coherence across 8-20 episode series, automatically injecting series context into new episode prompts while allowing creative flexibility.

### Key Design Decisions

| Decision Area | Choice | Rationale |
|--------------|--------|-----------|
| **Structure** | Flexible: Series → Episodes with optional Seasons | Start simple, allow growth to multi-season |
| **Definition** | Upfront planning: Define series template before episodes | Character narrative focus requires clear baseline |
| **Scale** | Medium series: 8-20 episodes | Seasonal content, extended campaigns |
| **Primary Use** | Character narrative series (story journeys) | Evolving characters central to experience |
| **Top Continuity** | 1) Character appearance/behavior 2) Setting/location | Core to narrative consistency |
| **Control Model** | Automated with override warnings | Minimize friction, allow creative exceptions |
| **MVP Focus** | Series-aware prompt enhancement (all continuity) | Maximum value: auto-inject all context |
| **Context Scope** | Adaptive: Recent episodes + key moments | Balance richness with performance |
| **Story Tracking** | Basic story beat tracking per episode | Support narrative continuity |
| **Character Evolution** | Timeline-based automatic progression | Characters evolve naturally with episode order |
| **Timeline** | Quality focus: Get it right first | Solid architecture > speed |
| **Integration** | Series under Projects (hierarchy) | Project → Series → Episodes structure |
| **Agent Awareness** | Hybrid: Agents aware + synthesis enforcement | Both explicit and automatic continuity |
| **Transparency** | Hidden by default, show only on conflicts | Trust automation, reduce UI clutter |
| **Settings** | Multiple named settings library | Flexibility for varied locations |

---

## System Architecture

### Hierarchy Structure

```
Project
├── Series (optional, multiple per project)
│   ├── metadata (name, description, genre)
│   ├── continuityContext (characters, settings, visualStyle, storyBeats)
│   ├── Seasons (optional grouping)
│   │   └── Episodes (videos with series context)
│   └── Episodes (if no seasons)
└── Videos (standalone, non-series videos)
```

**Key Points**:
- Projects can contain both standalone videos AND series
- Series can be flat (no seasons) or grouped into seasons
- Episodes are special videos with series context references
- Seasons are optional organizational layer added later if needed

---

## Database Schema

### New Tables

#### `series`
```sql
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT, -- "narrative", "product-showcase", "educational", "brand-content"

  -- Series-level metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Configuration
  enforce_continuity BOOLEAN DEFAULT TRUE,
  allow_continuity_breaks BOOLEAN DEFAULT TRUE, -- with warnings

  CONSTRAINT unique_series_name_per_project UNIQUE(project_id, name)
);

CREATE INDEX idx_series_project ON series(project_id);
```

#### `series_characters`
```sql
CREATE TABLE series_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL, -- Full character appearance description
  role TEXT, -- "protagonist", "supporting", "background"

  -- Character details
  appearance_details JSONB, -- { "age": "young adult", "build": "athletic", etc. }
  performance_style TEXT, -- "deliberate and unhurried", "energetic", etc.

  -- Evolution tracking
  introduced_episode_id UUID REFERENCES videos(id),
  evolution_timeline JSONB, -- [{ "episode_id": "...", "changes": "..." }]

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_character_name_per_series UNIQUE(series_id, name)
);

CREATE INDEX idx_characters_series ON series_characters(series_id);
```

#### `series_settings`
```sql
CREATE TABLE series_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL, -- Full setting/location description

  -- Setting details
  environment_type TEXT, -- "interior", "exterior", "mixed"
  time_of_day TEXT, -- "morning", "afternoon", "evening", "night", "golden-hour"
  atmosphere TEXT, -- Atmospheric qualities

  -- Setting details JSONB
  details JSONB, -- { "props": [...], "mood": "...", etc. }

  -- Usage tracking
  introduced_episode_id UUID REFERENCES videos(id),
  is_primary BOOLEAN DEFAULT FALSE, -- Primary/recurring setting

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_setting_name_per_series UNIQUE(series_id, name)
);

CREATE INDEX idx_settings_series ON series_settings(series_id);
```

#### `series_visual_style`
```sql
CREATE TABLE series_visual_style (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,

  -- Cinematography
  cinematography JSONB, -- { "shotTypes": [...], "cameraMovements": [...], etc. }

  -- Lighting
  lighting JSONB, -- { "direction": "...", "quality": "...", "colorTemp": "..." }

  -- Color grading
  color_palette JSONB, -- { "primary": "...", "mood": "...", "grading": "..." }

  -- Composition
  composition_rules JSONB, -- { "primaryRule": "rule-of-thirds", "framing": "..." }

  -- Audio style
  audio_style JSONB, -- { "foley": "...", "ambience": "...", "musicMood": "..." }

  -- Platform
  default_platform TEXT, -- "tiktok", "instagram", "youtube-shorts"

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visual_style_series ON series_visual_style(series_id);
```

#### `seasons` (optional)
```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT, -- "Season 1: The Beginning", optional
  description TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_season_number_per_series UNIQUE(series_id, season_number)
);

CREATE INDEX idx_seasons_series ON seasons(series_id);
```

#### `series_episodes` (links videos to series)
```sql
CREATE TABLE series_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL, -- Optional
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,

  -- Episode metadata
  episode_number INTEGER NOT NULL, -- Within series or season
  episode_title TEXT,

  -- Story tracking
  story_beat TEXT, -- What happens in this episode
  emotional_arc TEXT, -- Emotional progression

  -- Continuity overrides
  continuity_breaks JSONB, -- [{ "type": "character", "reason": "flashback" }]
  custom_context JSONB, -- Episode-specific context overrides

  -- Episode-specific character/setting usage
  characters_used UUID[], -- Array of character IDs present
  settings_used UUID[], -- Array of setting IDs used

  -- Timeline
  timeline_position INTEGER, -- For chronological ordering (may differ from episode_number)
  is_key_episode BOOLEAN DEFAULT FALSE, -- Flagged as important for context

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_episode_number_per_series UNIQUE(series_id, episode_number)
);

CREATE INDEX idx_episodes_series ON series_episodes(series_id);
CREATE INDEX idx_episodes_season ON series_episodes(season_id);
CREATE INDEX idx_episodes_video ON series_episodes(video_id);
CREATE INDEX idx_episodes_timeline ON series_episodes(series_id, timeline_position);
```

### Modified Tables

#### `videos` (no schema change, relationships via series_episodes)
```sql
-- Existing table, no changes needed
-- series_episodes links videos to series
-- Videos can exist standalone OR as part of series
```

#### `projects` (no schema change)
```sql
-- Existing table, series references projects via foreign key
```

---

## Continuity Context System

### Series Continuity Context Structure

Each series maintains a rich context object used for prompt enhancement:

```typescript
interface SeriesContinuityContext {
  // Identity
  seriesId: string
  seriesName: string
  genre: string

  // Characters
  characters: {
    id: string
    name: string
    description: string // Full appearance description
    performanceStyle: string
    role: string
    evolution: {
      episodeId: string
      episodeNumber: number
      changes: string
    }[]
  }[]

  // Settings
  settings: {
    id: string
    name: string
    description: string // Full environment description
    timeOfDay: string
    atmosphere: string
    isPrimary: boolean
  }[]

  // Visual Style
  visualStyle: {
    cinematography: {
      shotTypes: string[] // "medium shot", "close-up"
      cameraMovements: string[] // "locked on tripod", "slow dolly push"
      framingNotes: string
    }
    lighting: {
      direction: string // "soft directional light from 45 degrees"
      quality: string // "diffused", "hard", "volumetric"
      colorTemperature: string // "warm tungsten tones", "cool daylight"
    }
    colorPalette: {
      mood: string // "warm and inviting", "cool and clinical"
      grading: string // "desaturated backgrounds", "vibrant"
    }
    composition: {
      primaryRule: string // "rule of thirds", "centered"
      framingDetails: string
    }
    audioStyle: {
      foley: string
      ambience: string
      musicMood: string
    }
  }

  // Story Context (for narrative series)
  storyContext: {
    currentEpisode: number
    totalEpisodes: number
    previousBeats: string[] // Story beats from recent/key episodes
    emotionalArc: string // Overall emotional progression
    narrativeTone: string // "uplifting", "tense", "reflective"
  }

  // Timeline & Context Strategy
  contextStrategy: {
    includeLastNEpisodes: number // e.g., 2-3
    keyEpisodeIds: string[] // User-flagged important episodes
    characterEvolutionActive: boolean
  }
}
```

---

## Prompt Enhancement System

### Enhancement Flow

```
User Episode Brief
    ↓
[1. Load Series Context]
    ↓
[2. Build Continuity Augmentation]
    ↓
[3. Enhance User Brief]
    ↓
[4. Agent Roundtable (series-aware)]
    ↓
[5. Synthesis with Continuity Enforcement]
    ↓
Final Cinematic Narrative Prompt
```

### Enhancement Strategies

#### 1. Pre-Agent Enhancement (Augment User Brief)

```typescript
async function enhanceEpisodeBrief(
  userBrief: string,
  episodeNumber: number,
  seriesContext: SeriesContinuityContext
): Promise<string> {

  let enhancedBrief = userBrief

  // Add series context header
  enhancedBrief = `SERIES CONTEXT: "${seriesContext.seriesName}" - Episode ${episodeNumber}/${seriesContext.storyContext.totalEpisodes}\n\n`

  // Add character context
  if (seriesContext.characters.length > 0) {
    enhancedBrief += `SERIES CHARACTERS:\n`
    seriesContext.characters.forEach(char => {
      const evolution = getCharacterStateAtEpisode(char, episodeNumber)
      enhancedBrief += `- ${char.name}: ${evolution.description}. Performance: ${char.performanceStyle}\n`
    })
    enhancedBrief += '\n'
  }

  // Add setting context
  if (seriesContext.settings.length > 0) {
    enhancedBrief += `ESTABLISHED SETTINGS:\n`
    seriesContext.settings.forEach(setting => {
      enhancedBrief += `- ${setting.name}: ${setting.description}\n`
    })
    enhancedBrief += '\n'
  }

  // Add visual style continuity
  enhancedBrief += `SERIES VISUAL STYLE:\n`
  enhancedBrief += `Cinematography: ${seriesContext.visualStyle.cinematography.framingNotes}\n`
  enhancedBrief += `Lighting: ${seriesContext.visualStyle.lighting.direction}, ${seriesContext.visualStyle.lighting.quality}\n`
  enhancedBrief += `Color: ${seriesContext.visualStyle.colorPalette.mood}\n`
  enhancedBrief += `Composition: ${seriesContext.visualStyle.composition.primaryRule}\n\n`

  // Add story context (recent beats)
  if (seriesContext.storyContext.previousBeats.length > 0) {
    enhancedBrief += `RECENT STORY BEATS:\n`
    seriesContext.storyContext.previousBeats.slice(-2).forEach((beat, i) => {
      enhancedBrief += `- Episode ${episodeNumber - 2 + i}: ${beat}\n`
    })
    enhancedBrief += '\n'
  }

  // User's episode-specific brief
  enhancedBrief += `EPISODE ${episodeNumber} BRIEF:\n${userBrief}`

  return enhancedBrief
}
```

#### 2. Series-Aware Agent Prompts

Modify agent system prompts to reference series context:

```typescript
// Example: Subject Director becomes series-aware
subject_director: `You are the SUBJECT ACTION SPECIALIST for Sora2 cinematic narrative prompts.

**SERIES AWARENESS**: When generating subject/action descriptions, you will receive series context including established characters and their evolution. Reference these characters by name and maintain their established appearance, performance style, and behavioral patterns.

If the brief mentions characters from the series, use their established descriptions. If introducing new characters, they should fit the series visual style and tone.

YOUR CONTRIBUTION (3-4 sentences, natural prose with timing):
Describe subject identity using series character database when applicable, detailed action sequence with timing, performance quality consistent with series style, and emotional beats that progress the series narrative.
...
`
```

#### 3. Synthesis Continuity Enforcement

Final synthesis step ensures all continuity elements are present:

```typescript
const synthesisPrompt = `
You are synthesizing production team input into a CINEMATIC NARRATIVE PROMPT for Sora2 video generation.

**SERIES CONTINUITY ENFORCEMENT**:
This is Episode ${episodeNumber} of the series "${seriesName}".

CRITICAL CONTINUITY REQUIREMENTS:
- CHARACTERS: Maintain established character descriptions: ${characters.map(c => `${c.name} - ${c.description}`).join(', ')}
- SETTINGS: Use series locations when mentioned: ${settings.map(s => s.name).join(', ')}
- VISUAL STYLE: Maintain series cinematography style: ${visualStyle.cinematography.framingNotes}
- LIGHTING: Continue series lighting approach: ${visualStyle.lighting.direction}
- COLOR: Preserve series color palette: ${visualStyle.colorPalette.mood}

The final prompt MUST incorporate these continuity elements while integrating the episode-specific content from the brief.

${continuityBreaks.length > 0 ? `CONTINUITY BREAKS ALLOWED: ${continuityBreaks.map(b => b.reason).join(', ')}` : ''}
...
`
```

---

## User Workflows

### Workflow 1: Create New Series

```
1. User navigates to Project
2. Clicks "Create Series" button
3. Series Creation Modal:
   ├─ Name: "The Journey Home"
   ├─ Description: "A character's emotional journey..."
   ├─ Genre: "Character narrative" (dropdown)
   └─ Click "Create Series"
4. Series Template Setup Screen:
   ├─ Characters Section:
   │  ├─ Add Character: "Maya"
   │  │  ├─ Description: "Young professional in her late 20s..."
   │  │  ├─ Performance Style: "Thoughtful, deliberate movements..."
   │  │  └─ Role: "Protagonist"
   │  └─ Add more characters (optional)
   ├─ Settings Section:
   │  ├─ Add Setting: "City Apartment"
   │  │  ├─ Description: "Small but cozy apartment with large windows..."
   │  │  ├─ Time of Day: "Morning/Evening" (varied)
   │  │  └─ Mark as Primary: ✓
   │  └─ Add more settings
   └─ Visual Style Section:
      ├─ Cinematography: "Medium shots, locked tripod, intimate framing"
      ├─ Lighting: "Natural window light, warm tones, soft shadows"
      ├─ Color Palette: "Warm and hopeful, muted backgrounds"
      └─ Composition: "Rule of thirds, subject left/right framing"
5. Click "Save Series Template"
6. Series Dashboard:
   ├─ Series Overview
   ├─ Characters List
   ├─ Settings List
   └─ "Create First Episode" button
```

### Workflow 2: Create Episode in Series

```
1. User in Series Dashboard
2. Click "Create Episode" (or "Add Episode")
3. Episode Creation Form:
   ├─ Episode Number: [Auto-filled: "1"]
   ├─ Episode Title: "New Beginnings"
   ├─ Story Beat: "Maya arrives at her new apartment for the first time"
   ├─ Characters in Episode: [Select: Maya ✓]
   ├─ Settings in Episode: [Select: City Apartment ✓]
   ├─ Continuity Override: [ ] Break continuity (flashback, dream, etc.)
   └─ Episode Brief:
      "Maya walks into her new empty apartment, looking around with
       hope and uncertainty. She sets down her single bag and walks
       to the window, taking in the city view."
4. Click "Generate Prompt"
5. System Process:
   ├─ Load Series Context (characters, settings, visual style)
   ├─ Apply character evolution (Episode 1, so baseline)
   ├─ Enhance brief with series context
   ├─ Run series-aware agent roundtable
   └─ Synthesize with continuity enforcement
6. Prompt Generated:
   ├─ Preview final cinematic narrative prompt (800-1000 chars)
   ├─ Hidden: Continuity elements applied (trust automation)
   └─ Buttons: "Regenerate", "Edit Prompt", "Save Episode"
7. Click "Save Episode"
8. Episode appears in Series Dashboard episodes list
```

### Workflow 3: Create Later Episode (Evolution Example)

```
# User creating Episode 8 after Episodes 1-7 exist

1. User in Series Dashboard
2. Click "Create Episode"
3. Episode Creation Form:
   ├─ Episode Number: [Auto-filled: "8"]
   ├─ Episode Title: "The Decision"
   ├─ Story Beat: "Maya makes a choice to stay in the city"
   ├─ Characters in Episode: [Select: Maya ✓]
   ├─ Settings in Episode: [Select: City Apartment ✓]
   └─ Episode Brief:
      "Maya sits at her window at sunset, reflecting on her journey.
       She's more confident now, her posture changed from episode 1."
4. System Process:
   ├─ Load Series Context
   ├─ **Apply character evolution**: Maya's description adapts based on timeline
   │  └─ Episode 1 Maya: "uncertain, hesitant movements"
   │  └─ Episode 8 Maya: "confident, settled presence"
   ├─ Load recent story beats (Episodes 6-7)
   ├─ Load key episode (Episode 1 flagged as key)
   ├─ Enhance brief with adaptive context
   └─ Generate with evolution awareness
5. Generated Prompt reflects:
   ├─ Same setting (City Apartment) but evolved feel
   ├─ Same visual style (continuity maintained)
   ├─ Maya's evolved character (confident vs uncertain)
   ├─ Reference to journey (story context aware)
   └─ Same cinematography language (consistency)
```

### Workflow 4: Handle Continuity Break (Flashback)

```
# User wants Episode 5 to be a flashback

1. Episode Creation Form for Episode 5
2. Check: [✓] Break continuity (flashback, dream, etc.)
3. Continuity Break Modal appears:
   ├─ Break Type: [Dropdown: "Flashback", "Dream Sequence", "Alternate Timeline", "Other"]
   ├─ Reason: "Showing Maya's past before moving to city"
   ├─ Affected Elements: [✓ Setting, ✓ Character appearance, ✓ Time period]
   └─ Click "Confirm Break"
4. Warning Badge appears on episode: "⚠️ Continuity Break: Flashback"
5. System Process:
   ├─ Load Series Context normally
   ├─ Apply continuity break overrides
   │  └─ Different setting allowed
   │  └─ Younger Maya appearance allowed
   │  └─ Different time context
   └─ Still maintain visual style (cinematography, lighting consistent)
6. Generated prompt:
   ├─ Different setting (not City Apartment)
   ├─ Different character appearance (younger Maya)
   ├─ Same visual language (series consistency)
   └─ Note in series dashboard about break
```

---

## UI Components

### Series Dashboard

```tsx
// /app/dashboard/projects/[id]/series/[seriesId]/page.tsx

<SeriesDashboard>
  {/* Header */}
  <SeriesHeader>
    <Title>The Journey Home</Title>
    <Description>A character's emotional journey...</Description>
    <Stats>
      <Stat label="Episodes" value={12} />
      <Stat label="Characters" value={3} />
      <Stat label="Settings" value={5} />
    </Stats>
    <Actions>
      <Button>Create Episode</Button>
      <Button variant="outline">Edit Series</Button>
      <Button variant="outline">Add Season</Button>
    </Actions>
  </SeriesHeader>

  {/* Main Content */}
  <Tabs defaultValue="episodes">
    <TabsList>
      <Tab value="episodes">Episodes</Tab>
      <Tab value="characters">Characters</Tab>
      <Tab value="settings">Settings</Tab>
      <Tab value="style">Visual Style</Tab>
      <Tab value="overview">Overview</Tab>
    </TabsList>

    <TabsContent value="episodes">
      <EpisodesList>
        {episodes.map(ep => (
          <EpisodeCard
            episodeNumber={ep.episode_number}
            title={ep.episode_title}
            storyBeat={ep.story_beat}
            thumbnail={ep.video.thumbnail}
            duration={ep.video.duration}
            characters={ep.characters_used}
            settings={ep.settings_used}
            isKeyEpisode={ep.is_key_episode}
            continuityBreaks={ep.continuity_breaks}
            onEdit={() => {}}
            onDelete={() => {}}
            onMarkAsKey={() => {}}
          />
        ))}
        <CreateEpisodeCard />
      </EpisodesList>
    </TabsContent>

    <TabsContent value="characters">
      <CharacterLibrary>
        {characters.map(char => (
          <CharacterCard
            name={char.name}
            description={char.description}
            role={char.role}
            performanceStyle={char.performance_style}
            evolution={char.evolution_timeline}
            episodeIntro={char.introduced_episode_id}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        ))}
        <AddCharacterCard />
      </CharacterLibrary>
    </TabsContent>

    <TabsContent value="settings">
      <SettingsLibrary>
        {settings.map(setting => (
          <SettingCard
            name={setting.name}
            description={setting.description}
            timeOfDay={setting.time_of_day}
            isPrimary={setting.is_primary}
            usageCount={getUsageCount(setting.id)}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        ))}
        <AddSettingCard />
      </SettingsLibrary>
    </TabsContent>

    <TabsContent value="style">
      <VisualStyleEditor
        cinematography={visualStyle.cinematography}
        lighting={visualStyle.lighting}
        colorPalette={visualStyle.color_palette}
        composition={visualStyle.composition_rules}
        audioStyle={visualStyle.audio_style}
        onSave={updateVisualStyle}
      />
    </TabsContent>

    <TabsContent value="overview">
      <SeriesOverview>
        <StoryArc episodes={episodes} />
        <CharacterEvolution characters={characters} episodes={episodes} />
        <SettingUsage settings={settings} episodes={episodes} />
        <ContinuityHealth breaks={getAllContinuityBreaks()} />
      </SeriesOverview>
    </TabsContent>
  </Tabs>
</SeriesDashboard>
```

### Episode Creation Modal

```tsx
// components/series/episode-creation-modal.tsx

<Dialog>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Create Episode</DialogTitle>
      <DialogDescription>
        Add a new episode to {seriesName}
      </DialogDescription>
    </DialogHeader>

    <Form>
      {/* Episode Metadata */}
      <FormSection title="Episode Details">
        <FormField label="Episode Number">
          <Input value={nextEpisodeNumber} disabled />
        </FormField>
        <FormField label="Episode Title">
          <Input placeholder="The Beginning" />
        </FormField>
        <FormField label="Story Beat">
          <Textarea placeholder="What happens in this episode..." />
        </FormField>
        <FormField label="Mark as Key Episode">
          <Checkbox label="This episode is important for series context" />
        </FormField>
      </FormSection>

      {/* Continuity */}
      <FormSection title="Series Continuity">
        <FormField label="Characters in Episode">
          <MultiSelect
            options={seriesCharacters}
            placeholder="Select characters..."
          />
        </FormField>
        <FormField label="Settings in Episode">
          <MultiSelect
            options={seriesSettings}
            placeholder="Select locations..."
          />
        </FormField>
        <FormField>
          <Checkbox
            label="Break continuity for this episode (flashback, dream, etc.)"
            onChange={(checked) => {
              if (checked) showContinuityBreakDialog()
            }}
          />
        </FormField>
        {continuityBreak && (
          <Alert>
            <AlertTitle>⚠️ Continuity Break: {continuityBreak.type}</AlertTitle>
            <AlertDescription>{continuityBreak.reason}</AlertDescription>
          </Alert>
        )}
      </FormSection>

      {/* Episode Brief */}
      <FormSection title="Episode Brief">
        <FormField label="Describe what happens in this episode">
          <Textarea
            placeholder="Maya walks into her new apartment..."
            rows={6}
          />
        </FormField>
        {/* Optional: Show series context being applied */}
        <Collapsible>
          <CollapsibleTrigger>
            <Button variant="ghost" size="sm">
              View Series Context (optional)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SeriesContextPreview context={seriesContext} />
          </CollapsibleContent>
        </Collapsible>
      </FormSection>

      {/* Actions */}
      <DialogFooter>
        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
        <Button onClick={generateEpisodePrompt}>
          Generate Episode Prompt
        </Button>
      </DialogFooter>
    </Form>
  </DialogContent>
</Dialog>
```

---

## API Endpoints

### Series Management

```typescript
// GET /api/projects/[projectId]/series
// Get all series in a project
interface SeriesListResponse {
  series: {
    id: string
    name: string
    description: string
    genre: string
    episodeCount: number
    characterCount: number
    settingCount: number
    created_at: string
  }[]
}

// POST /api/projects/[projectId]/series
// Create new series
interface CreateSeriesRequest {
  name: string
  description: string
  genre: string
  visualStyle: VisualStyleConfig
  characters?: CharacterInput[]
  settings?: SettingInput[]
}

// GET /api/series/[seriesId]
// Get series details with full context
interface SeriesDetailResponse {
  series: Series
  characters: Character[]
  settings: Setting[]
  visualStyle: VisualStyle
  episodes: Episode[]
  seasons?: Season[]
}

// PATCH /api/series/[seriesId]
// Update series metadata
interface UpdateSeriesRequest {
  name?: string
  description?: string
  enforce_continuity?: boolean
  allow_continuity_breaks?: boolean
}

// DELETE /api/series/[seriesId]
// Delete series and all episodes
```

### Character Management

```typescript
// POST /api/series/[seriesId]/characters
// Add character to series
interface CreateCharacterRequest {
  name: string
  description: string
  role: string
  performance_style: string
  appearance_details?: object
}

// PATCH /api/series/[seriesId]/characters/[characterId]
// Update character (creates evolution entry if changes appearance)
interface UpdateCharacterRequest {
  description?: string
  performance_style?: string
  appearance_details?: object
  createEvolutionEntry?: boolean
  evolutionEpisodeId?: string
}

// DELETE /api/series/[seriesId]/characters/[characterId]
// Remove character from series
```

### Setting Management

```typescript
// POST /api/series/[seriesId]/settings
// Add setting to series
interface CreateSettingRequest {
  name: string
  description: string
  environment_type: string
  time_of_day: string
  atmosphere: string
  is_primary?: boolean
}

// PATCH /api/series/[seriesId]/settings/[settingId]
// Update setting

// DELETE /api/series/[seriesId]/settings/[settingId]
// Remove setting from series
```

### Episode Management

```typescript
// POST /api/series/[seriesId]/episodes
// Create episode with series-aware prompt generation
interface CreateEpisodeRequest {
  episode_number?: number // Auto-increment if not provided
  episode_title?: string
  story_beat?: string
  characters_used: string[] // Character IDs
  settings_used: string[] // Setting IDs
  is_key_episode?: boolean
  continuity_breaks?: ContinuityBreak[]
  brief: string // User's episode-specific brief
  platform: string
}

interface CreateEpisodeResponse {
  episode: Episode
  video: Video
  optimizedPrompt: string
  characterCount: number
  detailedBreakdown: DetailedBreakdown
  hashtags: string[]
  appliedContext: {
    characters: Character[]
    settings: Setting[]
    visualStyle: VisualStyle
    storyContext: StoryContext
  }
}

// GET /api/series/[seriesId]/episodes/[episodeId]
// Get episode details

// PATCH /api/series/[seriesId]/episodes/[episodeId]
// Update episode metadata
interface UpdateEpisodeRequest {
  episode_title?: string
  story_beat?: string
  is_key_episode?: boolean
  timeline_position?: number
}

// DELETE /api/series/[seriesId]/episodes/[episodeId]
// Delete episode (also deletes associated video)
```

### Series Context Retrieval

```typescript
// GET /api/series/[seriesId]/context
// Get current series continuity context for prompt generation
interface SeriesContextResponse {
  continuityContext: SeriesContinuityContext
  recentEpisodes: Episode[] // Last 2-3 episodes
  keyEpisodes: Episode[] // User-flagged episodes
  characterStates: CharacterEvolutionState[] // Current character states
}

// GET /api/series/[seriesId]/context/episode/[episodeNumber]
// Get context as it would be at a specific episode number
// Used for regenerating or editing past episodes
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)

**Goal**: Database schema, basic CRUD, foundation

**Tasks**:
1. Database Migration
   - [ ] Create `series` table
   - [ ] Create `series_characters` table
   - [ ] Create `series_settings` table
   - [ ] Create `series_visual_style` table
   - [ ] Create `seasons` table (optional support)
   - [ ] Create `series_episodes` table
   - [ ] Add RLS policies for all tables
   - [ ] Create necessary indexes

2. TypeScript Types & Interfaces
   - [ ] Update `database.types.ts` with new tables
   - [ ] Create `SeriesContinuityContext` interface
   - [ ] Create `CharacterEvolutionState` interface
   - [ ] Create form validation schemas (Zod)

3. Basic API Routes
   - [ ] Series CRUD endpoints
   - [ ] Character CRUD endpoints
   - [ ] Setting CRUD endpoints
   - [ ] Visual style endpoints
   - [ ] Episode linking endpoints

4. Basic UI Components
   - [ ] Series list view in project
   - [ ] Series creation modal
   - [ ] Series dashboard layout
   - [ ] Character/Setting cards (read-only)

**Deliverable**: Can create series, add characters/settings/style, view in dashboard

---

### Phase 2: Prompt Enhancement System (Weeks 3-4)

**Goal**: Series-aware prompt generation with continuity

**Tasks**:
1. Context Building System
   - [ ] Build `SeriesContextLoader` service
   - [ ] Implement adaptive context strategy (recent + key episodes)
   - [ ] Create character evolution calculator
   - [ ] Build setting usage tracker

2. Prompt Enhancement Pipeline
   - [ ] Create `enhanceEpisodeBrief()` function
   - [ ] Update agent system prompts for series awareness
   - [ ] Modify synthesis to enforce continuity
   - [ ] Add continuity break handling

3. Episode Creation Flow
   - [ ] Episode creation modal UI
   - [ ] Series context preview component
   - [ ] Continuity break dialog
   - [ ] Episode generation API integration

4. Testing & Validation
   - [ ] Test character consistency across episodes
   - [ ] Test setting consistency
   - [ ] Test visual style maintenance
   - [ ] Test continuity break scenarios
   - [ ] Test character evolution timeline

**Deliverable**: Can create episodes with automatic continuity enforcement

---

### Phase 3: Character Evolution & Story Tracking (Weeks 5-6)

**Goal**: Timeline-based character evolution, story beat tracking

**Tasks**:
1. Evolution System
   - [ ] Implement `getCharacterStateAtEpisode()` function
   - [ ] Create character evolution UI (timeline view)
   - [ ] Add automatic evolution based on episode count
   - [ ] Build evolution override mechanism

2. Story Context
   - [ ] Story beat extraction from episodes
   - [ ] Recent beats context building
   - [ ] Emotional arc tracking
   - [ ] Narrative tone consistency

3. Key Episode System
   - [ ] Mark/unmark key episodes
   - [ ] Key episode context weighting
   - [ ] Key episode indicator in UI

4. Timeline Management
   - [ ] Episode reordering (timeline_position)
   - [ ] Chronological vs release order handling
   - [ ] Timeline visualization component

**Deliverable**: Characters evolve naturally, story beats tracked and referenced

---

### Phase 4: Advanced Features & Polish (Weeks 7-8)

**Goal**: Seasons, analytics, UX refinement

**Tasks**:
1. Season Support
   - [ ] Season creation/management
   - [ ] Season-based episode grouping
   - [ ] Season-level context (optional)

2. Series Analytics
   - [ ] Story arc visualization
   - [ ] Character usage analytics
   - [ ] Setting usage analytics
   - [ ] Continuity health metrics

3. UX Enhancements
   - [ ] Drag-and-drop episode reordering
   - [ ] Bulk operations (mark multiple as key)
   - [ ] Series templates/presets
   - [ ] Export series bible (PDF/Markdown)

4. Performance Optimization
   - [ ] Context caching strategy
   - [ ] Lazy loading for large series
   - [ ] Optimize character evolution queries

5. Documentation
   - [ ] User guide for series feature
   - [ ] Video tutorials
   - [ ] Series best practices guide

**Deliverable**: Polished, production-ready series system

---

## Technical Considerations

### Performance

**Context Size Management**:
- For large series (20+ episodes), context can grow large
- Solution: Adaptive context strategy (recent + key)
- Cache series context in Redis for active series
- Lazy load episode details

**Database Queries**:
```sql
-- Optimized episode context query
SELECT
  e.*,
  v.title as video_title,
  v.final_prompt,
  array_agg(DISTINCT c.name) as character_names,
  array_agg(DISTINCT s.name) as setting_names
FROM series_episodes e
LEFT JOIN videos v ON e.video_id = v.id
LEFT JOIN series_characters c ON c.id = ANY(e.characters_used)
LEFT JOIN series_settings s ON s.id = ANY(e.settings_used)
WHERE e.series_id = $1
  AND (
    e.is_key_episode = true
    OR e.episode_number >= $2 - 3  -- Recent episodes
  )
GROUP BY e.id, v.id
ORDER BY e.timeline_position;
```

### Caching Strategy

```typescript
// Redis cache keys
const CACHE_KEYS = {
  seriesContext: (seriesId: string) => `series:${seriesId}:context`,
  characterState: (seriesId: string, episodeNum: number) =>
    `series:${seriesId}:chars:ep${episodeNum}`,
  recentEpisodes: (seriesId: string) => `series:${seriesId}:recent`,
}

// Cache TTL
const CACHE_TTL = {
  seriesContext: 3600, // 1 hour
  characterState: 7200, // 2 hours
  recentEpisodes: 1800, // 30 minutes
}

// Invalidate on updates
async function invalidateSeriesCache(seriesId: string) {
  await redis.del(CACHE_KEYS.seriesContext(seriesId))
  await redis.del(CACHE_KEYS.recentEpisodes(seriesId))
  // Invalidate character states for all episodes
  await redis.keys(`series:${seriesId}:chars:*`).then(keys =>
    keys.forEach(key => redis.del(key))
  )
}
```

### Character Evolution Algorithm

```typescript
function getCharacterStateAtEpisode(
  character: Character,
  targetEpisodeNumber: number
): CharacterEvolutionState {

  // Start with base description
  let currentState = {
    description: character.description,
    performanceStyle: character.performance_style,
    changes: [] as string[]
  }

  // No evolution timeline = static character
  if (!character.evolution_timeline || character.evolution_timeline.length === 0) {
    return currentState
  }

  // Apply evolution entries up to target episode
  const relevantEvolutions = character.evolution_timeline
    .filter(evo => {
      const evoEpisode = getEpisodeNumber(evo.episode_id)
      return evoEpisode <= targetEpisodeNumber
    })
    .sort((a, b) => getEpisodeNumber(a.episode_id) - getEpisodeNumber(b.episode_id))

  relevantEvolutions.forEach(evo => {
    // Apply changes (simple text append for now, could be more sophisticated)
    currentState.description += ` ${evo.changes}`
    currentState.changes.push(`Ep${getEpisodeNumber(evo.episode_id)}: ${evo.changes}`)
  })

  return currentState
}

// Automatic evolution based on episode count (if no manual evolution)
function applyAutomaticEvolution(
  character: Character,
  episodeNumber: number,
  totalEpisodes: number
): string {

  const progress = episodeNumber / totalEpisodes

  // Example: Confidence grows over time
  if (character.role === 'protagonist') {
    if (progress < 0.3) {
      return character.description // Early: baseline
    } else if (progress < 0.7) {
      return `${character.description}. Showing growing confidence and familiarity.`
    } else {
      return `${character.description}. Now confident and settled, movements assured.`
    }
  }

  return character.description // No automatic evolution
}
```

### Continuity Conflict Detection

```typescript
interface ContinuityConflict {
  type: 'character' | 'setting' | 'style'
  severity: 'warning' | 'error'
  message: string
  suggestion: string
}

function detectContinuityConflicts(
  episodeBrief: string,
  seriesContext: SeriesContinuityContext
): ContinuityConflict[] {

  const conflicts: ContinuityConflict[] = []

  // Check for character description conflicts
  seriesContext.characters.forEach(char => {
    if (briefMentionsCharacter(episodeBrief, char.name)) {
      const briefDescription = extractCharacterDescription(episodeBrief, char.name)
      if (briefDescription && !descriptionsMatch(briefDescription, char.description)) {
        conflicts.push({
          type: 'character',
          severity: 'warning',
          message: `Episode brief describes ${char.name} differently than series baseline`,
          suggestion: `Series baseline: "${char.description}". Consider aligning or creating evolution entry.`
        })
      }
    }
  })

  // Check for visual style conflicts
  if (briefContainsStyleConflict(episodeBrief, seriesContext.visualStyle)) {
    conflicts.push({
      type: 'style',
      severity: 'warning',
      message: `Episode brief suggests different visual style than series`,
      suggestion: `Series uses ${seriesContext.visualStyle.cinematography.framingNotes}. Mark as continuity break if intentional.`
    })
  }

  return conflicts
}
```

---

## Success Metrics

### Adoption Metrics
- % of projects with series created
- Average series size (episodes per series)
- Series completion rate (% of started series with >3 episodes)

### Quality Metrics
- Character consistency score (AI evaluation of character descriptions across episodes)
- Visual style variance (measure of cinematography consistency)
- User-reported continuity satisfaction

### Engagement Metrics
- Time spent in series dashboard
- Character/setting library usage
- Key episode flagging frequency
- Continuity break usage patterns

---

## Future Enhancements (Post-MVP)

### Advanced Features
1. **AI-Powered Story Suggestions**
   - "Based on Episodes 1-5, here are 3 possible directions for Episode 6..."
   - Story beat recommendations

2. **Reference Frame Extraction**
   - Extract key frames from generated videos
   - Use as visual reference for continuity
   - Side-by-side comparison in episode creation

3. **Collaborative Series**
   - Multiple users working on same series
   - Role-based permissions (creator, contributor, viewer)

4. **Series Templates Library**
   - Pre-built series templates (product showcase, character journey, educational)
   - Community-shared templates

5. **Advanced Character Evolution**
   - Visual timeline editor for character development
   - Relationship tracking between characters
   - Character arc templates

6. **Cross-Series References**
   - Shared universe support
   - Character crossovers
   - Setting reuse across series

7. **Automated Consistency Checking**
   - AI-powered continuity validation
   - Automated suggestions for fixes
   - Visual diff of character/setting changes

---

## Open Questions for User Validation

1. **Character Complexity**: Should characters have more attributes (relationships, backstory, goals)?
2. **Setting Variations**: How detailed should setting time-of-day variations be?
3. **Visual Style Granularity**: Is current visual style structure sufficient or too simple?
4. **Story Beat Format**: Freeform text or structured fields (conflict, resolution, etc.)?
5. **Evolution Frequency**: How often do characters typically evolve (every episode, every few)?
6. **Season Necessity**: Is season support critical for MVP or can it wait?

---

## Appendix: Example Series Data

### Example: "Maya's Journey" Series

```json
{
  "series": {
    "name": "Maya's Journey",
    "description": "A young professional's emotional journey finding home in a new city",
    "genre": "character-narrative"
  },
  "characters": [
    {
      "name": "Maya",
      "description": "Young professional in her late 20s with shoulder-length dark hair, wearing casual modern clothing",
      "role": "protagonist",
      "performance_style": "Initially hesitant and careful, movements thoughtful and deliberate",
      "evolution_timeline": [
        {
          "episode_number": 1,
          "changes": "Baseline: uncertain, exploring new space"
        },
        {
          "episode_number": 5,
          "changes": "Growing confidence, movements more fluid and settled"
        },
        {
          "episode_number": 8,
          "changes": "Fully confident and at home, assured presence"
        }
      ]
    }
  ],
  "settings": [
    {
      "name": "City Apartment",
      "description": "Small but cozy modern apartment with large windows overlooking the city, minimalist furniture, warm wood tones",
      "time_of_day": "varies",
      "atmosphere": "Intimate, hopeful, gradually becoming more lived-in",
      "is_primary": true
    },
    {
      "name": "Coffee Shop",
      "description": "Corner coffee shop with large windows, exposed brick, warm lighting, neighborhood gathering spot",
      "time_of_day": "morning/afternoon",
      "atmosphere": "Warm, community-focused, energetic",
      "is_primary": false
    }
  ],
  "visualStyle": {
    "cinematography": {
      "shotTypes": ["medium shot", "close-up"],
      "cameraMovements": ["locked on tripod", "slow dolly push for emotional moments"],
      "framingNotes": "Intimate framing, often Maya positioned left or right third, negative space conveys emotion"
    },
    "lighting": {
      "direction": "Natural window light from side, soft directional",
      "quality": "Soft diffused light, gentle shadows",
      "colorTemperature": "Warm tungsten tones in apartment, cool daylight in coffee shop"
    },
    "colorPalette": {
      "mood": "Warm and hopeful, evolving from muted to more vibrant",
      "grading": "Slightly desaturated initially, increasing saturation as series progresses"
    },
    "composition": {
      "primaryRule": "Rule of thirds with negative space",
      "framingDetails": "Maya often framed with space on opposite side, windows/city visible in background"
    },
    "audioStyle": {
      "foley": "Subtle everyday sounds (footsteps, object handling)",
      "ambience": "City ambient (distant traffic, neighborhood sounds)",
      "musicMood": "Contemplative, hopeful indie acoustic"
    }
  }
}
```

---

**Status**: Specification Complete - Ready for User Review & Implementation Planning

