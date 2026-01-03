import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { decryptApiKey } from '@/lib/encryption/api-key-encryption'

// Platform OpenAI client (for premium users)
const platformOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-JK5lVhiqePvkP3UHeLcABv0p',
})

/**
 * Get the appropriate OpenAI client based on whether user provides their own key
 */
async function getOpenAIClient(
  supabase: any,
  userId: string,
  userApiKeyId?: string
): Promise<{ client: OpenAI; isUserKey: boolean }> {
  if (!userApiKeyId) {
    return { client: platformOpenAI, isUserKey: false }
  }

  // Fetch user's API key
  const { data: keyRecord, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key, is_valid, provider')
    .eq('id', userApiKeyId)
    .eq('user_id', userId)
    .single()

  if (error || !keyRecord) {
    throw new Error('API key not found')
  }

  if (!keyRecord.is_valid) {
    throw new Error('API key is marked as invalid. Please update your key in settings.')
  }

  if (keyRecord.provider !== 'openai') {
    throw new Error('Selected key is not an OpenAI key')
  }

  // Decrypt the key
  const apiKey = decryptApiKey(keyRecord.encrypted_key)

  // Create a new OpenAI client with user's key
  const userClient = new OpenAI({ apiKey })

  return { client: userClient, isUserKey: true }
}

interface SoraGenerationSettings {
  duration?: number // in seconds (4, 8, 12, or 15 for Sora 2)
  aspect_ratio?: '16:9' | '9:16' | '1:1'
  resolution?: '1080p' | '720p'
  model?: 'sora-2' | 'sora-2-pro'
}

interface SoraGenerationRequest {
  settings?: SoraGenerationSettings
  userApiKeyId?: string // For BYOK users
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

    // Validate and normalize duration to Sora 2 supported values (4, 8, 12, 15)
    const requestedDuration = body.settings?.duration || 4
    let duration = 4 // default
    if (requestedDuration >= 15) duration = 15
    else if (requestedDuration >= 12) duration = 12
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

    // Get the appropriate OpenAI client (platform or user's BYOK key)
    let openai: OpenAI
    let isUserKey = false
    try {
      const clientResult = await getOpenAIClient(supabase, user.id, body.userApiKeyId)
      openai = clientResult.client
      isUserKey = clientResult.isUserKey

      if (isUserKey) {
        console.log('Using user BYOK key for generation')

        // Update last_used_at for the API key
        await supabase
          .from('user_api_keys')
          .update({
            last_used_at: new Date().toISOString(),
            usage_count: supabase.rpc('increment', { x: 1 }), // Will need to handle this differently
          })
          .eq('id', body.userApiKeyId)
      }
    } catch (keyError: any) {
      console.error('Failed to get OpenAI client:', keyError)
      return NextResponse.json(
        { error: keyError.message || 'Failed to access API key' },
        { status: 400 }
      )
    }

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
        isUserKey,
      })

      const duration = settings.duration?.toString() || '5'
      const videoGeneration = await openai.videos.create({
        model: settings.model as 'sora-2' | 'sora-2-pro',
        prompt: video.optimized_prompt,
        ...(duration && { seconds: duration as any }),
        size: size as any,
      })

      console.log('Sora video generation started:', videoGeneration)
      soraJobId = videoGeneration.id
    } catch (apiError: any) {
      console.error('Sora API error:', apiError)

      // If using user's key and it fails, mark it as potentially invalid
      if (isUserKey && apiError?.status === 401) {
        await supabase
          .from('user_api_keys')
          .update({
            is_valid: false,
            validation_error: 'Authentication failed. Please check your API key.',
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', body.userApiKeyId)
      }

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
      estimatedCost: isUserKey ? 0 : estimatedCost, // No platform cost for BYOK
      usedUserKey: isUserKey,
      message: isUserKey
        ? 'Video generation initiated using your API key'
        : 'Video generation initiated successfully',
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
 * Based on duration tiers: 4s (base), 8s (2x), 12s (3x), 15s (3.75x)
 */
function calculateCost(duration: number, resolution: string): number {
  const baseCost = 1.00 // Base cost for 4 seconds
  let durationMultiplier = 1.0
  let resolutionMultiplier = 1.0

  // Duration pricing tiers (4s, 8s, 12s, 15s)
  if (duration >= 15) {
    durationMultiplier = 3.75 // 15 seconds
  } else if (duration >= 12) {
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
