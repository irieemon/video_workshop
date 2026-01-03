import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { enforceQuota, incrementUsage, createQuotaExceededResponse } from '@/lib/stripe/usage'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/segments/generate-video
 *
 * Generates a video using Sora API for a segment (premium users only).
 *
 * Body:
 * - segmentId: string - Video segment ID
 * - episodeId: string - Episode ID
 * - seriesId: string - Series ID
 * - prompt: string - Sora-optimized prompt
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription tier (premium required)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_tier !== 'premium' && profile?.subscription_tier !== 'enterprise') {
      return NextResponse.json(
        { error: 'Premium subscription required for direct Sora generation' },
        { status: 403 }
      )
    }

    // Check video generation quota
    const quotaCheck = await enforceQuota(supabase, user.id, 'videos')
    if (!quotaCheck.allowed) {
      return quotaCheck.response
    }

    // Parse body
    const { segmentId, episodeId, seriesId, prompt } = await request.json()

    if (!segmentId || !episodeId || !seriesId || !prompt) {
      return NextResponse.json(
        { error: 'segmentId, episodeId, seriesId, and prompt are required' },
        { status: 400 }
      )
    }

    // Fetch segment
    const { data: segment, error: segmentError } = await supabase
      .from('video_segments')
      .select('*')
      .eq('id', segmentId)
      .single()

    if (segmentError || !segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: episode } = await supabase
      .from('episodes')
      .select('user_id, title')
      .eq('id', episodeId)
      .single()

    if (episode?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create video record in database (pending)
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        series_id: seriesId,
        episode_id: episodeId,
        segment_id: segmentId,
        title: `${episode.title} - Segment #${segment.segment_number}`,
        final_prompt: prompt,
        is_segment: true,
        sora_generation_status: 'pending',
        sora_generation_metadata: {
          segment_number: segment.segment_number,
          requested_duration: segment.estimated_duration,
          narrative_beat: segment.narrative_beat
        }
      })
      .select()
      .single()

    if (videoError) {
      console.error('Error creating video record:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video record', details: videoError.message },
        { status: 500 }
      )
    }

    // Increment video usage counter
    await incrementUsage(supabase, user.id, 'videos')

    // Trigger Sora generation (async - will update video record when complete)
    // This is a placeholder - actual Sora API integration would go here
    triggerSoraGeneration(video.id, prompt, segment.estimated_duration).catch(error => {
      console.error('Error triggering Sora generation:', error)
    })

    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: 'Video generation started. You will be notified when it completes.'
    })
  } catch (error: any) {
    console.error('Error generating video:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Triggers async Sora video generation
 * Updates video record with status and URL when complete
 */
async function triggerSoraGeneration(
  videoId: string,
  prompt: string,
  duration: number
): Promise<void> {
  const supabase = await createClient()

  try {
    // Update status to generating
    await supabase
      .from('videos')
      .update({
        sora_generation_status: 'generating',
        sora_generation_started_at: new Date().toISOString()
      })
      .eq('id', videoId)

    // PLACEHOLDER: Actual Sora API call would go here
    // For now, we'll simulate the API call structure:

    /*
    const soraResponse = await openai.videos.generate({
      model: 'sora-turbo',
      prompt: prompt,
      duration: duration,
      resolution: '1080p',
      fps: 24
    })

    // Poll for completion (Sora returns a job ID)
    const videoUrl = await pollSoraJob(soraResponse.job_id)

    // Update video record with completed status and URL
    await supabase
      .from('videos')
      .update({
        sora_generation_status: 'completed',
        sora_generation_completed_at: new Date().toISOString(),
        sora_video_url: videoUrl,
        video_url: videoUrl // Main video URL field
      })
      .eq('id', videoId)
    */

    // For development: Mark as completed after 5 seconds with placeholder
    setTimeout(async () => {
      await supabase
        .from('videos')
        .update({
          sora_generation_status: 'completed',
          sora_generation_completed_at: new Date().toISOString(),
          sora_video_url: 'https://placeholder.com/video.mp4', // Placeholder
          video_url: 'https://placeholder.com/video.mp4'
        })
        .eq('id', videoId)
    }, 5000)

  } catch (error: any) {
    console.error('Sora generation error:', error)

    // Update video record with error status
    await supabase
      .from('videos')
      .update({
        sora_generation_status: 'error',
        sora_generation_error: error.message
      })
      .eq('id', videoId)

    throw error
  }
}

/**
 * Polls Sora job until completion
 * (Placeholder for actual implementation)
 */
async function pollSoraJob(jobId: string): Promise<string> {
  // Poll every 5 seconds until job completes
  // Return video URL when ready
  // This is a placeholder - actual implementation would use Sora's job status API
  return 'https://placeholder.com/video.mp4'
}
