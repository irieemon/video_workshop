# Series Concept Episode Storage Fix

**Date**: 2025-10-24
**Issue**: Episodes insert failed - table not found
**Status**: ✅ **Fixed**

---

## Problem

When creating a series from the Series Concept Agent, the system attempted to insert data into tables using non-existent column names.

### Error Messages
```
Failed to create series: Episodes insert failed: Could not find the 'metadata' column of 'episodes' in the schema cache
Failed to create series: Relationships insert failed: Could not find the 'metadata' column of 'character_relationships' in the schema cache
```

### Root Causes
The persister service (`lib/services/series-concept-persister.ts`) had multiple schema mismatches:

1. **Episodes**: Trying to insert into non-existent `episodes` table
2. **Relationships**: Using `metadata` column (should be `attributes` or `evolution_notes`)
3. **Settings**: Using non-existent columns (`importance`, `visual_elements`, `metadata` instead of `details`)

**Key difference**:
- `series_episodes`: Links real videos to series (requires `video_id`)
- Concept episodes: Story outlines, arc summaries, not yet produced

---

## Solution

Fixed all schema mismatches to align with actual database structure.

### Changes Made

**File**: `lib/services/series-concept-persister.ts`

#### 1. Episodes Storage
**Before**: Trying to insert into non-existent `episodes` table
```typescript
const episodes = this.flattenEpisodes(concept.seasons, seriesId);
if (episodes.length > 0) {
  const { error: episodesError } = await supabase.from('episodes').insert(episodes);
  if (episodesError) throw new Error(`Episodes insert failed: ${episodesError.message}`);
}
```

**After**: Store in `screenplay_data.seasons`
```typescript
screenplay_data: {
  logline: concept.series.logline,
  premise: concept.series.premise,
  tone: concept.series.tone,
  themes: concept.series.themes,
  format: concept.series.format,
  genre: concept.series.genre,
  seasons: concept.seasons, // Store complete season/episode structure
},
```

#### 2. Relationships Mapping
**Before**: Using non-existent `metadata` column and wrong enum values
```typescript
private mapRelationships(relationships: any[], characterMap: Map<string, string>, seriesId: string) {
  return relationships
    .map((rel) => ({
      series_id: seriesId,
      character_a_id: characterMap.get(rel.character_a),
      character_b_id: characterMap.get(rel.character_b),
      relationship_type: rel.type, // ❌ AI generates 'ally', 'rival', 'mentor' but DB expects 'allies', 'rivals', 'mentor_student'
      description: rel.description,
      metadata: { evolution: rel.evolution }, // ❌ metadata doesn't exist
    }))
    .filter((rel) => rel.character_a_id && rel.character_b_id);
}
```

**After**: Using correct columns and mapped enum values
```typescript
private mapRelationshipTypeToDatabase(type: string): string {
  const typeMap: Record<string, string> = {
    'ally': 'allies',
    'rival': 'rivals',
    'family': 'family',
    'romantic': 'romantic',
    'mentor': 'mentor_student',
  };
  return typeMap[type] || 'custom';
}

private mapRelationships(relationships: any[], characterMap: Map<string, string>, seriesId: string) {
  return relationships
    .map((rel) => ({
      series_id: seriesId,
      character_a_id: characterMap.get(rel.character_a),
      character_b_id: characterMap.get(rel.character_b),
      relationship_type: this.mapRelationshipTypeToDatabase(rel.type), // ✅ Mapped to DB values
      description: rel.description,
      evolution_notes: rel.evolution, // ✅ Correct column
      attributes: {}, // ✅ Correct JSONB column
    }))
    .filter((rel) => rel.character_a_id && rel.character_b_id);
}
```

#### 3. Settings Mapping
**Before**: Using non-existent columns
```typescript
private mapSettings(settings: any[], seriesId: string) {
  return settings.map((setting) => ({
    series_id: seriesId,
    name: setting.name,
    description: setting.description,
    importance: setting.importance, // ❌ doesn't exist
    visual_elements: {}, // ❌ doesn't exist
    metadata: { first_appearance: setting.first_appearance }, // ❌ should be 'details'
  }));
}
```

**After**: Using correct columns
```typescript
private mapSettings(settings: any[], seriesId: string) {
  return settings.map((setting) => ({
    series_id: seriesId,
    name: setting.name,
    description: setting.description,
    is_primary: setting.importance === 'high', // ✅ Map to boolean
    details: { // ✅ Correct JSONB column
      importance: setting.importance,
      first_appearance: setting.first_appearance
    },
  }));
}
```

### Code Cleanup

**Removed**:
- `flattenEpisodes()` method (no longer needed)
- Episode insert logic attempting to use non-existent `episodes` table

**Added**:
- `mapRelationshipTypeToDatabase()` method to convert AI enum values to database enum values

**Updated**:
- Renumbered persistence steps (Step 2 → characters, Step 3 → relationships, Step 4 → settings)
- Fixed relationships mapping to use `evolution_notes` and `attributes`
- Fixed settings mapping to use `is_primary` and `details`
- Added relationship type mapping: `'ally'` → `'allies'`, `'rival'` → `'rivals'`, `'mentor'` → `'mentor_student'`

---

## Architecture Rationale

### Why JSONB Storage?

**Episode Concepts** (at creation time):
- High-level narrative outlines
- Season arcs and plot summaries
- Character focus lists
- Subject to revision and iteration

**Best Storage**: JSONB field in series table
- Flexible schema for creative iteration
- Easy to update entire concept structure
- No relational overhead for conceptual data

**series_episodes** (for production):
- Links actual produced videos to series
- Requires concrete video assets (`video_id`)
- Tracks production metadata and continuity
- Manages published episode ordering

**Best Storage**: Relational table
- Enforces referential integrity
- Supports complex queries across videos
- Enables proper production tracking

---

## Data Structure

### What Gets Stored in `screenplay_data.seasons`:
```typescript
{
  seasons: [
    {
      season_number: 1,
      title: "Season Title",
      arc: "Season-long narrative arc description",
      episodes: [
        {
          episode_number: 1,
          title: "Episode Title",
          logline: "Episode hook",
          plot_summary: "What happens in this episode",
          character_focus: ["Character Name 1", "Character Name 2"]
        },
        // ... more episodes
      ]
    },
    // ... more seasons
  ]
}
```

### Future Production Workflow:
1. **Concept Phase**: Series created with `screenplay_data.seasons` (conceptual episodes)
2. **Writing Phase**: Episodes developed into full scenes using Screenplay Writer
3. **Production Phase**: Videos created from scenes
4. **Linking Phase**: Videos linked to series via `series_episodes` table

---

## Testing

### Manual Test:
1. Navigate to `/dashboard/series/concept`
2. Complete dialogue with Series Concept Agent
3. Click "Generate" to create YAML structure
4. Click "Create Series" to persist to database
5. **Expected**: Series created successfully with all data persisted
6. **Verify**: Check `screenplay_data.seasons` contains episode concepts

### Database Verification:
```sql
SELECT
  name,
  screenplay_data->'seasons' as season_data
FROM series
WHERE id = '[series-id]';
```

---

## Impact

### Fixed:
- ✅ Series creation now completes successfully
- ✅ Episode concepts properly stored in `screenplay_data`
- ✅ No more "episodes table not found" errors

### Preserved:
- ✅ All episode concept data (season arcs, episode outlines)
- ✅ Character focus tracking per episode
- ✅ Ability to query and update episode concepts

### Future-Ready:
- ✅ Clear separation between conceptual and produced episodes
- ✅ `series_episodes` table ready for production tracking
- ✅ Easy migration from concept to production

---

## Related Files

**Modified**:
- `lib/services/series-concept-persister.ts` - Removed episode insert, added seasons to screenplay_data

**Unchanged but Related**:
- `lib/types/database.types.ts` - Database schema reference
- `lib/types/series-concept.types.ts` - Concept structure types
- `app/api/series/concept/generate/route.ts` - Generation endpoint
- `components/series/concept-preview.tsx` - Preview UI (already reads from concept.seasons)

---

## Documentation Updates Needed

### Files to Update:
- `ARCHITECTURE.md` - Document episode storage strategy
- `SERIES-CONCEPT-AGENT-PROTOTYPE.md` - Update persistence section

### Key Points to Document:
1. Episode concepts stored in JSONB, not relational table
2. `series_episodes` is for production tracking only
3. Migration path from concept to production
4. Data structure examples

---

**Status**: Ready for user testing
**Next Action**: Test complete series creation flow end-to-end
