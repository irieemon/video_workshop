import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAPILogger, LOG_MESSAGES } from '@/lib/logger'
import { checkRateLimit, createRateLimitKey, RATE_LIMITS, createRateLimitResponse, getRateLimitHeaders } from '@/lib/rate-limit'
import { ProjectWithCountsRaw, transformProjectWithCounts } from '@/lib/types/api.types'

// GET /api/projects - List all projects for authenticated user
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/projects', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitKey = createRateLimitKey(user.id, 'projects:list')
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
    logger.info(LOG_MESSAGES.API_REQUEST_START)

    // Fetch projects with video and series counts
    const { data: projects, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        videos:videos(count),
        series:series!series_project_id_fkey(count)
      `
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Transform the data to include counts
    const transformedProjects = (projects as unknown as ProjectWithCountsRaw[]).map(transformProjectWithCounts)

    logger.info(LOG_MESSAGES.API_REQUEST_SUCCESS, { projectCount: transformedProjects.length })
    return NextResponse.json(transformedProjects, {
      headers: getRateLimitHeaders(rateLimit)
    })
  } catch (error: any) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/projects', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitKey = createRateLimitKey(user.id, 'projects:create')
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
    const { createProjectSchema, validateRequest, createValidationError } = await import('@/lib/validation/schemas')

    const validation = validateRequest(createProjectSchema, body)
    if (!validation.success) {
      logger.warn(LOG_MESSAGES.API_VALIDATION_ERROR, { error: validation.error })
      return NextResponse.json(
        createValidationError(validation.error, validation.details),
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Check user's profile and tier limits
    logger.info(LOG_MESSAGES.QUOTA_CHECK)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, usage_quota, usage_current')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Check free tier project limit
    if (profile.subscription_tier === 'free') {
      const currentProjects = profile.usage_current?.projects || 0
      const maxProjects = profile.usage_quota?.projects || 3

      if (currentProjects >= maxProjects) {
        logger.warn(LOG_MESSAGES.QUOTA_EXCEEDED, { current: currentProjects, max: maxProjects })
        return NextResponse.json(
          {
            error: 'Project limit reached',
            code: 'QUOTA_EXCEEDED',
            message: `Free tier is limited to ${maxProjects} projects. Upgrade to Premium for unlimited projects.`,
          },
          { status: 429 }
        )
      }
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
      })
      .select()
      .single()

    if (error) throw error

    // Increment project count
    await supabase
      .from('profiles')
      .update({
        usage_current: {
          ...profile.usage_current,
          projects: (profile.usage_current?.projects || 0) + 1,
        },
      })
      .eq('id', user.id)

    logger.info(LOG_MESSAGES.API_REQUEST_SUCCESS, { projectId: project.id })
    logger.info(LOG_MESSAGES.QUOTA_UPDATE, { newCount: (profile.usage_current?.projects || 0) + 1 })

    return NextResponse.json(project, {
      status: 201,
      headers: getRateLimitHeaders(rateLimit)
    })
  } catch (error: any) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error)
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}
