import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { analyzePerformance, getInsightsCacheKey, shouldRegenerateInsights } from '@/lib/ai/performance-analyzer'

/**
 * GET /api/videos/[id]/performance/insights
 * Generate AI-powered performance insights
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

    // Verify video belongs to user and fetch video data
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        user_id,
        title,
        optimized_prompt,
        hashtags:hashtags(tag),
        sora_generation_settings
      `)
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch performance metrics
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

    if (!metrics || metrics.length === 0) {
      return NextResponse.json(
        {
          error: 'No performance data available',
          message: 'Add performance metrics before generating insights',
        },
        { status: 400 }
      )
    }

    // Check for cached insights
    const cacheKey = getInsightsCacheKey(videoId)
    const { data: cachedInsights } = await supabase
      .from('video_insights_cache')
      .select('*')
      .eq('video_id', videoId)
      .single()

    // Return cached insights if they're still fresh
    if (cachedInsights && !shouldRegenerateInsights(cachedInsights.generated_at)) {
      return NextResponse.json({
        insights: cachedInsights.insights,
        generated_at: cachedInsights.generated_at,
        cached: true,
      })
    }

    // Generate new insights
    try {
      const hashtagsArray = video.hashtags?.map((h: any) => h.tag) || []
      const soraSettings = typeof video.sora_generation_settings === 'string'
        ? JSON.parse(video.sora_generation_settings)
        : video.sora_generation_settings

      const result = await analyzePerformance(
        {
          title: video.title,
          optimized_prompt: video.optimized_prompt,
          sora_duration: soraSettings?.duration,
          hashtags: hashtagsArray,
        },
        metrics
      )

      // Cache the insights
      const { error: cacheError } = await supabase
        .from('video_insights_cache')
        .upsert({
          video_id: videoId,
          insights: result.insights,
          generated_at: result.generated_at,
          metrics_count: metrics.length,
        })

      if (cacheError) {
        console.error('Error caching insights:', cacheError)
        // Continue anyway - caching failure shouldn't prevent returning insights
      }

      return NextResponse.json({
        insights: result.insights,
        generated_at: result.generated_at,
        cached: false,
      })
    } catch (aiError: any) {
      console.error('AI analysis error:', aiError)
      return NextResponse.json(
        {
          error: 'Failed to generate insights',
          message: aiError.message || 'AI service error',
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Insights GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/videos/[id]/performance/insights
 * Clear cached insights to force regeneration
 */
export async function DELETE(
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

    // Delete cached insights
    const { error: deleteError } = await supabase
      .from('video_insights_cache')
      .delete()
      .eq('video_id', videoId)

    if (deleteError) {
      console.error('Error deleting cached insights:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear insights cache' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Insights cache cleared successfully',
    })
  } catch (error: any) {
    console.error('Insights DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
