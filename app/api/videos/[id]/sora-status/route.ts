import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    // Poll Sora API for job status
    let soraStatus: any
    try {
      // ⚠️ PLACEHOLDER: This needs to be replaced with actual Sora API endpoint
      // The actual Sora API uses: GET /v1/video/generations/{job_id}
      // See SORA-INTEGRATION-COMPLETE.md for correct implementation

      // For development, simulate status progression
      const mockStatuses = ['queued', 'in_progress', 'completed']
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]

      soraStatus = {
        status: randomStatus,
        video_url: randomStatus === 'completed'
          ? 'https://example.com/mock-video.mp4'
          : null,
      }

      // TODO: Replace with actual Sora API call:
      // const response = await fetch(
      //   `https://api.openai.com/v1/video/generations/${video.sora_job_id}`,
      //   {
      //     headers: {
      //       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      //     },
      //   }
      // )
      // soraStatus = await response.json()
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

      return NextResponse.json(
        { error: 'Failed to check generation status', details: apiError.message },
        { status: 500 }
      )
    }

    // Extract status from Sora response
    const currentStatus = soraStatus.status || soraStatus.state

    // Update database based on status
    if (currentStatus === 'completed' || currentStatus === 'succeeded') {
      // Extract video URL from response
      // @ts-ignore
      const videoUrl = soraStatus.video_url || soraStatus.output?.url

      if (videoUrl) {
        // Option: Download and store in Supabase Storage
        // For now, just store the OpenAI URL
        await supabase
          .from('videos')
          .update({
            sora_generation_status: 'completed',
            sora_video_url: videoUrl,
            sora_completed_at: new Date().toISOString(),
          })
          .eq('id', videoId)

        return NextResponse.json({
          status: 'completed',
          videoUrl,
          cost: video.sora_generation_cost,
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
