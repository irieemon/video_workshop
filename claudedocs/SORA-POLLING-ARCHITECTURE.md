# Sora Video Generation Polling Architecture

**Last Updated**: 2025-10-26
**Status**: ✅ PRODUCTION READY

---

## Overview

This document explains how the application polls OpenAI's Sora API for video generation status updates without requiring Vercel Pro subscription.

## Problem Statement

**Challenge**: Vercel Hobby accounts only support daily cron jobs, but Sora video generation requires frequent status polling (every few seconds) to provide real-time feedback.

**Solution**: Client-side polling with optional background completion strategies.

---

## Current Implementation

### Client-Side Polling (Primary Method)

**Location**: `components/videos/sora-generation-modal.tsx`

**How It Works**:
1. User initiates video generation via "Generate with Sora" button
2. Modal opens showing generation progress
3. Client polls `/api/videos/[id]/sora-status` every 5 seconds
4. Updates progress bar and status in real-time
5. Stops polling when:
   - Video completes successfully
   - Generation fails
   - User closes modal
   - 10-minute timeout expires

**Code Reference**:
```typescript
// Polling loop (line 121)
const pollInterval = setInterval(async () => {
  const response = await fetch(`/api/videos/${videoId}/sora-status`)
  const data = await response.json()

  if (data.status === 'completed') {
    // Video ready - stop polling
    clearInterval(pollInterval)
  }
}, 5000) // Poll every 5 seconds
```

**Advantages**:
- ✅ Works on Vercel Hobby (free tier)
- ✅ Real-time user feedback
- ✅ No server resources when user not active
- ✅ Automatic cleanup on modal close

**Limitations**:
- ❌ Polling stops if user closes modal/browser
- ❌ Background generations won't auto-complete

---

## API Endpoints

### `/api/videos/[id]/sora-status` (Active)

**Purpose**: Check status of a single video generation
**Method**: GET
**Auth**: Requires authenticated user
**Rate Limit**: None (client-controlled)

**Flow**:
1. Fetch video record from database
2. Call OpenAI Sora API to get current status
3. Update database with latest status
4. Return status to client

**Response**:
```json
{
  "status": "in_progress" | "completed" | "failed" | "queued",
  "progress": 45,
  "videoUrl": "...", // if completed
  "error": "...", // if failed
  "estimatedTimeRemaining": 120000 // ms
}
```

### `/api/cron/poll-sora-status` (Deprecated)

**Status**: ⚠️ REMOVED - Not compatible with Vercel Hobby
**Reason**: Requires sub-daily cron which needs Vercel Pro

This endpoint is preserved in codebase for:
- Future use if upgrading to Vercel Pro
- External cron service integration (see alternatives below)
- Local development/testing

---

## Alternative Background Polling Options

If you need videos to complete after user closes browser, consider these free alternatives:

### Option 1: Supabase Edge Functions

**Cost**: Free (500K invocations/month)
**Setup**:
```bash
# Install Supabase CLI
npm install -g supabase

# Create edge function
supabase functions new poll-sora-status

# Deploy
supabase functions deploy poll-sora-status --project-ref YOUR_PROJECT_REF
```

**Schedule**: Use Supabase's pg_cron extension
```sql
SELECT cron.schedule(
  'poll-sora-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-app.vercel.app/api/cron/poll-sora-status',
    headers:='{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
```

### Option 2: GitHub Actions

**Cost**: Free (2000 minutes/month for public repos)
**Setup**: Create `.github/workflows/poll-sora.yml`
```yaml
name: Poll Sora Status
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Poll Sora API
        run: |
          curl -X GET "https://your-app.vercel.app/api/cron/poll-sora-status" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Cron Service

**Free Services**:
- **cron-job.org**: 50 jobs free, 1-minute minimum interval
- **EasyCron**: 1 job free, 1-minute minimum interval
- **Cronitor**: Free tier available

**Setup**:
1. Sign up for service
2. Create new cron job pointing to: `https://your-app.vercel.app/api/cron/poll-sora-status`
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Schedule: Every 5 minutes recommended

---

## User Experience Considerations

### Active Generation (Modal Open)
- ✅ Real-time progress updates every 5 seconds
- ✅ Estimated time remaining
- ✅ Visual progress bar
- ✅ Immediate error feedback

### Background Generation (Modal Closed)
- ⚠️ Polling stops when modal closes
- ✅ Video status saved in database
- ✅ User can manually check status later
- 💡 **Future Enhancement**: Add "Check Status" button to video cards

### Recommended UX Flow
1. User generates video, watches progress in modal
2. If user needs to leave:
   - Show message: "Generation will continue in background"
   - Provide link to return and check status
3. On project/video page, show generation status badge
4. Add "Refresh Status" button for background completions

---

## Timeout and Error Handling

### Client-Side Timeout
**Duration**: 10 minutes
**Location**: `sora-generation-modal.tsx:124-136`

```typescript
const timeout = setTimeout(() => {
  clearInterval(pollInterval)
  setErrorMessage('Video generation timed out after 10 minutes')
  setStep('failed')
}, 10 * 60 * 1000)
```

### Server-Side Timeout (Cron Endpoint)
**Duration**: 15 minutes
**Location**: `/api/cron/poll-sora-status/route.ts:61`

Marks videos as failed if stuck in processing for >15 minutes.

### Error States
- **API Errors**: Retried on next poll
- **Network Errors**: User notified, can retry generation
- **Job Not Found**: Marked as failed immediately
- **Timeout**: Marked as failed, retry available

---

## Performance Considerations

### Client-Side Polling
- **Network Impact**: ~50 requests per video (5s interval × 10min timeout)
- **Server Load**: Minimal - only when user actively watching
- **Database Queries**: 1 read + 1 write per poll
- **Sora API Calls**: 1 per poll (rate limits apply)

### Optimization Strategies
1. **Exponential Backoff**: Increase poll interval after 2 minutes
2. **Smart Polling**: Only poll videos in 'queued' or 'in_progress' state
3. **Batch Status Checks**: If implementing server-side polling
4. **Cache Status**: 5-second cache on status endpoint to prevent thundering herd

---

## Database Schema

### Relevant Fields in `videos` Table

```sql
sora_job_id             TEXT      -- OpenAI Sora job identifier
sora_generation_status  TEXT      -- 'queued', 'in_progress', 'completed', 'failed'
sora_video_url          TEXT      -- Base64 or URL to completed video
sora_started_at         TIMESTAMP -- When generation started
sora_completed_at       TIMESTAMP -- When generation finished
sora_error_message      TEXT      -- Error details if failed
sora_settings           JSONB     -- Generation parameters used
```

---

## Migration Path to Vercel Pro

If you upgrade to Vercel Pro in the future:

1. Uncomment cron configuration in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/poll-sora-status",
      "schedule": "* * * * *"  // Every minute
    }
  ]
}
```

2. Keep client-side polling for real-time feedback
3. Background cron handles completions when user not active
4. Best of both worlds: real-time + background processing

---

## Testing

### Local Development
```bash
# Start development server
npm run dev

# In another terminal, trigger status check manually
curl http://localhost:3000/api/videos/VIDEO_ID/sora-status \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### Testing Cron Endpoint (if using external service)
```bash
# Manually trigger polling
curl -X GET http://localhost:3000/api/cron/poll-sora-status \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Future Enhancements

### Short-Term (P2)
- [ ] Add "Check Status" button to video cards
- [ ] Implement exponential backoff for long-running generations
- [ ] Add retry mechanism for failed API calls

### Medium-Term (P3)
- [ ] WebSocket-based real-time updates (eliminates polling)
- [ ] Supabase Realtime integration for status updates
- [ ] Background job queue for resilient processing

### Long-Term (P4)
- [ ] Multiple video queue management
- [ ] Priority-based generation ordering
- [ ] Advanced retry strategies with jitter

---

## Troubleshooting

### Issue: Video stuck in "in_progress"
**Cause**: User closed modal before completion
**Solution**: Manually check status via API or wait for timeout cleanup

### Issue: Polling stops immediately
**Cause**: Modal unmounted or error in status endpoint
**Solution**: Check browser console for errors, verify auth token

### Issue: High API costs from Sora polling
**Cause**: Many concurrent generations being polled
**Solution**: Implement rate limiting or exponential backoff

### Issue: Videos never complete in background
**Cause**: No server-side polling active
**Solution**: Implement one of the alternative polling strategies above

---

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [OpenAI Sora API Documentation](https://platform.openai.com/docs/guides/sora)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Actions Cron](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

**Questions or Issues?**
- Check existing API endpoint logs in Vercel dashboard
- Review Sora generation status in database
- Verify client-side polling in browser DevTools Network tab
