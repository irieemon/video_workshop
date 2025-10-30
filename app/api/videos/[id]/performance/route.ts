import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Validation schema for performance metrics
 */
const performanceMetricsSchema = z.object({
  platform: z.enum(['tiktok', 'instagram']),
  views: z.number().min(0).int(),
  likes: z.number().min(0).int(),
  comments: z.number().min(0).int(),
  shares: z.number().min(0).int(),
  saves: z.number().min(0).int().default(0),
  watch_time_seconds: z.number().min(0).optional().nullable(),
  completion_rate: z.number().min(0).max(100).optional().nullable(),
  traffic_source: z.enum(['fyp', 'profile', 'hashtag', 'share', 'other']).optional().nullable(),
  recorded_at: z.string().optional(), // ISO timestamp, defaults to now
})

type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>

/**
 * GET /api/videos/[id]/performance
 * Fetch all performance metrics for a video with aggregates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Verify video belongs to user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch all performance metrics for this video
    const { data: metrics, error: metricsError } = await supabase
      .from('video_performance')
      .select('*')
      .eq('video_id', videoId)
      .order('recorded_at', { ascending: false })

    if (metricsError) {
      console.error('Error fetching performance metrics:', metricsError)
      return NextResponse.json(
        { error: 'Failed to fetch performance metrics' },
        { status: 500 }
      )
    }

    // Calculate aggregates
    const aggregates = calculateAggregates(metrics || [])

    return NextResponse.json({
      metrics: metrics || [],
      aggregates,
      count: metrics?.length || 0,
    })
  } catch (error: any) {
    console.error('Performance GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/videos/[id]/performance
 * Add new performance metrics for a video
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Verify video belongs to user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = performanceMetricsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const metricsData = validationResult.data

    // Check for duplicate timestamp (prevent accidental double-entry within same hour)
    if (metricsData.recorded_at) {
      const recordedDate = new Date(metricsData.recorded_at)
      const hourStart = new Date(recordedDate)
      hourStart.setMinutes(0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hourEnd.getHours() + 1)

      const { data: existingMetrics } = await supabase
        .from('video_performance')
        .select('id')
        .eq('video_id', videoId)
        .eq('platform', metricsData.platform)
        .gte('recorded_at', hourStart.toISOString())
        .lt('recorded_at', hourEnd.toISOString())
        .limit(1)

      if (existingMetrics && existingMetrics.length > 0) {
        return NextResponse.json(
          {
            error: 'Duplicate entry detected',
            message: `Performance metrics for ${metricsData.platform} already exist for this hour. Please update the existing entry instead.`,
          },
          { status: 409 }
        )
      }
    }

    // Insert performance metrics
    const { data: newMetrics, error: insertError } = await supabase
      .from('video_performance')
      .insert({
        video_id: videoId,
        platform: metricsData.platform,
        views: metricsData.views,
        likes: metricsData.likes,
        comments: metricsData.comments,
        shares: metricsData.shares,
        saves: metricsData.saves,
        watch_time_seconds: metricsData.watch_time_seconds,
        completion_rate: metricsData.completion_rate,
        traffic_source: metricsData.traffic_source,
        recorded_at: metricsData.recorded_at || new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting performance metrics:', insertError)
      return NextResponse.json(
        { error: 'Failed to save performance metrics' },
        { status: 500 }
      )
    }

    return NextResponse.json(newMetrics, { status: 201 })
  } catch (error: any) {
    console.error('Performance POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Calculate aggregate statistics from performance metrics
 */
function calculateAggregates(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      total_views: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_saves: 0,
      avg_engagement_rate: 0,
      avg_completion_rate: 0,
      best_platform: null,
      latest_metrics: null,
    }
  }

  const totals = metrics.reduce(
    (acc, m) => ({
      views: acc.views + (m.views || 0),
      likes: acc.likes + (m.likes || 0),
      comments: acc.comments + (m.comments || 0),
      shares: acc.shares + (m.shares || 0),
      saves: acc.saves + (m.saves || 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  )

  // Calculate average engagement rate (likes + comments + shares) / views
  const avgEngagementRate =
    totals.views > 0
      ? ((totals.likes + totals.comments + totals.shares) / totals.views) * 100
      : 0

  // Calculate average completion rate
  const completionRates = metrics
    .filter((m) => m.completion_rate !== null)
    .map((m) => m.completion_rate)
  const avgCompletionRate =
    completionRates.length > 0
      ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      : 0

  // Determine best performing platform
  const platformPerformance: { [key: string]: number } = {}
  metrics.forEach((m) => {
    if (!platformPerformance[m.platform]) {
      platformPerformance[m.platform] = 0
    }
    platformPerformance[m.platform] += m.views || 0
  })
  const bestPlatform =
    Object.keys(platformPerformance).length > 0
      ? Object.keys(platformPerformance).reduce((a, b) =>
          platformPerformance[a] > platformPerformance[b] ? a : b
        )
      : null

  return {
    total_views: totals.views,
    total_likes: totals.likes,
    total_comments: totals.comments,
    total_shares: totals.shares,
    total_saves: totals.saves,
    avg_engagement_rate: parseFloat(avgEngagementRate.toFixed(2)),
    avg_completion_rate: parseFloat(avgCompletionRate.toFixed(2)),
    best_platform: bestPlatform,
    latest_metrics: metrics[0], // Already ordered by recorded_at desc
  }
}
