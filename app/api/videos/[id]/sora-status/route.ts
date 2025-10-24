import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-JK5lVhiqePvkP3UHeLcABv0p',
})

/**
 * GET /api/videos/[id]/sora-status
 * Polls the Sora API for video generation status and updates database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: videoId } = await params

    // Fetch video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Check if video has a Sora job
    if (!video.sora_job_id) {
      return NextResponse.json(
        { error: 'No Sora generation job found for this video' },
        { status: 400 }
      )
    }

    // Check current status from database
    if (video.sora_generation_status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        videoUrl: video.sora_video_url,
        cost: video.sora_generation_cost,
        completedAt: video.sora_completed_at,
      })
    }

    if (video.sora_generation_status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: video.sora_error_message,
        completedAt: video.sora_completed_at,
      })
    }

    // Poll Sora API for job status using OpenAI SDK
    let soraStatus: any
    try {
      soraStatus = await openai.videos.retrieve(video.sora_job_id)
      console.log('Sora status check:', soraStatus)
    } catch (apiError: any) {
      console.error('Sora API status check error:', apiError)

      // If job not found, mark as failed
      if (apiError.status === 404) {
        await supabase
          .from('videos')
          .update({
            sora_generation_status: 'failed',
            sora_error_message: 'Job not found in Sora API',
            sora_completed_at: new Date().toISOString(),
          })
          .eq('id', videoId)

        return NextResponse.json({
          status: 'failed',
          error: 'Job not found in Sora API',
        })
      }

      // If 503 server error, return current status without marking as failed
      // This is a temporary API issue, video may still be processing
      if (apiError.status === 503) {
        console.log('Sora API temporarily unavailable (503), will retry on next poll')
        return NextResponse.json({
          status: video.sora_generation_status || 'queued',
          message: 'Checking status...',
        })
      }

      return NextResponse.json(
        { error: 'Failed to check generation status', details: apiError.message },
        { status: 500 }
      )
    }

    // Extract status from Sora response
    const currentStatus = soraStatus.status

    // Update database based on status
    if (currentStatus === 'completed' || currentStatus === 'succeeded') {
      console.log('Video generation completed, downloading content...')

      // Download the video content and create a data URL
      try {
        const videoContent = await openai.videos.downloadContent(video.sora_job_id)
        console.log('Video content downloaded successfully')

        // Convert the binary content to a data URL
        const buffer = Buffer.from(await videoContent.arrayBuffer())
        const base64Video = buffer.toString('base64')
        const videoDataUrl = `data:video/mp4;base64,${base64Video}`
        console.log(`Video converted to base64, size: ${base64Video.length} characters`)

        // Store in database
        const { error: updateError } = await supabase
          .from('videos')
          .update({
            sora_generation_status: 'completed',
            sora_video_url: videoDataUrl,
            sora_completed_at: new Date().toISOString(),
          })
          .eq('id', videoId)

        if (updateError) {
          console.error('Failed to update database with video URL:', updateError)
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        console.log('Video URL saved to database successfully')

        return NextResponse.json({
          status: 'completed',
          videoUrl: videoDataUrl,
          cost: video.sora_generation_cost,
          completedAt: new Date().toISOString(),
        })
      } catch (downloadError: any) {
        console.error('Failed to download video:', downloadError)

        // Mark as failed if we can't download
        await supabase
          .from('videos')
          .update({
            sora_generation_status: 'failed',
            sora_error_message: `Video generated but failed to download: ${downloadError.message}`,
            sora_completed_at: new Date().toISOString(),
          })
          .eq('id', videoId)

        return NextResponse.json({
          status: 'failed',
          error: `Failed to download video: ${downloadError.message}`,
          completedAt: new Date().toISOString(),
        })
      }
    }

    if (currentStatus === 'failed' || currentStatus === 'error') {
      // @ts-ignore
      const errorMessage = soraStatus.error?.message || 'Video generation failed'

      await supabase
        .from('videos')
        .update({
          sora_generation_status: 'failed',
          sora_error_message: errorMessage,
          sora_completed_at: new Date().toISOString(),
        })
        .eq('id', videoId)

      return NextResponse.json({
        status: 'failed',
        error: errorMessage,
        completedAt: new Date().toISOString(),
      })
    }

    // Status is still in progress
    const statusToStore = currentStatus === 'processing' ? 'in_progress' : currentStatus

    await supabase
      .from('videos')
      .update({
        sora_generation_status: statusToStore,
      })
      .eq('id', videoId)

    return NextResponse.json({
      status: statusToStore,
      message: getStatusMessage(statusToStore),
    })
  } catch (error: any) {
    console.error('Sora status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'queued':
      return 'Your video is queued for generation...'
    case 'in_progress':
    case 'processing':
      return 'Generating your video with Sora AI...'
    case 'completed':
      return 'Video generation complete!'
    case 'failed':
      return 'Video generation failed'
    default:
      return 'Processing...'
  }
}
