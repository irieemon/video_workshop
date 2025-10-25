import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAPILogger, LOG_MESSAGES } from '@/lib/logger'
import { checkRateLimit, createRateLimitKey, RATE_LIMITS, createRateLimitResponse, getRateLimitHeaders } from '@/lib/rate-limit'
import { createVideoSchema, validateRequest, createValidationError } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/videos', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitKey = createRateLimitKey(user.id, 'videos:create')
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.WRITE)

  if (!rateLimit.allowed) {
    logger.warn(LOG_MESSAGES.API_RATE_LIMIT, { remaining: rateLimit.remaining })
    return NextResponse.json(
      createRateLimitResponse(rateLimit),
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimit)
      }
    )
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateRequest(createVideoSchema, body)

    if (!validation.success) {
      logger.warn(LOG_MESSAGES.API_VALIDATION_ERROR, { error: validation.error })
      return NextResponse.json(
        createValidationError(validation.error, validation.details),
        { status: 400 }
      )
    }

    const {
      projectId,
      seriesId,
      episodeId,
      selectedCharacters,
      selectedSettings,
      title,
      userBrief,
      agentDiscussion,
      detailedBreakdown,
      optimizedPrompt,
      characterCount,
      platform,
      hashtags,
      generation_source,
      source_metadata,
    } = validation.data

    // Get user's profile to check quota
    logger.info(LOG_MESSAGES.QUOTA_CHECK)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .limit(1)

    const profile = profiles?.[0]

    if (profileError || !profile) {
      logger.error('Profile fetch failed', profileError as Error)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Re-enable quota enforcement (was temporarily disabled)
    if (profile.subscription_tier === 'free') {
      const currentVideos = profile.usage_current?.videos_this_month || 0
      const maxVideos = profile.usage_quota?.videos_per_month || 10

      if (currentVideos >= maxVideos) {
        logger.warn(LOG_MESSAGES.QUOTA_EXCEEDED, {
          tier: profile.subscription_tier,
          current: currentVideos,
          max: maxVideos
        })
        return NextResponse.json(
          {
            error: 'Monthly video limit reached',
            code: 'QUOTA_EXCEEDED',
            message: `Free tier is limited to ${maxVideos} videos per month. Upgrade to Premium for unlimited videos.`,
          },
          { status: 429 }
        )
      }
    }

    // Create the video (without hashtags - they go in separate table)
    const { data: video, error: videoError} = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        project_id: projectId,
        series_id: seriesId,
        episode_id: episodeId || null,
        series_characters_used: selectedCharacters,
        series_settings_used: selectedSettings,
        title,
        user_brief: userBrief,
        agent_discussion: agentDiscussion,
        detailed_breakdown: detailedBreakdown,
        optimized_prompt: optimizedPrompt,
        character_count: characterCount,
        platform,
        generation_source: generation_source || 'manual',
        source_metadata: source_metadata || {},
      })
      .select()
      .single()

    if (videoError) {
      logger.error('Video creation failed', videoError)
      return NextResponse.json({ error: 'Failed to create video' }, { status: 500 })
    }

    // Insert hashtags into separate table
    if (hashtags && hashtags.length > 0 && video) {
      const hashtagInserts = hashtags.map((tag: string) => ({
        video_id: video.id,
        tag: tag,
        suggested_by: 'platform_expert' as const,
      }))

      const { error: hashtagError } = await supabase
        .from('hashtags')
        .insert(hashtagInserts)

      if (hashtagError) {
        logger.warn('Hashtag insertion failed', { error: hashtagError.message })
        // Don't fail the request, just log the error
      }
    }

    // Increment video counter
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        usage_current: {
          ...profile.usage_current,
          videos_this_month: (profile.usage_current?.videos_this_month || 0) + 1,
        },
      })
      .eq('id', user.id)

    if (updateError) {
      logger.warn('Quota update failed', { error: updateError.message })
      // Don't fail the request, video was created successfully
    } else {
      logger.info(LOG_MESSAGES.QUOTA_UPDATE, {
        newCount: (profile.usage_current?.videos_this_month || 0) + 1
      })
    }

    logger.info(LOG_MESSAGES.API_REQUEST_SUCCESS, { videoId: video.id })

    return NextResponse.json(video, {
      headers: getRateLimitHeaders(rateLimit)
    })
  } catch (error) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/videos', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitKey = createRateLimitKey(user.id, 'videos:list')
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.STANDARD)

  if (!rateLimit.allowed) {
    logger.warn(LOG_MESSAGES.API_RATE_LIMIT, { remaining: rateLimit.remaining })
    return NextResponse.json(
      createRateLimitResponse(rateLimit),
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimit)
      }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    logger.info(LOG_MESSAGES.API_REQUEST_START, { projectId })

    // Build query - RLS will filter by user through project relationship
    let query = supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: videos, error } = await query

    if (error) {
      logger.error(LOG_MESSAGES.DB_QUERY_ERROR, error)
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }

    logger.info(LOG_MESSAGES.API_REQUEST_SUCCESS, { videoCount: videos.length })

    return NextResponse.json(videos, {
      headers: getRateLimitHeaders(rateLimit)
    })
  } catch (error) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
