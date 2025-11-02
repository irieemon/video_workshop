# Database Schema: Series Table

## Important Column Names

### Series Table Columns
The `series` table uses the following column structure:

**Core Fields:**
- `id` (uuid) - Primary key
- `name` (text) - **NOT `title`** - Series name/identifier
- `description` (text) - Series description
- `user_id` (uuid) - Owner reference

**Visual Template Fields:**
- `visual_template` (jsonb) - Visual style template

**Sora Configuration Fields:**
- `sora_camera_style` (text) - Camera movement and framing preferences
- `sora_lighting_mood` (text) - Lighting and mood specifications
- `sora_color_palette` (text) - Color grading preferences
- `sora_overall_tone` (text) - Overall tone and atmosphere
- `sora_narrative_prefix` (text) - Narrative context prefix for prompts

## Common Mistake
❌ Using `series.title` in queries - this column does NOT exist
✅ Use `series.name` instead

## Related Tables
- `series_characters` - Character definitions for the series
- `series_settings` - Location/setting definitions
- `series_visual_assets` - Reference images and visual guides
- `character_relationships` - Character relationship graph
- `episodes` - Episodes within the series
- `video_segments` - Individual video segments from episodes

## Query Pattern Example
```typescript
const { data: series } = await supabase
  .from('series')
  .select(`
    id,
    name,              // ✅ Correct
    description,
    visual_template,
    sora_camera_style,
    sora_lighting_mood,
    sora_color_palette,
    sora_overall_tone,
    sora_narrative_prefix
  `)
  .eq('id', seriesId)
  .single()
```

## Files Using Series Queries
- `/app/api/segments/generate-prompt/route.ts` - Fetches series context for prompt generation
- (Add other files as discovered)
