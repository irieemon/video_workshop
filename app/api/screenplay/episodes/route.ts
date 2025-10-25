import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/screenplay/episodes?seriesId=xxx
 * Get all episodes for a series
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get('seriesId')

    if (!seriesId) {
      return NextResponse.json(
        { error: 'seriesId required' },
        { status: 400 }
      )
    }

    // Verify user owns this series
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError || !series) {
      return NextResponse.json(
        { error: 'Series not found' },
        { status: 404 }
      )
    }

    // Get episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('episode_number', { ascending: true })

    if (episodesError) {
      console.error('Failed to fetch episodes:', episodesError)
      return NextResponse.json(
        { error: 'Failed to fetch episodes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ episodes })
  } catch (error: any) {
    console.error('Get episodes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/screenplay/episodes
 * Create a new episode
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { seriesId, episodeData } = body

    // Verify user owns this series
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError || !series) {
      return NextResponse.json(
        { error: 'Series not found' },
        { status: 404 }
      )
    }

    // Get next episode number
    const { data: existingEpisodes } = await supabase
      .from('episodes')
      .select('episode_number')
      .eq('series_id', seriesId)
      .order('episode_number', { ascending: false })
      .limit(1)

    const nextEpisodeNumber = existingEpisodes && existingEpisodes.length > 0
      ? existingEpisodes[0].episode_number + 1
      : 1

    // Create episode
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .insert({
        series_id: seriesId,
        episode_number: episodeData.episode_number || nextEpisodeNumber,
        title: episodeData.title || `Episode ${nextEpisodeNumber}`,
        logline: episodeData.logline || null,
        structure_type: episodeData.structure_type || 'three_act',
        act_breakdown: episodeData.act_breakdown || {},
        plots: episodeData.plots || {},
        story_beats: episodeData.story_beats || {},
        character_development: episodeData.character_development || {},
        runtime_minutes: episodeData.runtime_minutes || null,
        status: episodeData.status || 'planning',
        notes: episodeData.notes || null,
      })
      .select()
      .single()

    if (episodeError) {
      console.error('Failed to create episode:', episodeError)
      return NextResponse.json(
        { error: 'Failed to create episode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ episode })
  } catch (error: any) {
    console.error('Create episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
