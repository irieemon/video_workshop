import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/segment-groups/[id]
 *
 * Fetches a segment group with all its segments and generated videos.
 * Useful for displaying segment generation progress and status.
 *
 * Returns:
 * - segmentGroup: Segment group record with metadata
 * - episode: Associated episode info
 * - segments: Array of segments with their videos
 * - progress: Generation progress summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch segment group (RLS will filter by user)
    const { data: segmentGroup, error: groupError } = await supabase
      .from('segment_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError || !segmentGroup) {
      return NextResponse.json({ error: 'Segment group not found' }, { status: 404 })
    }

    // Fetch associated episode
    const { data: episode } = await supabase
      .from('episodes')
      .select('id, title, series_id, season_number, episode_number')
      .eq('id', segmentGroup.episode_id)
      .single()

    // Fetch all segments for this episode
    const { data: segments, error: segmentsError } = await supabase
      .from('video_segments')
      .select('*')
      .eq('episode_id', segmentGroup.episode_id)
      .order('segment_number', { ascending: true })

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch segments', details: segmentsError.message },
        { status: 500 }
      )
    }

    // Fetch videos for all segments
    const segmentIds = segments?.map((s) => s.id) || []
    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .in('segment_id', segmentIds)

    // Map videos to segments
    const segmentsWithVideos = segments?.map((segment) => ({
      ...segment,
      video: videos?.find((v) => v.segment_id === segment.id) || null,
    })) || []

    // Calculate progress
    const completedCount = segmentsWithVideos.filter((s) => s.video !== null).length
    const failedCount = segmentsWithVideos.filter(
      (s) => s.video && s.video.sora_generation_status === 'failed'
    ).length
    const generatingCount = segmentsWithVideos.filter(
      (s) =>
        s.video &&
        (s.video.sora_generation_status === 'queued' ||
          s.video.sora_generation_status === 'in_progress')
    ).length
    const pendingCount = segmentGroup.total_segments - completedCount

    const progress = {
      total: segmentGroup.total_segments,
      completed: completedCount,
      failed: failedCount,
      generating: generatingCount,
      pending: pendingCount,
      percentComplete: Math.round((completedCount / segmentGroup.total_segments) * 100),
    }

    return NextResponse.json({
      segmentGroup,
      episode,
      segments: segmentsWithVideos,
      progress,
    })
  } catch (error: any) {
    console.error('Get segment group error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/segment-groups/[id]
 *
 * Updates a segment group (status, completed count, etc.)
 *
 * Body:
 * - status?: 'planning' | 'generating' | 'partial' | 'complete' | 'error'
 * - completedSegments?: number
 * - actualCost?: number
 * - errorMessage?: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, completedSegments, actualCost, errorMessage } = body

    // Build update object
    const updates: any = {}
    if (status) updates.status = status
    if (completedSegments !== undefined) updates.completed_segments = completedSegments
    if (actualCost !== undefined) updates.actual_cost = actualCost
    if (errorMessage !== undefined) updates.error_message = errorMessage

    // Set generation timestamps based on status
    if (status === 'generating' && !updates.generation_started_at) {
      updates.generation_started_at = new Date().toISOString()
    }
    if (status === 'complete' || status === 'error') {
      updates.generation_completed_at = new Date().toISOString()
    }

    const { data: updatedGroup, error: updateError } = await supabase
      .from('segment_groups')
      .update(updates)
      .eq('id', groupId)
      .eq('user_id', user.id) // Ensure user owns this group
      .select()
      .single()

    if (updateError || !updatedGroup) {
      console.error('Error updating segment group:', updateError)
      return NextResponse.json(
        { error: 'Failed to update segment group', details: updateError?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ segmentGroup: updatedGroup })
  } catch (error: any) {
    console.error('Update segment group error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/segment-groups/[id]
 *
 * Deletes a segment group and optionally its segments and videos
 *
 * Query params:
 * - deleteSegments?: boolean - Also delete video_segments records
 * - deleteVideos?: boolean - Also delete associated video records
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const deleteSegments = searchParams.get('deleteSegments') === 'true'
    const deleteVideos = searchParams.get('deleteVideos') === 'true'

    // Fetch group to get episode_id
    const { data: group } = await supabase
      .from('segment_groups')
      .select('episode_id')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Segment group not found' }, { status: 404 })
    }

    // Delete videos if requested
    if (deleteVideos) {
      await supabase
        .from('videos')
        .delete()
        .eq('segment_group_id', groupId)
    }

    // Delete segments if requested (CASCADE will handle this automatically)
    if (deleteSegments && group.episode_id) {
      await supabase
        .from('video_segments')
        .delete()
        .eq('episode_id', group.episode_id)
    }

    // Delete segment group
    const { error: deleteError } = await supabase
      .from('segment_groups')
      .delete()
      .eq('id', groupId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting segment group:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete segment group', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deletedGroupId: groupId })
  } catch (error: any) {
    console.error('Delete segment group error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
