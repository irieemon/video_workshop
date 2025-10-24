import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface SoraGenerationSettings {
  duration?: number // in seconds (4-20s)
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

    // Default settings
    const settings: SoraGenerationSettings = {
      duration: body.settings?.duration || 5,
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

    // Check if video has a final prompt
    if (!video.final_prompt) {
      return NextResponse.json(
        { error: 'Video must have a final prompt before generation' },
        { status: 400 }
      )
    }

    // Check if already generating
    if (video.sora_generation_status === 'queued' || video.sora_generation_status === 'in_progress') {
      return NextResponse.json(
        { error: 'Video generation already in progress' },
        { status: 409 }
      )
    }

    // Calculate estimated cost
    const estimatedCost = calculateCost(settings.duration || 5, settings.resolution || '1080p')

    // Create Sora generation job
    let soraJobId: string
    try {
      // ⚠️ PLACEHOLDER: This needs to be replaced with actual Sora API endpoint
      // The actual Sora API uses: POST /v1/video/generations
      // See SORA-INTEGRATION-COMPLETE.md for correct implementation

      // For now, generate a mock job ID for development
      soraJobId = `sora_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // TODO: Replace with actual Sora API call:
      // const response = await fetch('https://api.openai.com/v1/video/generations', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     model: settings.model,
      //     prompt: video.final_prompt,
      //     duration: settings.duration,
      //     aspect_ratio: settings.aspect_ratio,
      //     resolution: settings.resolution,
      //   }),
      // })
      // const data = await response.json()
      // soraJobId = data.id || data.job_id
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
 * Calculate estimated cost for Sora video generation
 */
function calculateCost(duration: number, resolution: string): number {
  const baseCost = 1.00 // Base cost per video
  let durationMultiplier = 1.0
  let resolutionMultiplier = 1.0

  // Duration pricing (per second over base 5s)
  if (duration > 5) {
    durationMultiplier = 1.0 + ((duration - 5) * 0.1)
  }

  // Resolution pricing
  switch (resolution) {
    case '1080p':
      resolutionMultiplier = 1.5
      break
    case '720p':
      resolutionMultiplier = 1.0
      break
    case '480p':
      resolutionMultiplier = 0.7
      break
    default:
      resolutionMultiplier = 1.0
  }

  return parseFloat((baseCost * durationMultiplier * resolutionMultiplier).toFixed(4))
}
