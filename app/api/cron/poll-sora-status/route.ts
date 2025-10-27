import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/poll-sora-status
 * Vercel Cron Job: Poll all active Sora video generations and update their status
 *
 * Security: This endpoint should only be called by Vercel Cron
 * Schedule: Every 30 seconds (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const startTime = Date.now()

    console.log('[Cron] Starting Sora status polling...')

    // Fetch all videos with active Sora generations
    const { data: activeVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id, user_id, sora_job_id, sora_generation_status, sora_started_at')
      .in('sora_generation_status', ['queued', 'in_progress'])
      .not('sora_job_id', 'is', null)
      .order('sora_started_at', { ascending: true })

    if (fetchError) {
      console.error('[Cron] Failed to fetch active videos:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch active videos' },
        { status: 500 }
      )
    }

    if (!activeVideos || activeVideos.length === 0) {
      console.log('[Cron] No active Sora generations found')
      return NextResponse.json({
        success: true,
        message: 'No active generations',
        processed: 0,
        duration: Date.now() - startTime,
      })
    }

    console.log(`[Cron] Found ${activeVideos.length} active generation(s)`)

    // Process each video
    const results = {
      success: 0,
      failed: 0,
      timedOut: 0,
      errors: [] as string[],
    }

    const TIMEOUT_MINUTES = 15
    const now = new Date()

    for (const video of activeVideos) {
      try {
        // Check if generation has timed out (stuck for > 15 minutes)
        if (video.sora_started_at) {
          const startedAt = new Date(video.sora_started_at)
          const minutesElapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60)

          if (minutesElapsed > TIMEOUT_MINUTES) {
            console.log(`[Cron] Video ${video.id} timed out (${minutesElapsed.toFixed(1)} minutes)`)

            // Mark as failed due to timeout
            const { error: timeoutError } = await supabase
              .from('videos')
              .update({
                sora_generation_status: 'failed',
                sora_error_message: `Generation timed out after ${TIMEOUT_MINUTES} minutes`,
                sora_completed_at: now.toISOString(),
              })
              .eq('id', video.id)

            if (timeoutError) {
              console.error(`[Cron] Failed to mark video ${video.id} as timed out:`, timeoutError)
              results.errors.push(`Timeout update failed: ${video.id}`)
            } else {
              results.timedOut++
            }
            continue
          }
        }

        // Poll status by calling the status endpoint
        // Note: We need to make an internal fetch call as a system user
        // since the cron job doesn't have a user session
        const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/videos/${video.id}/sora-status`

        // Create a service role client that bypasses RLS
        const serviceSupabase = createClient()

        // Fetch the full video record to pass to status checking logic
        const { data: fullVideo, error: videoError } = await serviceSupabase
          .from('videos')
          .select('*')
          .eq('id', video.id)
          .single()

        if (videoError || !fullVideo) {
          console.error(`[Cron] Failed to fetch video ${video.id}:`, videoError)
          results.errors.push(`Video fetch failed: ${video.id}`)
          continue
        }

        // Import OpenAI client to check status directly
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          organization: 'org-JK5lVhiqePvkP3UHeLcABv0p',
        })

        // Check status from Sora API
        let soraStatus: any
        try {
          soraStatus = await openai.videos.retrieve(fullVideo.sora_job_id!)
          console.log(`[Cron] Video ${video.id} status: ${soraStatus.status}`)
        } catch (apiError: any) {
          if (apiError.status === 404) {
            // Job not found - mark as failed
            await serviceSupabase
              .from('videos')
              .update({
                sora_generation_status: 'failed',
                sora_error_message: 'Job not found in Sora API',
                sora_completed_at: now.toISOString(),
              })
              .eq('id', video.id)
            results.failed++
            continue
          }

          // Temporary API error - skip this iteration
          console.warn(`[Cron] API error for video ${video.id}:`, apiError.message)
          continue
        }

        // Update based on status
        const currentStatus = soraStatus.status

        if (currentStatus === 'completed' || currentStatus === 'succeeded') {
          console.log(`[Cron] Video ${video.id} completed, downloading...`)

          try {
            const videoContent = await openai.videos.downloadContent(fullVideo.sora_job_id!)
            const buffer = Buffer.from(await videoContent.arrayBuffer())
            const base64Video = buffer.toString('base64')
            const videoDataUrl = `data:video/mp4;base64,${base64Video}`

            await serviceSupabase
              .from('videos')
              .update({
                sora_generation_status: 'completed',
                sora_video_url: videoDataUrl,
                sora_completed_at: now.toISOString(),
              })
              .eq('id', video.id)

            results.success++
          } catch (downloadError: any) {
            console.error(`[Cron] Failed to download video ${video.id}:`, downloadError)

            await serviceSupabase
              .from('videos')
              .update({
                sora_generation_status: 'failed',
                sora_error_message: `Download failed: ${downloadError.message}`,
                sora_completed_at: now.toISOString(),
              })
              .eq('id', video.id)

            results.failed++
          }
        } else if (currentStatus === 'failed' || currentStatus === 'error') {
          const errorMessage = soraStatus.error?.message || 'Video generation failed'

          await serviceSupabase
            .from('videos')
            .update({
              sora_generation_status: 'failed',
              sora_error_message: errorMessage,
              sora_completed_at: now.toISOString(),
            })
            .eq('id', video.id)

          results.failed++
        } else {
          // Still in progress - update status
          const statusToStore = currentStatus === 'processing' ? 'in_progress' : currentStatus

          await serviceSupabase
            .from('videos')
            .update({
              sora_generation_status: statusToStore,
            })
            .eq('id', video.id)

          // Don't count as success or failure - still processing
        }
      } catch (error: any) {
        console.error(`[Cron] Error processing video ${video.id}:`, error)
        results.errors.push(`${video.id}: ${error.message}`)
      }
    }

    const duration = Date.now() - startTime

    console.log(
      `[Cron] Polling complete:`,
      `${results.success} completed,`,
      `${results.failed} failed,`,
      `${results.timedOut} timed out,`,
      `${results.errors.length} errors,`,
      `${duration}ms`
    )

    return NextResponse.json({
      success: true,
      message: 'Sora status polling complete',
      processed: activeVideos.length,
      results,
      duration,
    })
  } catch (error: any) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
