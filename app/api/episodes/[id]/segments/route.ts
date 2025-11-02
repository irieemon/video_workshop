import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/episodes/[id]/segments
 *
 * Fetches all video segments for an episode, ordered by segment_number.
 * Includes continuity chain information (preceding/following segments).
 *
 * Query params:
 * - includeVideos?: boolean - Include generated video data for each segment
 *
 * Returns:
 * - episode: Basic episode info
 * - segments: Array of video_segments with optional video data
 * - segmentGroup: Associated segment_group if exists
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params
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
    const includeVideos = searchParams.get('includeVideos') === 'true'

    // Fetch episode (RLS will filter by user)
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, title, series_id, user_id')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    // Fetch segments
    const { data: segments, error: segmentsError } = await supabase
      .from('video_segments')
      .select('*')
      .eq('episode_id', episodeId)
      .order('segment_number', { ascending: true })

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch segments', details: segmentsError.message },
        { status: 500 }
      )
    }

    if (!segments || segments.length === 0) {
      return NextResponse.json({
        episode,
        segments: [],
        segmentGroup: null,
        message: 'No segments found for this episode. Call POST /api/episodes/[id]/create-segments to generate them.',
      })
    }

    // Fetch segment group if exists
    const { data: segmentGroup } = await supabase
      .from('segment_groups')
      .select('*')
      .eq('episode_id', episodeId)
      .single()

    // Optionally fetch videos for each segment
    let segmentsWithVideos = segments
    if (includeVideos) {
      const segmentIds = segments.map((s) => s.id)

      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .in('segment_id', segmentIds)
        .order('segment_order', { ascending: true })

      // Map videos to segments
      segmentsWithVideos = segments.map((segment) => ({
        ...segment,
        video: videos?.find((v) => v.segment_id === segment.id) || null,
      }))
    }

    return NextResponse.json({
      episode,
      segments: segmentsWithVideos,
      segmentGroup: segmentGroup || null,
      totalSegments: segments.length,
      completedSegments: segmentGroup?.completed_segments || 0,
    })
  } catch (error: any) {
    console.error('Get segments error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
