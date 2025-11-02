# Multi-Segment Video Generation Architecture

## Feature Overview
Allows users to automatically split episodes into 8-12 second segments and generate videos sequentially with visual continuity propagation between segments.

## Database Schema

### video_segments
```sql
- id (uuid, primary key)
- episode_id (references episodes)
- segment_number (integer, 1-based)
- scene_ids (text[], GIN indexed)
- start_timestamp, end_timestamp, estimated_duration
- narrative_beat (text) - Auto-generated segment description
- narrative_transition (text) - Transition from previous segment
- dialogue_lines (jsonb) - Structured dialogue with character names
- action_beats (text[]) - Action descriptions
- characters_in_segment (text[], GIN indexed)
- settings_in_segment (text[])
- preceding_segment_id (references video_segments) - Linked list structure
- following_segment_id (references video_segments) - Linked list structure
- visual_continuity_notes (text) - Static notes from segmentation
- final_visual_state (jsonb) - Dynamic state extracted from generated prompt
```

### segment_groups
```sql
- id (uuid, primary key)
- episode_id (references episodes)
- user_id, series_id
- title, description
- total_segments (integer)
- completed_segments (integer)
- status (enum: planning, generating, partial, complete, error)
- generation_started_at, generation_completed_at
- error_message (text)
- estimated_cost, actual_cost (numeric)
```

### videos (modified)
```sql
Added columns:
- segment_id (references video_segments)
- is_segment (boolean, default false)
- segment_group_id (references segment_groups)
- segment_order (integer, 1-based)
```

## API Endpoints

### Episode Segmentation
- `POST /api/episodes/[id]/create-segments` - Parse episode into segments
- `GET /api/episodes/[id]/segments` - Fetch all segments with optional video data

### Segment Management
- `GET /api/segment-groups/[id]` - Get group with progress
- `PATCH /api/segment-groups/[id]` - Update status/cost
- `DELETE /api/segment-groups/[id]` - Delete with cascade options

### Video Generation
- `POST /api/segments/[id]/generate-video` - Generate single segment with context
- `POST /api/segment-groups/[id]/generate-batch` - Batch generation with anchor points

## Key Algorithms

### Segmentation Algorithm (lib/ai/episode-segmenter.ts)
```typescript
function segmentEpisode(episode, options)
Inputs:
  - Episode with structured_screenplay (scenes, dialogue, action)
  - target_duration: 10s, min: 8s, max: 12s
  - prefer_scene_boundaries: true

Process:
  1. Estimate duration: dialogue (2.5 words/sec), action (2s fixed)
  2. Find natural break points (scene boundaries, dialogue exchanges)
  3. Split long scenes at transitions
  4. Generate narrative beats and transitions
  5. Link segments in continuity chain (preceding/following IDs)

Output: Array of VideoSegmentData with continuity chain
```

### Visual State Extraction (lib/ai/visual-state-extractor.ts)
```typescript
async function extractVisualState(optimizedPrompt, options)
Uses: GPT-4o-mini, JSON format, temperature 0.3

Extracts:
  - final_frame_description
  - character_positions (Record<string, string>)
  - lighting_state
  - camera_position
  - mood_atmosphere
  - key_visual_elements (string[])

Returns: SegmentVisualState object
```

### Continuity Validation (lib/ai/continuity-validator.ts)
```typescript
async function validateContinuity(previousState, currentContext, options)

Validates:
  - Character positions (missing chars = high, incompatible moves = medium)
  - Lighting (dramatic changes = high, minor shifts = low)
  - Camera (jarring jumps = medium)
  - Mood (opposing moods = medium)

Returns: ContinuityValidationResult with:
  - isValid (score ≥ 75 normal, ≥ 90 strict)
  - issues (ContinuityIssue[])
  - overallScore (0-100)
  - autoCorrection (optional string)
```

### Anchor Point Refresh
```typescript
Purpose: Prevent context drift in long chains
Interval: Every 3-4 segments (configurable)
Strategy: mergeVisualStates(recentStates)
  - Use most recent as base
  - Merge character positions
  - Deduplicate key visual elements
  - Reset anchor point states array
```

## Integration with Agent Roundtable

### Enhanced callAgent() Flow
```
1. Build base user message with brief + platform
2. IF segmentContext exists:
   - buildContinuityContext(segmentContext) → formatted string
   - Inject as FIRST context (highest priority)
3. Inject character context
4. Inject series settings, visual assets, relationships
5. Call OpenAI with complete context
```

### Context Priority Order
1. Visual Continuity (from previous segment) - HIGHEST
2. Character Consistency (locked descriptions)
3. Series Settings (Sora style settings)
4. Visual Assets (reference images, color palettes)

## Data Flow

### Single Segment Generation
```
User Request
  ↓
Fetch segment + episode + series context
  ↓
IF has preceding_segment_id:
  Fetch final_visual_state → Validate continuity
  ↓
Build segment brief (dialogue + action + continuity notes)
  ↓
runAgentRoundtable(segmentContext: visualState)
  ↓
Create video record
  ↓
extractVisualState(optimizedPrompt) → Save to segment
  ↓
Update segment_group.completed_segments
```

### Batch Generation
```
User Request (segment group)
  ↓
Fetch all segments (ordered by segment_number)
  ↓
Fetch series context ONCE
  ↓
FOR EACH segment:
  ↓
  Check if anchor point (N % interval === 0)
    IF yes: currentVisualState = mergeVisualStates(recent)
  ↓
  Validate continuity if currentVisualState exists
  ↓
  Generate with context propagation
  ↓
  Extract visual state → Set as current
  ↓
  Add to anchor point states
  ↓
  Update progress
  ↓
END FOR
  ↓
Generate continuity report (scores, issues by type/severity)
```

## File Locations

### Core Implementation
- `lib/ai/episode-segmenter.ts` - Segmentation algorithm
- `lib/ai/visual-state-extractor.ts` - State extraction + context building
- `lib/ai/continuity-validator.ts` - Validation + auto-correction
- `lib/ai/agent-orchestrator.ts` - Enhanced with segment context

### API Routes
- `app/api/episodes/[id]/create-segments/route.ts`
- `app/api/episodes/[id]/segments/route.ts`
- `app/api/segment-groups/[id]/route.ts`
- `app/api/segments/[id]/generate-video/route.ts`
- `app/api/segment-groups/[id]/generate-batch/route.ts`

### Database Migrations
- `supabase/migrations/20251031_video_segments_table.sql`
- `supabase/migrations/20251031_segment_groups_table.sql`
- `supabase/migrations/20251031_add_segment_fields_to_videos.sql`

### Documentation
- `claudedocs/PHASE1-MULTI-SEGMENT-COMPLETE.md`
- `claudedocs/PHASE2-CONTEXT-PROPAGATION-COMPLETE.md`

## Future Enhancements (Phase 3)
- UI components for segment management
- Batch generation progress tracking UI
- Continuity report visualization
- Manual visual state editing
- Real-time progress updates
- Segment preview before generation
