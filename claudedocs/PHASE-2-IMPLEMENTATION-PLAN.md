# Phase 2: UI/UX Restructuring - Implementation Plan

**Date**: January 28, 2025
**Status**: Ready to Begin
**Dependencies**: Phase 1 database migrations must be tested and deployed first
**Estimated Effort**: 16-20 hours

---

## 🎯 Objectives

### Primary Goals
1. **Simplify Navigation** - Reduce from 6+ series pages to 3 core pages
2. **Series-First Workflow** - Make series → episodes → videos the primary path
3. **Automatic Context Flow** - Update all video creation to auto-inject series context
4. **Remove Redundancy** - Consolidate duplicate series management pages

### Success Metrics
- ✅ Reduce clicks for video creation: 8+ → 3 clicks
- ✅ Single series detail page (not scattered across projects)
- ✅ 100% series context injection for episode-based videos
- ✅ Clear visual hierarchy in navigation

---

## 📊 Current State Analysis

### Existing Pages (Redundant Structure)

**Series Pages (6 total - TOO MANY!)**:
1. `/dashboard/series` - All series list
2. `/dashboard/series/[seriesId]` - Standalone series detail
3. `/dashboard/series/concept` - Series concept creation
4. `/dashboard/projects/[id]/series` - Project series management
5. `/dashboard/projects/[id]/series/[seriesId]` - Project-specific series detail (DUPLICATE)
6. `/dashboard/projects/[id]/series/concept` - Project-scoped concept (DUPLICATE)

**Issues Identified**:
- ❌ Duplicate series detail pages (standalone vs project-scoped)
- ❌ Concept creation split across 2 locations
- ❌ No clear episode → video generation flow
- ❌ Series management scattered across dashboard

**Project Pages (7 total)**:
1. `/dashboard/projects/[id]` - Project detail
2. `/dashboard/projects/new` - Create project
3. `/dashboard/projects/[id]/series` - Series list (redundant)
4. `/dashboard/projects/[id]/series/[seriesId]` - Series detail (redundant)
5. `/dashboard/projects/[id]/series/concept` - Concept creation (redundant)
6. `/dashboard/projects/[id]/videos/new` - Create video
7. `/dashboard/projects/[id]/videos/[videoId]` - Video detail

---

## 🎨 Proposed New Structure

### Simplified Page Hierarchy

```
Dashboard
├── Series (Primary Workflow) ⭐
│   ├── /dashboard/series
│   │   └─ All series list (standalone + project-associated)
│   ├── /dashboard/series/new
│   │   └─ Create new series (with optional project selection)
│   ├── /dashboard/series/concept
│   │   └─ AI-powered series concept generation
│   └── /dashboard/series/[seriesId]
│       ├─ Overview tab (characters, settings, Sora config)
│       ├─ Episodes tab → Episode list with generate video action
│       └─ Associated Projects tab
│
├── Projects (Portfolio View) 📁
│   ├── /dashboard/projects
│   │   └─ Project list
│   ├── /dashboard/projects/new
│   │   └─ Create project
│   └── /dashboard/projects/[id]
│       ├─ Overview: All videos from all series
│       ├─ Quick action: Associate existing series
│       └─ NO series detail page (redirect to /dashboard/series/[seriesId])
│
└── Videos (Quick Access) 🎬
    ├── /dashboard/videos (NEW - all user videos)
    └── /dashboard/videos/new?standalone=true (Quick standalone creation)
```

### Pages to Remove (5 files)
1. ❌ `/dashboard/projects/[id]/series` - Redundant with `/dashboard/series`
2. ❌ `/dashboard/projects/[id]/series/[seriesId]` - Redirect to `/dashboard/series/[seriesId]`
3. ❌ `/dashboard/projects/[id]/series/concept` - Use `/dashboard/series/concept`
4. ❌ `/dashboard/projects/[id]/videos/new` - Move to series episode flow
5. ❌ Possibly merge `/dashboard/series/concept` into `/dashboard/series/new`

### Pages to Create (2 files)
1. ✅ `/dashboard/videos/page.tsx` - All videos list
2. ✅ `/dashboard/series/new/page.tsx` - Unified series creation

### Pages to Update (4 files)
1. ✅ `/dashboard/series/[seriesId]/page.tsx` - Add episode → video generation UI
2. ✅ `/dashboard/projects/[id]/page.tsx` - Update to show series via junction, remove series management
3. ✅ `/dashboard/series/page.tsx` - Update to show all series (standalone + project)
4. ✅ `/dashboard/projects/[id]/videos/[videoId]/page.tsx` - Update to handle new schema

---

## 🔧 Implementation Steps

### Step 1: Update API Routes for Auto Context Injection

**Files to Modify**:
- `app/api/videos/route.ts` - POST endpoint for video creation
- `app/api/agent/roundtable/route.ts` - Agent orchestration
- `lib/ai/agent-orchestrator.ts` - Context fetching logic

**Changes**:

#### 1.1 Update Video Creation API (`app/api/videos/route.ts`)

```typescript
// NEW: Accept episodeId, auto-fetch all series context
export async function POST(request: NextRequest) {
  const { episodeId, sceneId, brief, platform } = await request.json()

  // If episodeId provided, auto-fetch ALL series context
  let seriesContext = null
  if (episodeId) {
    seriesContext = await fetchCompleteSeriesContext(episodeId)
    // Returns: { series, characters, settings, visualAssets, relationships, soraSettings }
  }

  // Pass to agent roundtable (context guaranteed)
  const result = await runAgentRoundtable({
    brief,
    platform,
    ...seriesContext, // Auto-injected
  })

  // Save video with auto-populated series_id (via trigger)
  await supabase.from('videos').insert({
    episode_id: episodeId,
    // series_id auto-populated by trigger
    ...result
  })
}
```

#### 1.2 Create Context Helper Function

```typescript
// lib/services/series-context.ts (NEW FILE)
export async function fetchCompleteSeriesContext(episodeId: string) {
  const supabase = await createClient()

  // 1. Get episode and series_id
  const { data: episode } = await supabase
    .from('episodes')
    .select('*, series:series_id(*)')
    .eq('id', episodeId)
    .single()

  if (!episode || !episode.series) return null

  const seriesId = episode.series.id

  // 2. Fetch ALL series context in parallel
  const [characters, settings, assets, relationships, visualStyle] = await Promise.all([
    supabase.from('series_characters').select('*').eq('series_id', seriesId),
    supabase.from('series_settings').select('*').eq('series_id', seriesId),
    supabase.from('series_visual_assets').select('*').eq('series_id', seriesId),
    supabase.from('character_relationships').select('*').eq('series_id', seriesId),
    supabase.from('series_visual_style').select('*').eq('series_id', seriesId).single(),
  ])

  return {
    series: episode.series,
    characters: characters.data || [],
    settings: settings.data || [],
    visualAssets: assets.data || [],
    relationships: relationships.data || [],
    soraSettings: {
      sora_camera_style: episode.series.sora_camera_style,
      sora_lighting_mood: episode.series.sora_lighting_mood,
      sora_color_palette: episode.series.sora_color_palette,
      sora_overall_tone: episode.series.sora_overall_tone,
      sora_narrative_prefix: episode.series.sora_narrative_prefix,
    },
    episodeContext: {
      season_number: episode.season_number,
      episode_number: episode.episode_number,
      title: episode.title,
      screenplay_text: episode.screenplay_text,
      structured_screenplay: episode.structured_screenplay,
    }
  }
}
```

---

### Step 2: Create Episode → Video Generation Component

**New Component**: `components/episodes/episode-video-generator.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Film, Zap } from 'lucide-react'

interface Scene {
  scene_id: string
  scene_number: number
  location: string
  description: string
  characters: string[]
  duration_estimate?: number
}

interface EpisodeVideoGeneratorProps {
  episodeId: string
  seriesId: string
  episodeTitle: string
  scenes: Scene[]
  onVideoCreated?: (videoId: string) => void
}

export function EpisodeVideoGenerator({
  episodeId,
  seriesId,
  episodeTitle,
  scenes,
  onVideoCreated
}: EpisodeVideoGeneratorProps) {
  const [selectedScene, setSelectedScene] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  async function handleGenerateVideo(sceneId?: string) {
    setGenerating(true)
    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          sceneId, // Optional - generate from specific scene
          brief: sceneId
            ? `Generate video for scene from ${episodeTitle}`
            : `Generate video for full episode: ${episodeTitle}`,
          platform: 'instagram', // Default, user can change later
        })
      })

      const { data } = await response.json()
      onVideoCreated?.(data.id)
    } catch (error) {
      console.error('Failed to generate video:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Full Episode Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Generate Video from Episode
          </CardTitle>
          <CardDescription>
            Series context (characters, settings, visual style) will be automatically applied
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => handleGenerateVideo()}
            disabled={generating}
            className="w-full"
          >
            <Zap className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Full Episode Video'}
          </Button>
        </CardContent>
      </Card>

      {/* Scene-by-Scene Generation */}
      {scenes && scenes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Or Generate from Specific Scene</CardTitle>
            <CardDescription>
              Select a scene to generate a focused video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scenes.map((scene) => (
              <div
                key={scene.scene_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => setSelectedScene(scene.scene_id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Scene {scene.scene_number}</Badge>
                    <span className="font-medium">{scene.location}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {scene.description}
                  </p>
                  {scene.characters && scene.characters.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {scene.characters.slice(0, 3).map((char, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                      {scene.characters.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{scene.characters.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant={selectedScene === scene.scene_id ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGenerateVideo(scene.scene_id)
                  }}
                  disabled={generating}
                >
                  Generate
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Context Preview */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>
              Series characters, settings, and visual style will be automatically applied to all generated videos
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Step 3: Update Series Detail Page

**File**: `/dashboard/series/[seriesId]/page.tsx`

**Changes**:
1. Add Episodes tab with video generation UI
2. Show associated projects (from project_series junction)
3. Remove standalone vs project distinction

```typescript
import { EpisodeVideoGenerator } from '@/components/episodes/episode-video-generator'

// In the page component:
const { data: episodes } = await supabase
  .from('episodes')
  .select('*')
  .eq('series_id', seriesId)
  .order('season_number', { ascending: true })
  .order('episode_number', { ascending: true })

// Add Episodes Tab
<Tab value="episodes">
  <div className="space-y-4">
    {episodes?.map((episode) => (
      <Card key={episode.id}>
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle>
                S{episode.season_number}E{episode.episode_number}: {episode.title}
              </CardTitle>
              <CardDescription>{episode.logline}</CardDescription>
            </div>
            <Badge>{episode.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <EpisodeVideoGenerator
            episodeId={episode.id}
            seriesId={seriesId}
            episodeTitle={episode.title}
            scenes={episode.structured_screenplay?.scenes || []}
            onVideoCreated={(videoId) => router.push(`/dashboard/videos/${videoId}`)}
          />
        </CardContent>
      </Card>
    ))}
  </div>
</Tab>
```

---

### Step 4: Update Project Detail Page

**File**: `/dashboard/projects/[id]/page.tsx`

**Changes**:
1. Update to fetch series via `project_series` junction (not `series.project_id`)
2. Remove "Manage Series" button → redirect to `/dashboard/series`
3. Show "Associate Series" dialog for junction table management
4. Redirect series detail links to `/dashboard/series/[seriesId]`

```typescript
// Updated query
const { data: seriesAssociations } = await supabase
  .from('project_series')
  .select(`
    id,
    display_order,
    created_at,
    series:series_id (
      id,
      name,
      description,
      genre,
      created_at,
      updated_at
    )
  `)
  .eq('project_id', id)
  .order('display_order', { ascending: true })

// Flatten series
const series = seriesAssociations?.map((assoc: any) => assoc.series).filter(Boolean) || []

// Update link to redirect to main series page
<Link href={`/dashboard/series/${seriesItem.id}`}>
  View Series Details
</Link>
```

---

### Step 5: Create All Videos Page

**New File**: `/dashboard/videos/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { VideoCard } from '@/components/videos/video-card'

export default async function AllVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: videos } = await supabase
    .from('videos')
    .select(`
      *,
      episode:episodes(id, title, season_number, episode_number),
      series:series(id, name)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">All Videos</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {videos?.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}
```

---

### Step 6: Remove Redundant Pages

**Delete These Files**:
```bash
rm app/dashboard/projects/[id]/series/page.tsx
rm app/dashboard/projects/[id]/series/[seriesId]/page.tsx
rm app/dashboard/projects/[id]/series/concept/page.tsx
rm app/dashboard/projects/[id]/videos/new/page.tsx
```

**Update Navigation**:
- Remove "Manage Series" from project detail
- Add "All Videos" to main dashboard
- Emphasize "Series" as primary navigation item

---

## 📋 Implementation Checklist

### API & Backend (4-5 hours)
- [ ] Create `lib/services/series-context.ts` helper
- [ ] Update `app/api/videos/route.ts` for auto context injection
- [ ] Update `app/api/agent/roundtable/route.ts` to use new context helper
- [ ] Update `lib/ai/agent-orchestrator.ts` if needed
- [ ] Test API endpoints with new schema

### Components (3-4 hours)
- [ ] Create `components/episodes/episode-video-generator.tsx`
- [ ] Create `components/videos/video-card.tsx` (if not exists)
- [ ] Update existing video components for new schema
- [ ] Add project-series association dialog component

### Pages - Updates (4-5 hours)
- [ ] Update `/dashboard/series/[seriesId]/page.tsx` - Add episodes tab
- [ ] Update `/dashboard/projects/[id]/page.tsx` - Use junction table
- [ ] Update `/dashboard/series/page.tsx` - Show all series
- [ ] Update `/dashboard/videos/[videoId]/page.tsx` - Handle new schema

### Pages - New (2-3 hours)
- [ ] Create `/dashboard/videos/page.tsx` - All videos list
- [ ] Create `/dashboard/series/new/page.tsx` - Unified creation
- [ ] Update navigation components

### Pages - Remove (1 hour)
- [ ] Delete 4 redundant series/video pages
- [ ] Update all internal links to removed pages
- [ ] Add redirects for old URLs (optional)

### Testing (2-3 hours)
- [ ] Test series → episode → video flow
- [ ] Test standalone video creation
- [ ] Test project-series association
- [ ] Verify context auto-injection works
- [ ] Test all navigation paths

### Documentation (1-2 hours)
- [ ] Create user migration guide
- [ ] Update developer documentation
- [ ] Screenshot new workflows

---

## 🎯 Success Criteria

Phase 2 complete when:
- ✅ Only 3 core series pages (list, detail, new/concept)
- ✅ Episode → video generation works with auto context
- ✅ Projects show series via junction table
- ✅ All redundant pages removed
- ✅ Navigation is clear and intuitive
- ✅ All tests pass
- ✅ User guide created

---

## 🚀 Next Steps After Phase 2

### Phase 3: Polish & Optimization
1. Add loading skeletons for async operations
2. Implement optimistic UI updates
3. Add error boundaries and retry logic
4. Performance optimization (caching, prefetching)

### Phase 4: User Onboarding
1. In-app tutorial for new workflow
2. Migration guide for existing users
3. Video walkthrough of series-first workflow
4. FAQ and troubleshooting guide

---

**Ready to Begin**: ✅ Yes - Phase 1 migrations complete
**Estimated Timeline**: 1-1.5 weeks (16-20 hours)
**Risk Level**: Medium (UI changes, no data loss)
