# Database Schema Migration - January 28, 2025

## Overview

This document describes Phase 1 of the architecture restructuring: Database Schema Unification. The goal is to simplify the data model, create clear entity relationships, and ensure automatic series context flow to AI agents.

---

## Migration Sequence

Run migrations in this order:

1. `20250128000001-unify-episodes-table.sql` - Merge series_episodes into episodes
2. `20250128000002-update-videos-schema.sql` - Add is_standalone flag and auto-populate series_id
3. `20250128000003-cleanup-project-series-relationship.sql` - Remove series.project_id, use junction table only
4. `20250128000004-drop-series-episodes-table.sql` - Final cleanup, drop series_episodes table

---

## Schema Changes Summary

### 1. Episodes Table (UPDATED)

**NEW COLUMNS ADDED**:
```sql
story_beat TEXT                    -- Key story development
emotional_arc TEXT                 -- Emotional journey
continuity_breaks JSONB           -- Array of continuity break notes
custom_context JSONB              -- Custom metadata
characters_used TEXT[]            -- Character IDs in episode
settings_used TEXT[]              -- Setting IDs in episode
timeline_position INTEGER         -- Optional timeline ordering
is_key_episode BOOLEAN            -- Mark important episodes
```

**UNCHANGED COLUMNS**:
- id, series_id, user_id (foreign keys)
- season_number, episode_number, title, logline
- screenplay_text, structured_screenplay
- status, created_at, updated_at

**REMOVED**: None (additive changes only)

**NEW CONSTRAINTS**:
- Unique constraint on (series_id, season_number, episode_number) - already existed

**NEW INDEXES**:
- `idx_episodes_characters_used` (GIN index for array search)
- `idx_episodes_settings_used` (GIN index for array search)
- `idx_episodes_timeline_position`
- `idx_episodes_is_key_episode` (partial index WHERE is_key_episode = true)

---

### 2. Videos Table (UPDATED)

**NEW COLUMNS ADDED**:
```sql
is_standalone BOOLEAN DEFAULT false  -- Flag for standalone videos (not part of series)
```

**UNCHANGED COLUMNS**:
- id, user_id, project_id, series_id, episode_id, scene_id
- title, user_brief, agent_discussion, detailed_breakdown
- optimized_prompt, screenplay_enrichment_data
- character_count, sora_video_url, platform, status
- user_edits, created_at, updated_at

**REMOVED**: None

**NEW CONSTRAINTS**:
- `check_episode_videos_have_series`: If episode_id IS NOT NULL, series_id must NOT be NULL
- `check_standalone_videos_no_episode_series`: If is_standalone = true, both episode_id and series_id must be NULL

**NEW TRIGGERS**:
- `trigger_auto_populate_video_series_id`: Auto-populates series_id from episodes.series_id when episode_id is set

**NEW INDEXES**:
- `idx_videos_is_standalone` (partial index WHERE is_standalone = true)
- `idx_videos_episode_series` (composite index on episode_id, series_id WHERE episode_id IS NOT NULL)
- `idx_videos_series_created` (composite index on series_id, created_at DESC WHERE series_id IS NOT NULL)

**NEW VIEWS**:
- `videos_with_context`: Joins videos with episode, series, and project information, includes computed `video_type` column

**NEW FUNCTIONS**:
- `auto_populate_video_series_id()`: Trigger function to auto-populate series_id
- `video_has_series_context(video_id UUID)`: Returns boolean indicating if video has full series context

---

### 3. Series Table (UPDATED)

**REMOVED COLUMNS**:
```sql
project_id UUID  -- Removed, use project_series junction table instead
```

**UNCHANGED COLUMNS**: All other columns remain the same

**DATA MIGRATION**: All existing series.project_id relationships migrated to project_series junction table before removal

---

### 4. Projects Table (UPDATED)

**REMOVED COLUMNS**:
```sql
default_series_id UUID  -- Removed circular reference
```

**UNCHANGED COLUMNS**: All other columns remain the same

---

### 5. Project_Series Table (UPDATED)

**NEW COLUMNS ADDED**:
```sql
display_order INTEGER DEFAULT 0  -- Order series within project
```

**UNCHANGED COLUMNS**:
- id, project_id, series_id, created_at

**NEW TRIGGERS**:
- `trigger_auto_increment_series_display_order`: Auto-increments display_order for new series in project

**NEW INDEXES**:
- `idx_project_series_project_order` (composite on project_id, display_order)
- `idx_project_series_series_id`

**NEW VIEWS**:
- `projects_with_series`: Projects with aggregated series array (ordered by display_order)
- `series_with_projects`: Series with aggregated projects array and project_count

**NEW FUNCTIONS**:
- `associate_series_with_project(p_project_id, p_series_id, p_display_order)`: Helper function
- `remove_series_from_project(p_project_id, p_series_id)`: Helper function

---

### 6. Series_Episodes Table (DROPPED)

**STATUS**: Completely removed after data migration

**BACKUP**: Backup table `series_episodes_backup` created before deletion for disaster recovery

**DATA MIGRATED TO**: `episodes` table (all metadata preserved)

---

## TypeScript Type Changes

### Updated: `Database.public.Tables.episodes.Row`

```typescript
episodes: {
  Row: {
    id: string
    series_id: string                      // NOT NULL
    user_id: string                        // NOT NULL
    season_number: number
    episode_number: number
    title: string
    logline: string | null
    screenplay_text: string | null
    structured_screenplay: Json | null
    status: 'concept' | 'draft' | 'in-progress' | 'complete'
    current_session_id: string | null

    // NEW FIELDS (migrated from series_episodes)
    story_beat: string | null
    emotional_arc: string | null
    continuity_breaks: Json                // JSONB array
    custom_context: Json                   // JSONB object
    characters_used: string[]              // TEXT[] array
    settings_used: string[]                // TEXT[] array
    timeline_position: number | null
    is_key_episode: boolean

    created_at: string
    updated_at: string
  }
  Insert: {
    // ... same fields, most optional except series_id, user_id, season_number, episode_number, title
  }
  Update: {
    // ... all fields optional
  }
}
```

### Updated: `Database.public.Tables.videos.Row`

```typescript
videos: {
  Row: {
    id: string
    user_id: string
    project_id: string | null              // Optional portfolio organization
    series_id: string | null               // Auto-populated from episode.series_id
    episode_id: string | null              // Primary link to episode
    scene_id: string | null                // Optional scene reference
    is_standalone: boolean                 // NEW: true if standalone video

    // ... all other fields unchanged
    title: string
    user_brief: string
    agent_discussion: AgentDiscussion
    detailed_breakdown: DetailedBreakdown
    optimized_prompt: string
    screenplay_enrichment_data: ScreenplayEnrichmentData | null
    character_count: number
    sora_video_url: string | null
    platform: 'tiktok' | 'instagram' | 'both' | null
    status: 'draft' | 'generated' | 'published'
    user_edits: UserEdits | null
    created_at: string
    updated_at: string
  }
  Insert: {
    // ... same fields, is_standalone defaults to false
  }
  Update: {
    // ... all fields optional
  }
}
```

### Updated: `Database.public.Tables.series.Row`

```typescript
series: {
  Row: {
    id: string
    user_id: string
    // REMOVED: project_id
    name: string
    description: string | null
    genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
    visual_template: VisualTemplate
    enforce_continuity: boolean
    allow_continuity_breaks: boolean
    sora_camera_style: string | null
    sora_lighting_mood: string | null
    sora_color_palette: string | null
    sora_overall_tone: string | null
    sora_narrative_prefix: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    // ... same fields without project_id
  }
  Update: {
    // ... all fields optional
  }
}
```

### Updated: `Database.public.Tables.projects.Row`

```typescript
projects: {
  Row: {
    id: string
    user_id: string
    name: string
    description: string | null
    // REMOVED: default_series_id
    created_at: string
    updated_at: string
  }
  Insert: {
    // ... same fields without default_series_id
  }
  Update: {
    // ... all fields optional
  }
}
```

### Updated: `Database.public.Tables.project_series.Row`

```typescript
project_series: {
  Row: {
    id: string
    project_id: string                     // NOT NULL
    series_id: string                      // NOT NULL
    display_order: number                  // NEW: defaults to 0
    created_at: string
  }
  Insert: {
    id?: string
    project_id: string
    series_id: string
    display_order?: number
    created_at?: string
  }
  Update: {
    id?: string
    project_id?: string
    series_id?: string
    display_order?: number
    created_at?: string
  }
}
```

### REMOVED: `Database.public.Tables.series_episodes`

This table type should be completely removed from the TypeScript definitions.

---

## Data Flow After Migration

### Episode-Based Video Creation:
```
1. User creates series (with characters, settings, Sora settings)
2. User creates episode within series (screenplay)
3. User generates video from episode/scene
4. Backend:
   - Receives episode_id in request
   - Auto-fetches series_id from episodes table
   - Auto-fetches ALL series context (characters, settings, assets, relationships, Sora settings)
   - Passes complete context to AI agents
   - Saves video with episode_id and auto-populated series_id
```

### Standalone Video Creation:
```
1. User creates standalone video (is_standalone = true)
2. No episode or series context
3. Agents receive only user brief
4. Video saved with is_standalone = true, null episode_id, null series_id
```

### Project Portfolio Organization:
```
1. User creates project
2. User associates existing series with project (via project_series junction)
3. Projects act as portfolio containers
4. Series can belong to multiple projects
5. Videos linked to series appear in all projects containing that series
```

---

## Rollback Strategy

If migration needs to be rolled back:

1. Restore `series_episodes` table from `series_episodes_backup`
2. Restore `series.project_id` column and populate from `project_series`
3. Restore `projects.default_series_id` column
4. Remove new columns from `episodes` table
5. Remove `is_standalone` from `videos` table
6. Drop new triggers, views, and functions

**Rollback SQL available in**: `supabase-migrations/rollback-20250128-schema-changes.sql` (to be created)

---

## Testing Checklist

After running migrations:

- [ ] Verify all series_episodes data migrated to episodes
- [ ] Verify videos.series_id auto-populated correctly
- [ ] Verify project_series relationships preserved
- [ ] Test episode-based video creation (context auto-flow)
- [ ] Test standalone video creation
- [ ] Test project-series association/removal
- [ ] Verify all foreign key constraints valid
- [ ] Verify all indexes created successfully
- [ ] Run application integration tests
- [ ] Verify agent roundtable receives full context

---

## Impact Summary

**Tables Modified**: 5 (projects, series, episodes, videos, project_series)
**Tables Dropped**: 1 (series_episodes)
**New Triggers**: 2
**New Views**: 3
**New Functions**: 4
**Breaking Changes**: Yes (series_episodes table removed, API changes required)
**Data Loss**: None (all data migrated)
**Reversible**: Yes (with rollback script)

---

## Next Steps (Phase 2)

After database migration complete:

1. Update API routes to use new schema
2. Update UI components for new navigation structure
3. Implement automatic series context passing
4. Update agent orchestrator for guaranteed context flow
5. Create new episode → video generation flow
6. Consolidate redundant UI pages
7. Update documentation and user guides
