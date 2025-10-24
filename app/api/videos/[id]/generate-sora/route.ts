import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-JK5lVhiqePvkP3UHeLcABv0p',
})

interface SoraGenerationSettings {
  duration?: number // in seconds (4, 8, or 12 for Sora 2)
  aspect_ratio?: '16:9' | '9:16' | '1:1'
  resolution?: '1080p' | '720p'
  model?: 'sora-2' | 'sora-2-pro'
}

interface SoraGenerationRequest {
  settings?: SoraGenerationSettings
}

/**
 * POST /api/videos/[id]/generate-sora
 * Initiates Sora video generation for a completed video prompt
 */
export async function POST(
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
    const body: SoraGenerationRequest = await request.json()

    // Validate and normalize duration to Sora 2 supported values (4, 8, 12)
    const requestedDuration = body.settings?.duration || 4
    let duration = 4 // default
    if (requestedDuration >= 12) duration = 12
    else if (requestedDuration >= 8) duration = 8
    else duration = 4

    // Default settings
    const settings: SoraGenerationSettings = {
      duration,
      aspect_ratio: body.settings?.aspect_ratio || '9:16',
      resolution: body.settings?.resolution || '1080p',
      model: body.settings?.model || 'sora-2',
    }

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

    // Check if video has an optimized prompt
    console.log('Video data:', { id: video.id, optimized_prompt: video.optimized_prompt, title: video.title })
    if (!video.optimized_prompt) {
      return NextResponse.json(
        { error: 'Video must have a final prompt before generation' },
        { status: 400 }
      )
    }

    // Check if already generating (allow retry if stuck for > 15 minutes)
    if (video.sora_generation_status === 'queued' || video.sora_generation_status === 'in_progress') {
      // Check if generation has been stuck for more than 15 minutes
      if (video.sora_started_at) {
        const startedAt = new Date(video.sora_started_at)
        const now = new Date()
        const minutesElapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60)

        if (minutesElapsed < 15) {
          return NextResponse.json(
            { error: 'Video generation already in progress' },
            { status: 409 }
          )
        }

        // If stuck for > 15 minutes, allow retry
        console.log(`Generation stuck for ${minutesElapsed.toFixed(0)} minutes, allowing retry`)
      } else {
        // No start time, shouldn't happen but allow retry
        console.log('No start time found, allowing retry')
      }
    }

    // Calculate estimated cost
    const estimatedCost = calculateCost(settings.duration || 5, settings.resolution || '1080p')

    // Create Sora generation job using OpenAI SDK
    let soraJobId: string
    try {
      const size = convertAspectRatioToSize(
        settings.aspect_ratio || '9:16',
        settings.resolution || '1080p'
      )

      console.log('Creating Sora video with settings:', {
        model: settings.model,
        duration: settings.duration,
        size,
        aspect_ratio: settings.aspect_ratio,
        resolution: settings.resolution,
      })

      const videoGeneration = await openai.videos.create({
        model: settings.model as 'sora-2' | 'sora-2-pro',
        prompt: video.optimized_prompt,
        seconds: settings.duration?.toString() || '5',
        size: size,
      })

      console.log('Sora video generation started:', videoGeneration)
      soraJobId = videoGeneration.id
    } catch (apiError: any) {
      console.error('Sora API error:', apiError)
      return NextResponse.json(
        { error: 'Failed to initiate video generation', details: apiError.message },
        { status: 500 }
      )
    }

    // Update video record with generation info
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        sora_job_id: soraJobId,
        sora_generation_status: 'queued',
        sora_generation_settings: settings,
        sora_generation_cost: estimatedCost,
        sora_started_at: new Date().toISOString(),
        sora_error_message: null,
      })
      .eq('id', videoId)

    if (updateError) {
      console.error('Failed to update video record:', updateError)
      return NextResponse.json(
        { error: 'Failed to update video status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: soraJobId,
      status: 'queued',
      estimatedCost,
      message: 'Video generation initiated successfully',
    })
  } catch (error: any) {
    console.error('Generate Sora error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Convert aspect ratio and resolution to Sora API size parameter
 */
function convertAspectRatioToSize(
  aspectRatio: '16:9' | '9:16' | '1:1',
  resolution: '1080p' | '720p'
): string {
  const resHeight = resolution === '1080p' ? 1080 : 720

  switch (aspectRatio) {
    case '16:9':
      return resolution === '1080p' ? '1920x1080' : '1280x720'
    case '9:16':
      return resolution === '1080p' ? '1080x1920' : '720x1280'
    case '1:1':
      return `${resHeight}x${resHeight}`
    default:
      return '720x1280' // Default to 9:16 720p
  }
}

/**
 * Calculate estimated cost for Sora video generation
 * Based on duration tiers: 4s (base), 8s (2x), 12s (3x)
 */
function calculateCost(duration: number, resolution: string): number {
  const baseCost = 1.00 // Base cost for 4 seconds
  let durationMultiplier = 1.0
  let resolutionMultiplier = 1.0

  // Duration pricing tiers (4s, 8s, 12s)
  if (duration >= 12) {
    durationMultiplier = 3.0 // 12 seconds
  } else if (duration >= 8) {
    durationMultiplier = 2.0 // 8 seconds
  } else {
    durationMultiplier = 1.0 // 4 seconds
  }

  // Resolution pricing
  switch (resolution) {
    case '1080p':
      resolutionMultiplier = 1.5
      break
    case '720p':
      resolutionMultiplier = 1.0
      break
    default:
      resolutionMultiplier = 1.0
  }

  return parseFloat((baseCost * durationMultiplier * resolutionMultiplier).toFixed(4))
}
