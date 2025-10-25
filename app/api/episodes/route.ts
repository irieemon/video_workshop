import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Episode, EpisodeStatus } from '@/lib/types/database.types'

/**
 * GET /api/episodes?seriesId=xxx
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

    // Fetch episodes for this series
    // RLS policies handle user filtering automatically
    const { data: episodes, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true })

    if (error) {
      console.error('Failed to fetch episodes:', error)
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
 * POST /api/episodes
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
    const {
      series_id,
      season_number,
      episode_number,
      title,
      logline,
      screenplay_text,
      structured_screenplay,
      status,
      current_session_id,
    } = body

    // Validate required fields
    if (!series_id || !season_number || !episode_number || !title) {
      return NextResponse.json(
        { error: 'series_id, season_number, episode_number, and title are required' },
        { status: 400 }
      )
    }

    // Verify user owns this series
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', series_id)
      .eq('user_id', user.id)
      .single()

    if (seriesError || !series) {
      return NextResponse.json(
        { error: 'Series not found' },
        { status: 404 }
      )
    }

    // Create episode
    // Get user_id from series for data consistency
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .insert({
        series_id,
        user_id: series.user_id,
        season_number,
        episode_number,
        title,
        logline: logline || null,
        screenplay_text: screenplay_text || null,
        structured_screenplay: structured_screenplay || null,
        status: status || 'draft',
        current_session_id: current_session_id || null,
      })
      .select()
      .single()

    if (episodeError) {
      console.error('Failed to create episode:', episodeError)
      return NextResponse.json(
        { error: 'Failed to create episode', details: episodeError.message },
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
