# Episode-to-Video Workflow Enhancement

**Date**: 2025-10-25
**Type**: UX Enhancement
**Status**: ✅ Complete

## Overview

Modified the episode selection workflow to support proper AI roundtable evaluation instead of automatic prompt conversion. When users select an episode, the system now auto-fills form data without bypassing the collaborative AI process.

## Problem Statement

**Previous Behavior**:
- User selects episode from dropdown
- System converts screenplay to Sora prompt automatically
- Brief field auto-populated with converted prompt
- User bypasses AI roundtable discussion entirely

**Issue**: This workflow skipped the valuable multi-agent collaboration process and provided users with a raw converted prompt instead of a properly evaluated, optimized prompt from the AI film crew.

## Solution Implemented

**New Behavior**:
1. User selects episode from dropdown
2. System auto-loads episode data (characters, settings, synopsis)
3. Brief field auto-filled with **episode synopsis/logline** (NOT converted prompt)
4. Characters and settings pre-selected based on episode
5. User clicks "Start Roundtable" for full AI evaluation
6. AI agents collaborate to create optimized prompt from episode context

## Changes Made

### 1. Component: `components/videos/episode-selector.tsx`

**Removed**:
- `convertedPrompt` state variable
- `converting` state variable
- `handleConvertEpisode` function
- "Convert to Video Prompt" button
- Converted prompt display section

**Added**:
- `loadingData` state for data fetch indicator
- `handleEpisodeChange` function (auto-loads on selection)
- Loading indicator during data fetch
- Success indicator showing what was auto-filled

**Modified**:
```typescript
// OLD: Manual conversion with button
const handleConvertEpisode = async (episodeId: string) => {
  // Convert screenplay to prompt via API
  // Display converted prompt
}

// NEW: Auto-load episode data on selection
const handleEpisodeChange = async (episodeId: string | null) => {
  // Fetch episode data immediately
  // Pass synopsis/logline as brief (NOT converted prompt)
  onEpisodeDataLoaded({
    ...fullData,
    brief: fullData.episode.synopsis || fullData.episode.logline || ...
  })
}
```

### 2. Parent Component: `app/dashboard/projects/[id]/videos/new/page.tsx`

**Modified** `onEpisodeDataLoaded` callback:
```typescript
// OLD: Used convertedPrompt
onEpisodeDataLoaded={(data) => {
  if (data) {
    setBrief(data.convertedPrompt)  // ❌ Bypassed roundtable
    setSelectedCharacters(data.suggestedCharacters)
    setSelectedSettings(data.suggestedSettings)
  }
}}

// NEW: Uses episode synopsis/logline
onEpisodeDataLoaded={(data) => {
  if (data) {
    setBrief(data.brief || '')  // ✅ Natural description for roundtable
    setSelectedCharacters(data.suggestedCharacters || [])
    setSelectedSettings(data.suggestedSettings || [])
  } else {
    // Clear when deselected
    setBrief('')
    setSelectedCharacters([])
    setSelectedSettings([])
  }
}}
```

### 3. TypeScript Interface Update

**Modified** `EpisodeData` interface:
```typescript
export interface EpisodeData {
  episode: { /* ... */ }
  series: { /* ... */ }
  characters: any[]
  settings: any[]
  suggestedCharacters: string[]
  suggestedSettings: string[]
  brief: string  // NEW: Episode synopsis/logline (not converted prompt)
  // REMOVED: convertedPrompt: string
}
```

## User Experience Flow

### Before (Problematic)
```
1. Select episode dropdown
2. Click "Convert to Video Prompt" button
3. Wait for conversion (~12 seconds)
4. See converted prompt in brief field
5. Click "Start Roundtable" (optional, often skipped)
```

### After (Improved)
```
1. Select episode dropdown
2. ✨ Auto-loads episode data immediately
3. See episode synopsis in brief field
4. See characters/settings pre-selected
5. Click "Start Roundtable" ← REQUIRED for optimization
6. AI agents evaluate and optimize the prompt
```

## Benefits

✅ **Preserves AI Roundtable Value**: Users must go through collaborative evaluation
✅ **Better User Experience**: Immediate feedback, no manual conversion step
✅ **Clearer Intent**: Synopsis/logline is natural input for AI evaluation
✅ **Maintains Quality**: All prompts go through proper optimization
✅ **Faster Workflow**: Auto-load vs manual button click

## Technical Notes

### Data Flow
```
Episode Selection
    ↓
Auto-fetch /api/episodes/[id]/full-data
    ↓
Extract synopsis/logline → brief field
Extract characters → pre-select in form
Extract settings → pre-select in form
    ↓
User reviews/edits brief
    ↓
Click "Start Roundtable"
    ↓
AI agents optimize prompt with context
```

### API Endpoints Used
- `GET /api/episodes?seriesId={id}` - List episodes
- `GET /api/episodes/{id}/full-data` - Get episode with characters/settings
- ~~`POST /api/episodes/{id}/convert-to-prompt`~~ - NO LONGER USED in this flow

### Files Modified
1. `components/videos/episode-selector.tsx` - Main component logic
2. `app/dashboard/projects/[id]/videos/new/page.tsx` - Parent integration
3. TypeScript interfaces updated for new data structure

## Testing Checklist

- [x] Episode selection auto-loads data
- [x] Brief field populated with synopsis/logline
- [x] Characters pre-selected correctly
- [x] Settings pre-selected correctly
- [x] Loading indicator shows during fetch
- [x] Success indicator shows what was loaded
- [x] Deselecting episode clears form
- [x] Can proceed through normal roundtable
- [x] No errors in console
- [x] Light/dark theme compatibility

## Future Enhancements

**Potential improvements**:
- Add "Use Full Screenplay" toggle for advanced users who want raw screenplay data
- Show episode metadata (season/episode number, status) in brief description
- Add character/setting override suggestions based on scene analysis
- Implement episode-to-episode continuity tracking

## Related Documentation

- Episode Management: `claudedocs/DATA-FLOW-ANALYSIS-2025-10-24.md`
- AI Roundtable System: `lib/ai/agent-orchestrator.ts`
- Series Context: `components/videos/series-context-selector.tsx`
