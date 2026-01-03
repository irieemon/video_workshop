# Scenra Studio - Comprehensive Codebase Reference

**Version**: 1.0.0
**Last Updated**: January 3, 2026
**Framework**: Next.js 16 + React 19

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [Directory Structure](#directory-structure)
4. [Core Systems](#core-systems)
5. [API Reference](#api-reference)
6. [Component Library](#component-library)
7. [AI Agent System](#ai-agent-system)
8. [Database Schema](#database-schema)
9. [Key Patterns & Conventions](#key-patterns--conventions)
10. [Development Workflow](#development-workflow)

---

## Project Overview

Scenra Studio is an AI-powered creative production platform that helps users generate optimized video prompts for Sora video generation. The platform features:

- **Series-First Workflow**: Organize content into series with episodes and segments
- **AI Agent Roundtable**: Multi-agent collaboration system for prompt generation
- **Visual Continuity System**: Maintains consistency across video segments
- **Screenplay Integration**: Chat-based screenplay generation with AI assistance
- **Character & Setting Management**: Rich metadata for consistent storytelling

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.0.7 (App Router) |
| React | React 19.2.0 |
| Language | TypeScript 5.9.3 |
| State Management | TanStack Query 5.x + React Context |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS 3.4.x |
| Forms | react-hook-form + Zod 4.x |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (@supabase/ssr) |
| AI | OpenAI GPT-4o / GPT-4o-mini |
| Testing | Jest 29 + Playwright |
| Deployment | Vercel |

---

## Architecture Summary

```
                    ┌─────────────────────────────────────┐
                    │          CLIENT LAYER               │
                    │  Next.js 15 App Router + React 19   │
                    │  TanStack Query + shadcn/ui         │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │        APPLICATION LAYER            │
                    │  Vercel Serverless Functions        │
                    │  API Routes + Middleware            │
                    └────────────┬───────────┬────────────┘
                                 │           │
              ┌──────────────────┴┐          └┬─────────────────┐
              │                   │           │                 │
     ┌────────┴────────┐  ┌───────┴───────┐  ┌┴────────────────┐
     │   SUPABASE      │  │   OPENAI API  │  │  VERCEL INFRA   │
     │  PostgreSQL     │  │   GPT-4o      │  │  Edge Network   │
     │  Auth + Storage │  │   GPT-4o-mini │  │  Analytics      │
     └─────────────────┘  └───────────────┘  └─────────────────┘
```

### Core Principles

1. **Series-First Model**: All content flows from Series → Episodes → Segments → Videos
2. **Serverless Architecture**: Auto-scaling via Vercel serverless functions
3. **Row-Level Security**: Supabase RLS for data isolation per user
4. **Context Propagation**: Visual state flows between segments for continuity
5. **Multi-Agent Collaboration**: Six specialized AI agents debate to optimize prompts

---

## Directory Structure

```
scenra-studio/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── admin/                    # Admin dashboard
│   │   └── users/
│   ├── dashboard/                # Main application
│   │   ├── series/               # Series management
│   │   │   ├── [seriesId]/       # Series detail view
│   │   │   └── concept/          # Concept generation
│   │   ├── episodes/             # Episode management
│   │   │   └── [id]/
│   │   ├── videos/               # Video creation
│   │   │   ├── [id]/
│   │   │   │   └── roundtable/   # Agent roundtable UI
│   │   │   └── new/
│   │   ├── settings/             # User settings
│   │   ├── upgrade/              # Subscription upgrade
│   │   └── help/                 # Help center
│   ├── api/                      # API Routes (detailed below)
│   ├── providers/                # React Context providers
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                   # React Components
│   ├── ui/                       # shadcn/ui primitives (27 components)
│   ├── series/                   # Series management (18 components)
│   ├── screenplay/               # Screenplay system (5 components)
│   ├── agents/                   # Agent UI (4 components)
│   ├── videos/                   # Video editing (19 components)
│   ├── segments/                 # Segment management (6 components)
│   ├── episodes/                 # Episode components (2 components)
│   ├── performance/              # Performance tracking (7 components)
│   ├── onboarding/               # Tour system (5 components)
│   ├── dashboard/                # Dashboard layout (4 components)
│   ├── modals/                   # Modal dialogs (2 components)
│   ├── brand/                    # Branding components (3 components)
│   └── providers/                # Modal provider
│
├── lib/                          # Utilities and Services
│   ├── ai/                       # AI/Agent system (12 files)
│   ├── services/                 # Business logic (3 files)
│   ├── supabase/                 # Supabase clients (3 files)
│   ├── types/                    # TypeScript types (6 files)
│   ├── utils/                    # Utility functions (4 files)
│   ├── hooks/                    # Custom React hooks
│   ├── validation/               # Zod schemas (3 files)
│   ├── middleware/               # API middleware
│   ├── logger/                   # Logging utility
│   └── rate-limit/               # Rate limiting
│
├── __tests__/                    # Jest unit tests
├── e2e/                          # Playwright E2E tests
├── supabase/                     # Supabase configuration
├── supabase-migrations/          # Database migrations
├── scripts/                      # Utility scripts
└── claudedocs/                   # Development documentation
```

---

## Core Systems

### 1. Content Hierarchy

```
Series (top-level container)
├── Characters (visual & behavioral consistency)
├── Settings (locations & environments)
├── Relationships (character dynamics)
├── Visual Assets (reference materials)
├── Sora Settings (generation parameters)
└── Episodes
    └── Scenes (from screenplay)
        └── Segments (8-12 second video chunks)
            └── Videos (generated content)
```

### 2. Series Concept System

The Series Concept Agent (`lib/ai/series-concept-agent.ts`) provides an interactive dialogue-based system for creating series:

**Phases:**
1. **Gathering** - Collects initial concept information
2. **Deepening** - Explores themes, characters, settings
3. **Structuring** - Organizes into episodes and arcs
4. **Finalizing** - Confirms and persists the concept

**Key Functions:**
- `buildSystemPrompt()` - Constructs agent context
- `determinePhaseTransition()` - Manages dialogue flow
- `initializeDialogueState()` - Creates conversation state

### 3. Segment System

Multi-segment video generation with visual continuity (`lib/ai/episode-segmenter.ts`):

**Segmentation Algorithm:**
1. Parse episode screenplay into scenes
2. Estimate duration (2.5 words/sec for dialogue, 2s for actions)
3. Split at natural boundaries (8-12 second targets)
4. Generate narrative beats and transitions
5. Link segments in continuity chain

**Visual State Propagation:**
- `extractVisualState()` - Captures end-frame state from generated prompts
- `validateContinuity()` - Checks lighting, camera, character positions
- Anchor point refresh every 3-4 segments prevents context drift

### 4. Screenplay System

Chat-based screenplay generation (`lib/ai/screenplay-agent.ts`):

**Components:**
- `ScreenplayChat` - Interactive chat interface
- `ScreenplayViewer` - Formatted screenplay display
- `EpisodeManager` - Episode CRUD operations
- `SceneList` - Scene navigation

**Utilities:**
- `screenplay-parser.ts` - Parse screenplay format
- `screenplay-to-sora.ts` - Convert scenes to Sora prompts
- `screenplay-extraction.ts` - Extract structured data

---

## API Reference

### Authentication (`/api/auth/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/callback` | GET | OAuth callback handler |
| `/api/auth/signout` | POST | End user session |

### Series Management (`/api/series/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/series` | GET, POST | List/create series |
| `/api/series/[seriesId]` | GET, PUT, DELETE | Series CRUD |
| `/api/series/[seriesId]/characters` | GET, POST | Character management |
| `/api/series/[seriesId]/characters/[characterId]` | GET, PUT, DELETE | Character CRUD |
| `/api/series/[seriesId]/characters/[characterId]/analyze-image` | POST | AI image analysis |
| `/api/series/[seriesId]/characters/[characterId]/upload-visual-cue` | POST | Upload reference image |
| `/api/series/[seriesId]/settings` | GET, POST | Setting management |
| `/api/series/[seriesId]/settings/[settingId]` | GET, PUT, DELETE | Setting CRUD |
| `/api/series/[seriesId]/relationships` | GET, POST | Relationship management |
| `/api/series/[seriesId]/relationships/[relationshipId]` | GET, PUT, DELETE | Relationship CRUD |
| `/api/series/[seriesId]/assets` | GET, POST | Visual asset management |
| `/api/series/[seriesId]/assets/[assetId]` | GET, PUT, DELETE | Asset CRUD |
| `/api/series/[seriesId]/sora-settings` | GET, PUT | Sora generation settings |
| `/api/series/[seriesId]/context` | GET | Full series context |
| `/api/series/[seriesId]/visual-style` | GET, PUT | Visual style settings |
| `/api/series/standalone` | POST | Create standalone video |

### Series Concept (`/api/series/concept/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/series/concept/dialogue` | POST | Concept agent dialogue |
| `/api/series/concept/generate` | POST | Generate full concept |
| `/api/series/concept/persist` | POST | Save concept to database |

### Episodes (`/api/episodes/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/episodes` | GET, POST | List/create episodes |
| `/api/episodes/[id]` | GET, PUT, DELETE | Episode CRUD |
| `/api/episodes/[id]/full-data` | GET | Episode with all relations |
| `/api/episodes/[id]/segments` | GET | Get episode segments |
| `/api/episodes/[id]/create-segments` | POST | Parse into segments |
| `/api/episodes/[id]/convert-to-prompt` | POST | Generate Sora prompt |
| `/api/episodes/[id]/videos` | GET | List episode videos |
| `/api/episodes/create-segments` | POST | Bulk segment creation |

### Screenplay (`/api/screenplay/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screenplay/scenes` | GET, POST | Scene management |
| `/api/screenplay/scenes/[sceneId]` | GET, PUT, DELETE | Scene CRUD |
| `/api/screenplay/episodes` | GET, POST | Episode metadata |
| `/api/screenplay/episodes/[episodeId]` | GET, PUT, DELETE | Episode CRUD |
| `/api/screenplay/session/start` | POST | Start chat session |
| `/api/screenplay/session/message` | POST | Send chat message |

### Segments (`/api/segments/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/segments/generate-prompt` | POST | Generate segment prompt |
| `/api/segments/generate-video` | POST | Generate video from segment |
| `/api/segments/[id]/generate-video` | POST | Generate specific segment video |

### Segment Groups (`/api/segment-groups/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/segment-groups/[id]` | GET, PATCH, DELETE | Group management |
| `/api/segment-groups/[id]/generate-batch` | POST | Batch video generation |

### Videos (`/api/videos/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET, POST | List/create videos |
| `/api/videos/[id]` | GET, PUT, DELETE | Video CRUD |
| `/api/videos/[id]/generate-sora` | POST | Generate with Sora API |
| `/api/videos/[id]/reset-sora` | POST | Reset generation state |
| `/api/videos/[id]/sora-status` | GET | Check generation status |
| `/api/videos/[id]/duplicate` | POST | Duplicate video |
| `/api/videos/[id]/performance` | GET, POST | Performance metrics |
| `/api/videos/[id]/performance/insights` | GET | AI performance insights |
| `/api/videos/[id]/performance/[metricId]` | GET, PUT, DELETE | Metric CRUD |

### Agent System (`/api/agent/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/roundtable` | POST | Basic agent roundtable |
| `/api/agent/roundtable/advanced` | POST | Advanced mode with shots |
| `/api/agent/roundtable/stream` | POST | Streaming responses |

### Admin (`/api/admin/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | List all users |
| `/api/admin/stats` | GET | Platform statistics |

### System (`/api/cron/`, `/api/debug/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/poll-sora-status` | GET | Background status polling |
| `/api/debug/series-schema` | GET | Debug series structure |

---

## Component Library

### UI Primitives (`components/ui/`)

Built on shadcn/ui + Radix UI:

| Component | Purpose |
|-----------|---------|
| `accordion.tsx` | Collapsible content sections |
| `alert.tsx` | Status alerts and notifications |
| `alert-dialog.tsx` | Confirmation dialogs |
| `avatar.tsx` | User/character avatars |
| `badge.tsx` | Status indicators |
| `button.tsx` | Action buttons with variants |
| `card.tsx` | Content containers |
| `checkbox.tsx` | Boolean inputs |
| `dialog.tsx` | Modal dialogs |
| `dropdown-menu.tsx` | Context menus |
| `form.tsx` | Form wrapper with validation |
| `input.tsx` | Text inputs |
| `label.tsx` | Form labels |
| `progress.tsx` | Progress indicators |
| `scroll-area.tsx` | Scrollable containers |
| `select.tsx` | Dropdown selects |
| `separator.tsx` | Visual dividers |
| `sheet.tsx` | Slide-out panels |
| `skeleton.tsx` | Loading placeholders |
| `slider.tsx` | Range inputs |
| `table.tsx` | Data tables |
| `tabs.tsx` | Tab navigation |
| `textarea.tsx` | Multi-line text |
| `toast.tsx` | Toast notifications |
| `toaster.tsx` | Toast container |
| `tooltip.tsx` | Hover tooltips |
| `theme-toggle.tsx` | Dark/light mode toggle |

### Series Components (`components/series/`)

| Component | Purpose |
|-----------|---------|
| `SeriesCard` | Series preview card |
| `CreateSeriesDialog` | New series creation modal |
| `CharacterManager` | Character CRUD interface |
| `CharacterConsistencyForm` | Character detail form |
| `CharacterVisualCues` | Visual reference management |
| `SettingManager` | Location/setting management |
| `RelationshipManager` | Character relationship editor |
| `RelationshipForm` | Relationship detail form |
| `RelationshipGraph` | Force-directed relationship graph |
| `RelationshipList` | Relationship list view |
| `VisualAssetManager` | Asset library management |
| `VisualAssetUploader` | Asset upload interface |
| `VisualAssetGallery` | Asset grid display |
| `SoraSettingsManager` | Sora generation settings |
| `ConceptAgentDialog` | AI concept generation chat |
| `ConceptPreview` | Generated concept preview |
| `ConceptEpisodesDisplay` | Episode outline display |
| `ConceptEpisodesWithScreenplay` | Episodes with screenplay integration |
| `EpisodeConceptReviewDialog` | Episode review modal |
| `SeriesEpisodesCoordinator` | Episode list management |

### Agent Components (`components/agents/`)

| Component | Purpose |
|-----------|---------|
| `AgentCard` | Individual agent response display |
| `AgentRoundtable` | Full roundtable discussion view |
| `StreamingRoundtable` | Real-time streaming responses |
| `StreamingRoundtableModal` | Modal wrapper for streaming |

### Video Components (`components/videos/`)

| Component | Purpose |
|-----------|---------|
| `VideosPageClient` | Videos list page |
| `VideoListItem` | Video card in list |
| `VideoRoundtableClient` | Roundtable page client |
| `VideosFilters` | Filter controls |
| `VideosViewToggle` | Grid/list view toggle |
| `DeleteVideoDialog` | Deletion confirmation |
| `QuickCreateVideoDialog` | Rapid video creation |
| `PromptOutput` | Generated prompt display |
| `EditablePromptField` | Editable prompt editor |
| `ShotListBuilder` | Shot-by-shot planning |
| `SoraGenerationButton` | Trigger Sora generation |
| `SoraGenerationModal` | Generation progress modal |
| `SceneToSoraPrompt` | Scene → prompt conversion |
| `EpisodeSelector` | Episode picker |
| `EpisodeSelectorDropdown` | Dropdown episode picker |
| `EpisodeSceneSelector` | Scene picker within episode |
| `SeriesContextSelector` | Series context picker |
| `CharacterSelector` | Character multi-select |
| `SettingsSelector` | Setting multi-select |
| `AdditionalGuidance` | Extra prompt guidance input |
| `AdvancedModeToggle` | Toggle advanced features |

### Segment Components (`components/segments/`)

| Component | Purpose |
|-----------|---------|
| `EpisodeSegmentsTab` | Segment list tab |
| `SegmentList` | Segment cards list |
| `SegmentDetailDrawer` | Segment details panel |
| `CreateSegmentsDialog` | Segment creation modal |
| `BatchGenerationDialog` | Batch generation interface |
| `ContinuityReportViewer` | Continuity validation report |

### Performance Components (`components/performance/`)

| Component | Purpose |
|-----------|---------|
| `PerformanceMetricsSection` | Main metrics container |
| `PerformanceMetricsForm` | Metrics input form |
| `PerformanceMetricsList` | Metrics list view |
| `PerformanceStatsCards` | Summary stat cards |
| `PerformanceInsightsPanel` | AI-generated insights |
| `PerformanceChartViews` | Chart type selector |
| `PerformanceChartEngagement` | Engagement visualizations |

### Onboarding Components (`components/onboarding/`)

| Component | Purpose |
|-----------|---------|
| `TourProvider` | Tour context provider |
| `WelcomeTourTrigger` | Tour initialization trigger |
| `HelpModal` | Help center modal |
| `tour-definitions.ts` | Tour step configurations |
| `tour-styles.css` | Custom tour styling |

---

## AI Agent System

### Agent Architecture

The Agent Roundtable uses six specialized AI agents that collaborate to generate optimized video prompts:

```
┌─────────────────────────────────────────────────────────────┐
│                    ROUND 1: Parallel Execution              │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Director │ Photo DP │ Platform │ Marketer │  Music   │  │
│  │          │          │  Expert  │          │ Producer │  │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘  │
│       └──────────┴──────────┴──────────┴──────────┘        │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    ROUND 2: Sequential Debate               │
│  Platform Expert challenges Director (30% probability)      │
│  → Director responds to challenge                           │
│  → Marketer synthesizes consensus                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    ROUND 3: Synthesis                       │
│  GPT-4o-mini distills into:                                 │
│  • Detailed Breakdown (scene, visual, audio, platform)      │
│  • Optimized Prompt (<500 chars)                            │
│  • Suggested Shots                                          │
│  • Hashtag Recommendations                                  │
└─────────────────────────────────────────────────────────────┘
```

### Agent Types (`lib/ai/agent-types.ts`)

```typescript
type AgentName =
  | 'director'           // Creative vision and storytelling
  | 'photography_director' // Visual composition and camera
  | 'platform_expert'    // Platform-specific optimization
  | 'social_media_marketer' // Engagement and trends
  | 'music_producer'     // Audio and pacing
  | 'subject_director'   // Subject matter expertise
```

### Agent Orchestrator (`lib/ai/agent-orchestrator.ts`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `runAgentRoundtable()` | Standard roundtable with 2 rounds |
| `runAdvancedRoundtable()` | Extended mode with shot list |
| `callAgent()` | Individual agent API call |
| `callAgentWithContext()` | Context-aware follow-up call |
| `synthesizeRoundtable()` | Distill discussion into output |

**Input Interface:**
```typescript
interface RoundtableInput {
  brief: string
  platform: string
  visualTemplate?: VisualTemplate
  seriesCharacters?: SeriesCharacter[]
  seriesSettings?: SeriesSetting[]
  visualAssets?: VisualAsset[]
  characterRelationships?: CharacterRelationship[]
  seriesSoraSettings?: SeriesSoraSettings
  characterContext?: string
  segmentContext?: SegmentVisualState  // For continuity
  userId?: string
}
```

**Output Interface:**
```typescript
interface RoundtableResult {
  discussion: {
    round1: AgentResponse[]
    round2: AgentResponse[]
  }
  detailedBreakdown: DetailedBreakdown
  optimizedPrompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots?: SuggestedShot[]
}
```

### Context Injection Order

When generating prompts, context is injected in priority order:

1. **Visual Continuity** (segment context) - Highest priority
2. **Character Consistency** (locked descriptions)
3. **Series Settings** (Sora style settings)
4. **Visual Assets** (reference images, color palettes)
5. **Relationships** (character dynamics)

### AI Services Files

| File | Purpose |
|------|---------|
| `agent-orchestrator.ts` | Main roundtable orchestration |
| `agent-orchestrator-stream.ts` | Streaming variant |
| `agent-prompts.ts` | Agent system prompts |
| `agent-types.ts` | TypeScript interfaces |
| `config.ts` | OpenAI configuration |
| `series-concept-agent.ts` | Concept dialogue agent |
| `screenplay-agent.ts` | Screenplay chat agent |
| `screenplay-context.ts` | Screenplay context building |
| `screenplay-to-prompt.ts` | Screenplay → Sora conversion |
| `episode-segmenter.ts` | Episode segmentation logic |
| `visual-state-extractor.ts` | Visual state extraction |
| `continuity-validator.ts` | Continuity validation |
| `vision-analysis.ts` | Image analysis with GPT-4V |
| `performance-analyzer.ts` | Performance insight generation |
| `cinematic-templates.ts` | Cinematic style templates |
| `ultra-detailed-prompt-template.ts` | Detailed prompt format |

---

## Database Schema

### Core Tables

```sql
-- User profiles (extends Supabase Auth)
profiles
├── id (uuid, PK, references auth.users)
├── email (text)
├── full_name (text)
├── subscription_tier (text)
├── usage_quota (jsonb)
├── usage_current (jsonb)
├── is_admin (boolean)
└── created_at, updated_at (timestamp)

-- Series (top-level content container)
series
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── name (text)
├── description (text)
├── genre (text)
├── visual_template (jsonb)
├── concept (jsonb)
├── total_episodes (integer)
└── created_at, updated_at (timestamp)

-- Characters in a series
series_characters
├── id (uuid, PK)
├── series_id (uuid, FK → series)
├── name (text)
├── role (text)
├── description (text)
├── visual_fingerprint (text)
├── voice_profile (text)
├── performance_style (text)
├── sora_prompt_template (text)
├── visual_reference_url (text)
└── created_at, updated_at (timestamp)

-- Visual cues for characters
visual_cues
├── id (uuid, PK)
├── character_id (uuid, FK → series_characters)
├── cue_type (text) -- appearance, costume, accessory, etc.
├── description (text)
├── image_url (text)
└── created_at (timestamp)

-- Settings/locations in a series
series_settings
├── id (uuid, PK)
├── series_id (uuid, FK → series)
├── name (text)
├── description (text)
├── environment_type (text)
├── atmosphere (text)
├── time_of_day (text)
├── is_primary (boolean)
└── created_at, updated_at (timestamp)

-- Character relationships
series_relationships
├── id (uuid, PK)
├── series_id (uuid, FK → series)
├── character_a_id (uuid, FK → series_characters)
├── character_b_id (uuid, FK → series_characters)
├── relationship_type (text)
├── description (text)
├── custom_label (text)
├── is_symmetric (boolean)
└── created_at (timestamp)

-- Visual assets (reference images, etc.)
visual_assets
├── id (uuid, PK)
├── series_id (uuid, FK → series)
├── name (text)
├── description (text)
├── asset_type (text) -- style_reference, color_palette, logo, etc.
├── file_name (text)
├── width, height (integer)
└── created_at (timestamp)

-- Sora generation settings
series_sora_settings
├── id (uuid, PK)
├── series_id (uuid, FK → series, unique)
├── sora_overall_tone (text)
├── sora_camera_style (text)
├── sora_lighting_mood (text)
├── sora_color_palette (text)
├── sora_narrative_prefix (text)
└── created_at, updated_at (timestamp)

-- Episodes within a series
episodes
├── id (uuid, PK)
├── series_id (uuid, FK → series)
├── user_id (uuid, FK → profiles)
├── title (text)
├── description (text)
├── episode_number (integer)
├── structured_screenplay (jsonb)
└── created_at, updated_at (timestamp)

-- Video segments (8-12 second chunks)
video_segments
├── id (uuid, PK)
├── episode_id (uuid, FK → episodes)
├── segment_number (integer)
├── scene_ids (text[], GIN indexed)
├── start_timestamp, end_timestamp (text)
├── estimated_duration (integer)
├── narrative_beat (text)
├── narrative_transition (text)
├── dialogue_lines (jsonb)
├── action_beats (text[])
├── characters_in_segment (text[], GIN indexed)
├── settings_in_segment (text[])
├── preceding_segment_id (uuid, FK → video_segments)
├── following_segment_id (uuid, FK → video_segments)
├── visual_continuity_notes (text)
├── final_visual_state (jsonb)
└── created_at (timestamp)

-- Segment generation groups
segment_groups
├── id (uuid, PK)
├── episode_id (uuid, FK → episodes)
├── user_id (uuid, FK → profiles)
├── series_id (uuid, FK → series)
├── title, description (text)
├── total_segments, completed_segments (integer)
├── status (text) -- planning, generating, partial, complete, error
├── generation_started_at, generation_completed_at (timestamp)
├── error_message (text)
├── estimated_cost, actual_cost (numeric)
└── created_at (timestamp)

-- Individual videos
videos
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── series_id (uuid, FK → series)
├── episode_id (uuid, FK → episodes)
├── segment_id (uuid, FK → video_segments)
├── segment_group_id (uuid, FK → segment_groups)
├── title (text)
├── user_brief (text)
├── platform (text)
├── agent_discussion (jsonb)
├── detailed_breakdown (jsonb)
├── optimized_prompt (text)
├── character_count (integer)
├── shot_list (jsonb)
├── sora_generation_id (text)
├── sora_status (text)
├── sora_video_url (text)
├── is_segment (boolean)
├── segment_order (integer)
└── created_at, updated_at (timestamp)

-- Video performance metrics
video_performance
├── id (uuid, PK)
├── video_id (uuid, FK → videos)
├── platform (text)
├── views, likes, shares, saves (integer)
├── comments (integer)
├── watch_time_seconds (integer)
├── traffic_source (text)
├── recorded_at (timestamp)
└── created_at (timestamp)

-- Hashtag tracking
hashtags
├── id (uuid, PK)
├── video_id (uuid, FK → videos)
├── tag (text)
├── volume_category (text)
├── performance_score (numeric)
└── created_at (timestamp)
```

### Row-Level Security

All tables have RLS policies ensuring users can only access their own data:

```sql
-- Example: Series access policy
CREATE POLICY "Users can access own series"
  ON series FOR ALL
  USING (user_id = auth.uid());

-- Cascade through relationships
CREATE POLICY "Users can access series characters"
  ON series_characters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = series_characters.series_id
      AND series.user_id = auth.uid()
    )
  );
```

---

## Key Patterns & Conventions

### API Route Pattern

```typescript
// app/api/[resource]/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Business logic here
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

### Component Pattern

```typescript
// components/feature/MyComponent.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

interface MyComponentProps {
  id: string
  onComplete?: () => void
}

export function MyComponent({ id, onComplete }: MyComponentProps) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => fetch(`/api/resource/${id}`).then(r => r.json()),
  })

  const mutation = useMutation({
    mutationFn: (data) => fetch(`/api/resource/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource'] })
      onComplete?.()
    },
  })

  if (isLoading) return <Skeleton />

  return (
    <div>
      {/* Component content */}
    </div>
  )
}
```

### Form Pattern with Zod

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  })

  const onSubmit = (data: FormValues) => {
    // Handle submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### Supabase Client Usage

```typescript
// Server Components / API Routes
import { createServerSupabaseClient } from '@/lib/supabase/server'

const supabase = await createServerSupabaseClient()
const { data } = await supabase.from('series').select('*')

// Client Components
import { createClientSupabaseClient } from '@/lib/supabase/client'

const supabase = createClientSupabaseClient()
const { data } = await supabase.from('series').select('*')
```

---

## Development Workflow

### Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Start development server
npm run dev

# Run tests (separate terminal)
npm run test
```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Jest watch mode |
| `npm run test:ci` | CI mode with coverage |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run Playwright tests |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:debug` | Debug E2E tests |

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Cron jobs
CRON_SECRET=your-cron-secret
```

### Branch Strategy

```bash
# Feature development
git checkout -b feature/descriptive-name
# ... develop ...
git commit -m "feat: add new feature"
git push origin feature/descriptive-name
# Create PR

# Bug fixes
git checkout -b fix/issue-description
# ... fix ...
git commit -m "fix: resolve issue"
git push origin fix/issue-description
```

### Testing Strategy

- **Unit Tests** (`__tests__/unit/`): Utility functions, hooks
- **Component Tests** (`__tests__/components/`): UI interactions
- **Integration Tests** (`__tests__/integration/`): API routes
- **E2E Tests** (`e2e/`): Critical user flows

---

## Key Documentation Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | Claude Code development configuration |
| `ARCHITECTURE.md` | Detailed system architecture |
| `PRD.md` | Product requirements document |
| `SETUP.md` | Initial setup guide |
| `TESTING.md` | Testing strategy |
| `COMMANDS.md` | CLI commands reference |
| `PROJECT_STATUS.md` | Current project status |
| `IMPLEMENTATION_WORKFLOW.md` | Development workflow |
| `ROADMAP-PHASE-4.md` | Future roadmap |

---

## Support Resources

### External Documentation

- [Next.js 16 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [OpenAI API Docs](https://platform.openai.com/docs)

### Project Memories (Serena)

Available memory files for context:
- `project_architecture_segments` - Segment system architecture
- `phase2_implementation_complete` - Context propagation system
- `project_database_schema_series_table` - Database schema details
- `project_patterns_oauth_subscription` - Auth patterns
- `phase3_implementation_plan` - UI component plans

---

**Document Version**: 1.0
**Generated**: January 3, 2026
**Maintained By**: Development Team via Claude Code
