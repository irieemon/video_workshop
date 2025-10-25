import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/episodes/[id]/videos
 * Get all videos created for this episode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the episode (through series ownership)
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        series_id,
        series:series_id (
          id,
          user_id
        )
      `)
      .eq('id', episodeId)
      .single<{
        id: string
        series_id: string
        series: {
          id: string
          user_id: string
        } | null
      }>()

    if (episodeError) {
      if (episodeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      }
      throw episodeError
    }

    // Check ownership
    if (!episode?.series || episode.series.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all videos for this episode
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        optimized_prompt,
        status,
        character_count,
        sora_video_url,
        platform,
        created_at,
        updated_at
      `)
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false })

    if (videosError) {
      throw videosError
    }

    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error('Get episode videos error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch episode videos' },
      { status: 500 }
    )
  }
}
