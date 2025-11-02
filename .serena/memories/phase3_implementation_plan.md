# Phase 3: UI Implementation Plan

## Objectives
Build user interface for segment management, batch generation, and continuity reporting.

## Components to Create

### 1. Episode Detail Page Enhancement
**File**: `app/dashboard/episodes/[id]/page.tsx`

Add tabbed interface:
- Overview tab (existing content)
- Videos tab (existing videos section)
- Segments tab (NEW - segment management)

### 2. Segments Tab Component
**File**: `components/segments/episode-segments-tab.tsx`

Features:
- Display segment creation status
- Show existing segments if created
- Button to create segments from episode
- Button to start batch generation
- Link to individual segment generation

### 3. Segment Creation Dialog
**File**: `components/segments/create-segments-dialog.tsx`

Features:
- Configure target duration (8-12s, default 10s)
- Toggle prefer scene boundaries
- Preview: estimated segment count, total duration, cost
- Create button → POST /api/episodes/[id]/create-segments
- Success: Show created segments, offer to start batch generation

### 4. Segment List Component
**File**: `components/segments/segment-list.tsx`

Features:
- Grid/list view of segments
- Each segment card shows:
  - Segment number + narrative beat
  - Duration, character count
  - Status badge (pending/generating/complete/error)
  - Video link if generated
  - Generate button if not generated
- Sort by segment_number (ascending)
- Filter by status

### 5. Batch Generation Dialog
**File**: `components/segments/batch-generation-dialog.tsx`

Features:
- Configure anchor point interval (2-5, default 3)
- Toggle continuity validation
- Estimated time: segments × 45s average
- Start batch button → POST /api/segment-groups/[id]/generate-batch
- Progress tracking during generation
- Error handling with partial completion display

### 6. Batch Generation Progress
**File**: `components/segments/batch-generation-progress.tsx`

Features:
- Progress bar (completed/total segments)
- Current segment being generated
- Estimated time remaining
- Real-time updates (polling or streaming)
- Cancel option (if generation supports it)
- View partial results if error occurs

### 7. Continuity Report Viewer
**File**: `components/segments/continuity-report-viewer.tsx`

Features:
- Overall continuity score (average across segments)
- Segments with issues count
- Issues breakdown:
  - By type (character_position, lighting, camera, mood)
  - By severity (low, medium, high, critical)
- Expandable segment details:
  - Segment number + narrative beat
  - Continuity score (0-100)
  - List of issues with descriptions
  - Auto-correction suggestions
- Visual charts (bar chart, pie chart)

### 8. Segment Card Component
**File**: `components/segments/segment-card.tsx`

Reusable card for displaying segment info:
- Segment number badge
- Narrative beat (truncated)
- Duration, character/setting counts
- Status indicator
- Action buttons (Generate, View Video, View Details)

## Integration Points

### Episode Detail Page
```typescript
// Add tabs to episode detail page
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EpisodeSegmentsTab } from '@/components/segments/episode-segments-tab'

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="videos">Videos</TabsTrigger>
    <TabsTrigger value="segments">Segments</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Existing overview content */}
  </TabsContent>
  
  <TabsContent value="videos">
    {/* Existing videos section */}
  </TabsContent>
  
  <TabsContent value="segments">
    <EpisodeSegmentsTab episodeId={episodeId} seriesId={episode.series.id} />
  </TabsContent>
</Tabs>
```

### Existing Components Pattern
Follow patterns from:
- `components/episodes/episode-video-generator.tsx` - State management, API calls
- `app/dashboard/episodes/[id]/page.tsx` - Layout, shadcn/ui components
- `components/ui/*` - Use existing shadcn/ui primitives

## API Integration

### Fetch Segments
```typescript
const { data: segmentGroup } = await fetch(`/api/segment-groups/[id]`)
// Returns: segmentGroup, episode, segments, progress
```

### Create Segments
```typescript
const response = await fetch(`/api/episodes/[id]/create-segments`, {
  method: 'POST',
  body: JSON.stringify({
    targetDuration: 10,
    minDuration: 8,
    maxDuration: 12,
    preferSceneBoundaries: true,
    createSegmentGroup: true,
  })
})
// Returns: episode, segmentGroup, segments, totalDuration, segmentCount, estimatedCost
```

### Batch Generate
```typescript
const response = await fetch(`/api/segment-groups/[id]/generate-batch`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'tiktok',
    anchorPointInterval: 3,
    validateContinuityBefore: true,
  })
})
// Returns: videos, segmentGroup, continuityReport, anchorPointsUsed
```

## State Management

### Episode Segments Tab State
```typescript
const [segmentGroup, setSegmentGroup] = useState(null)
const [segments, setSegments] = useState([])
const [loading, setLoading] = useState(true)
const [generationProgress, setGenerationProgress] = useState(null)
```

### Batch Generation State
```typescript
const [generating, setGenerating] = useState(false)
const [progress, setProgress] = useState({ current: 0, total: 0 })
const [continuityReport, setContinuityReport] = useState(null)
const [error, setError] = useState(null)
```

## UI/UX Patterns

### Status Badges
```typescript
const statusColors = {
  planning: 'bg-gray-600',
  generating: 'bg-yellow-600',
  partial: 'bg-orange-600',
  complete: 'bg-green-600',
  error: 'bg-red-600',
}
```

### Progress Indicators
- Use shadcn/ui Progress component
- Show percentage + current/total
- Estimated time remaining
- Current segment narrative beat

### Error Handling
- Display partial results if available
- Show error message with retry option
- Link to failed segment for individual retry

### Real-time Updates
Option 1: Polling (simpler)
```typescript
useEffect(() => {
  if (generating) {
    const interval = setInterval(async () => {
      const { data } = await fetch(`/api/segment-groups/[id]`)
      setProgress(data.progress)
      if (data.segmentGroup.status === 'complete' || data.segmentGroup.status === 'error') {
        setGenerating(false)
        clearInterval(interval)
      }
    }, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }
}, [generating])
```

Option 2: Server-Sent Events (advanced)
- Modify batch generation API to support streaming
- Use EventSource for real-time updates
- More complex but better UX

## Styling Guidelines

### Color Palette (from existing)
- Primary: scenra-amber (#FFB800)
- Dark: scenra-dark (#0A0E27)
- Light: scenra-light (#F8F9FA)
- Gray: scenra-gray (#8892A6)
- Panel: scenra-dark-panel (#151B33)

### Component Patterns
- Use Card for grouped content
- Badge for status indicators
- Button variants: primary (amber bg), outline, ghost
- Icons from lucide-react
- Responsive: mobile-first, breakpoints at md, lg

## Testing Considerations

### Component Tests
- Test segment creation dialog state management
- Validate batch generation progress updates
- Verify continuity report data display
- Check error handling UI

### Integration Tests
- End-to-end: Create segments → View list → Start batch → View report
- Test with real API responses
- Verify real-time progress updates
- Test partial completion scenarios

## Performance Optimization

### Initial Load
- Fetch segment group + segments in parallel
- Show skeleton loaders during fetch
- Cache segment group data with react-query

### Batch Generation
- Update progress incrementally
- Don't refetch all segments on each update
- Use optimistic UI updates

### Continuity Report
- Lazy load report details
- Aggregate stats computed on backend
- Chart rendering only when tab is active

## Next Session Starting Point

1. Start with: `components/segments/episode-segments-tab.tsx`
2. Fetch existing segment group (if any)
3. Show create segments button or segment list
4. Build segment creation dialog next
5. Then segment list and batch generation

This provides clear path forward for Phase 3 UI implementation.
