# Quick Start - Visual Asset System

**Status**: Implementation complete, awaiting Supabase storage setup

## What Was Built

### Features Completed ✅
- Visual asset upload system (logos, color palettes, settings, style refs)
- File management UI (upload, gallery, delete)
- AI integration - agents reference uploaded assets when generating prompts
- Setting selection bug fixed - AI now respects selected characters/settings

### Files Created
- 3 React components (uploader, gallery, manager)
- 4 API endpoints (upload, list, update, delete)
- 2 database migrations (table + storage bucket)
- Complete AI orchestrator integration

## Critical Next Step - YOU MUST DO THIS

### Run Storage Bucket Migration

**The upload system will fail until you do this!**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste: `supabase-migrations/create-series-assets-bucket.sql`
4. Click "Run"

**Or manually**:
- Storage → New bucket → `series-assets` (Private, 10MB limit)
- Add 4 RLS policies from migration file

## Test After Setup

1. Navigate to any series detail page
2. Scroll to "Visual Assets" section
3. Upload test image (e.g., logo or color palette)
4. Should appear in gallery below
5. Create video → AI should reference your uploaded assets

## Key Files

**Components**: `components/series/visual-asset-*.tsx`
**API**: `app/api/series/[seriesId]/assets/`
**AI**: `lib/ai/agent-orchestrator.ts`
**Migrations**: `supabase-migrations/`

## Storage Structure

Files stored at: `{userId}/{seriesId}/{timestamp-random}.{ext}`
- Ensures user isolation
- RLS policies check folder ownership
- Automatic cleanup on series delete

## Troubleshooting

**"Failed to upload" error**:
- Storage bucket not created → Run migration
- RLS policies missing → Check migration ran successfully

**Image not appearing**:
- Check browser console for signed URL errors
- Verify bucket is private (not public)

**AI not referencing assets**:
- Upload should succeed first
- Check asset exists in database
- Verify series_id matches

---

For full details, see `.claude/session-2025-10-19-visual-assets.md`
