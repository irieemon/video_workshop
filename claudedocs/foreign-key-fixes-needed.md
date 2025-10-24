# Foreign Key Relationship Fixes Needed

## Problem
The migration added `projects.default_series_id` which created a second foreign key relationship between projects and series. This causes Supabase query ambiguity.

## Solution Pattern
When querying relationships, specify which foreign key to use:

### From Projects → Series
Use: `series:series!series_project_id_fkey(...)`
This means: "Get series where series.project_id = projects.id"

### From Videos → Series
Use: `series:series!videos_series_id_fkey(...)`
This means: "Get series where series.id = videos.series_id"

### From Videos → Projects
Use: `project:projects!videos_project_id_fkey(...)`
This means: "Get projects where projects.id = videos.project_id"

## Files That Need Fixing

### ✅ Already Fixed:
- app/dashboard/page.tsx (line 24)
- app/dashboard/projects/[id]/page.tsx (line 23)

### ❌ Need to Fix:
1. **app/dashboard/projects/[id]/videos/[videoId]/page.tsx:26**
   - Change: `series:series(*)`
   - To: `series:series!videos_series_id_fkey(*)`

2. **app/api/projects/route.ts:24**
   - Change: `series:series(count)`
   - To: `series:series!series_project_id_fkey(count)`

3. **app/api/projects/[id]/route.ts:28**
   - Change: `series:series(*)`
   - To: `series:series!series_project_id_fkey(*)`

4. **app/api/videos/[id]/route.ts:29**
   - Change: `series:series(*)`
   - To: `series:series!videos_series_id_fkey(*)`

### ℹ️ Already Correct (using !inner):
These files already specify the foreign key:
- app/api/series/[seriesId]/settings/[settingId]/route.ts
- app/api/series/[seriesId]/visual-style/route.ts
- app/api/series/[seriesId]/characters/[characterId]/route.ts
- app/api/series/[seriesId]/characters/[characterId]/upload-visual-cue/route.ts
- app/api/series/[seriesId]/assets/[assetId]/route.ts

## Testing After Fix
1. Dashboard should load projects ✅
2. Clicking a project should open project detail
3. Creating/viewing videos should work
4. Series page should work
