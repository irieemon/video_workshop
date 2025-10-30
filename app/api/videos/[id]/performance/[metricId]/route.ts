import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Validation schema for updating performance metrics
 */
const updatePerformanceSchema = z.object({
  views: z.number().min(0).int().optional(),
  likes: z.number().min(0).int().optional(),
  comments: z.number().min(0).int().optional(),
  shares: z.number().min(0).int().optional(),
  saves: z.number().min(0).int().optional(),
  watch_time_seconds: z.number().min(0).optional().nullable(),
  completion_rate: z.number().min(0).max(100).optional().nullable(),
  traffic_source: z.enum(['fyp', 'profile', 'hashtag', 'share', 'other']).optional().nullable(),
})

/**
 * GET /api/videos/[id]/performance/[metricId]
 * Fetch a single performance metric
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metricId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId, metricId } = await params

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

    // Fetch the specific metric
    const { data: metric, error: metricError } = await supabase
      .from('video_performance')
      .select('*')
      .eq('id', metricId)
      .eq('video_id', videoId)
      .single()

    if (metricError || !metric) {
      return NextResponse.json(
        { error: 'Performance metric not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(metric)
  } catch (error: any) {
    console.error('Performance metric GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/videos/[id]/performance/[metricId]
 * Update an existing performance metric
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metricId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId, metricId } = await params

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

    // Verify metric exists and belongs to this video
    const { data: existingMetric, error: existingError } = await supabase
      .from('video_performance')
      .select('*')
      .eq('id', metricId)
      .eq('video_id', videoId)
      .single()

    if (existingError || !existingMetric) {
      return NextResponse.json(
        { error: 'Performance metric not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updatePerformanceSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Update the metric
    const { data: updatedMetric, error: updateError } = await supabase
      .from('video_performance')
      .update(updateData)
      .eq('id', metricId)
      .eq('video_id', videoId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating performance metric:', updateError)
      return NextResponse.json(
        { error: 'Failed to update performance metric' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedMetric)
  } catch (error: any) {
    console.error('Performance metric PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/videos/[id]/performance/[metricId]
 * Delete a performance metric
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metricId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId, metricId } = await params

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

    // Verify metric exists and belongs to this video
    const { data: existingMetric, error: existingError } = await supabase
      .from('video_performance')
      .select('id')
      .eq('id', metricId)
      .eq('video_id', videoId)
      .single()

    if (existingError || !existingMetric) {
      return NextResponse.json(
        { error: 'Performance metric not found' },
        { status: 404 }
      )
    }

    // Delete the metric
    const { error: deleteError } = await supabase
      .from('video_performance')
      .delete()
      .eq('id', metricId)
      .eq('video_id', videoId)

    if (deleteError) {
      console.error('Error deleting performance metric:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete performance metric' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Performance metric deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Performance metric DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
