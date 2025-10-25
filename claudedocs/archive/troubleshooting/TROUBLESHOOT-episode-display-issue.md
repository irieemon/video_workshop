# Troubleshooting: Episode Display Issue

**Date**: 2025-10-24
**Issue**: Series created but episodes not displaying
**Status**: ✅ **Fixed**

---

## Problem Analysis

### User Report
"It created the series but did not load the episodes, it did create the characters and somewhat of a relationship mapping"

### Root Cause
**Architecture Mismatch** between episode storage and display logic.

**Episode Storage**: Series Concept Agent stores episode concepts in `series.screenplay_data.seasons` (JSONB field)

**Episode Display**: Series detail page uses `EpisodeManager` component which queries screenplay episodes from a database table

**Result**: Page showed "No episodes yet" because it was looking for screenplay episodes in a table, not concept episodes in JSONB.

---

## Investigation Process

### Step 1: Examine Series Detail Page
```typescript
// app/dashboard/series/[seriesId]/page.tsx:99
<EpisodeManager
  seriesId={seriesId}
  seriesName={series.name}
/>
```

### Step 2: Check EpisodeManager Component
```typescript
// components/screenplay/episode-manager.tsx:47
const loadEpisodes = async () => {
  const response = await fetch(`/api/screenplay/episodes?seriesId=${seriesId}`)
  // Queries screenplay episodes table
}
```

### Step 3: Confirm Data Structure
**Concept Episodes** (in `screenplay_data.seasons`):
- High-level outlines from AI
- Season arcs and episode summaries
- Character focus lists
- Loglines and plot summaries

**Screenplay Episodes** (in database table):
- Detailed scene-by-scene structures
- Act breakdowns
- Story beats
- Character development notes

**Conclusion**: Two different episode systems serving different purposes.

---

## Solution

### Created ConceptEpisodesDisplay Component
New component to display episode concepts from `screenplay_data.seasons`.

**File**: `components/series/concept-episodes-display.tsx`

**Features**:
- ✅ Displays seasons with episode lists
- ✅ Shows episode numbers, titles, loglines
- ✅ Displays plot summaries
- ✅ Shows character focus badges
- ✅ Season arc descriptions
- ✅ Helpful note explaining these are concepts

**UI Structure**:
```
┌─ Season Header ──────────────────┐
│ Season 1: "Season Title"         │
│ Arc description...               │
├─ Episodes ───────────────────────┤
│ [E1] Episode Title               │
│ "Logline..."                     │
│ Plot summary...                  │
│ Focus: [Character] [Character]   │
│                                  │
│ [E2] Episode Title               │
│ ...                              │
└──────────────────────────────────┘
```

### Updated Series Detail Page
**File**: `app/dashboard/series/[seriesId]/page.tsx`

**Changes**:
```typescript
// Added import
import { ConceptEpisodesDisplay } from '@/components/series'

// Added conditional display
{series.screenplay_data?.seasons && (
  <>
    <ConceptEpisodesDisplay seasons={series.screenplay_data.seasons} />
    <Separator />
  </>
)}

// Kept existing EpisodeManager for screenplay episodes
<EpisodeManager
  seriesId={seriesId}
  seriesName={series.name}
/>
```

**Result**: Series detail page now shows both:
1. **Concept Episodes** (if they exist in screenplay_data)
2. **Screenplay Episodes** (developed episodes in database)

---

## Architecture Design

### Episode Lifecycle

**Phase 1: Concept** (Series Concept Agent)
- Generate high-level episode outlines
- Store in `screenplay_data.seasons` JSONB
- Display with `ConceptEpisodesDisplay`
- Quick creative ideation

**Phase 2: Development** (Screenplay Writer)
- User selects concept episode to develop
- Create detailed scene-by-scene breakdown
- Store in screenplay episodes table
- Display with `EpisodeManager`

**Phase 3: Production** (Video Generation)
- Generate videos from scenes
- Link videos to series via `series_episodes`
- Track production metadata

### Data Flow
```
Series Concept Agent
        ↓
  screenplay_data.seasons (JSONB)
        ↓
  ConceptEpisodesDisplay ← You are here
        ↓
  [User develops episode]
        ↓
  screenplay episodes table
        ↓
  EpisodeManager (scene editing)
        ↓
  Video generation
        ↓
  series_episodes (production tracking)
```

---

## Testing

### Manual Test
1. Navigate to series detail page after creating series via Concept Agent
2. **Expected**: "Episode Concepts" card appears above "Episodes" section
3. **Expected**: Seasons listed with episode summaries
4. **Expected**: Character focus badges shown for each episode
5. **Expected**: Note explaining these are concepts

### Verification
```sql
SELECT
  name,
  jsonb_pretty(screenplay_data->'seasons') as seasons
FROM series
WHERE id = '[series-id]';
```

Should show complete season/episode structure in JSONB format.

---

## Impact

### Fixed
✅ Episode concepts now display on series detail page
✅ Season arcs visible with episode breakdowns
✅ Character focus tracked per episode
✅ Clear distinction between concepts and developed episodes

### User Experience
**Before**: User creates series via Concept Agent → sees "No episodes yet"
**After**: User creates series via Concept Agent → sees complete episode concept structure

### Future Development Path
1. ✅ **Concept Phase**: Series Concept Agent generates outlines (done)
2. ✅ **Display Phase**: ConceptEpisodesDisplay shows outlines (done)
3. 🔄 **Development Phase**: "Develop Episode" button to create screenplay episodes (future)
4. 📋 **Production Phase**: Video generation from developed episodes (future)

---

## Related Issues

### Relationship Display Issue
User reported "somewhat of a relationship mapping" - relationships may not be displaying correctly.

**Potential Causes**:
1. RelationshipManager component rendering but with incomplete data
2. Relationship type mapping working but other fields missing
3. UI rendering relationships but not in expected format

**Next Investigation**:
Check RelationshipManager component and relationship API to ensure:
- All relationships from concept are displayed
- Character names correctly mapped to IDs
- Relationship descriptions showing
- Evolution notes preserved

---

## Files Modified

**Created**:
- `components/series/concept-episodes-display.tsx` - New display component

**Updated**:
- `components/series/index.ts` - Export ConceptEpisodesDisplay
- `app/dashboard/series/[seriesId]/page.tsx` - Added concept episodes display

---

## Lessons Learned

### System Design
1. **Dual-Purpose Data**: Same concept (episodes) exists in two forms for different purposes
2. **Progressive Enhancement**: Start with concepts, develop into detailed structures
3. **JSONB Flexibility**: Perfect for creative concepts subject to change

### Development Process
1. **Check Full Path**: Don't just verify data persisted, check how it's retrieved and displayed
2. **UI/Data Mismatch**: Component expecting data from one source while data in another
3. **Documentation**: Clear lifecycle documentation prevents confusion

### Code Quality
1. **Single Responsibility**: Each component serves one episode system
2. **Conditional Rendering**: Show appropriate UI based on data availability
3. **User Guidance**: Notes explaining what data represents and next steps

---

**Status**: Episode display working, ready for user testing
**Next**: Investigate relationship display issue
