import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series - List all series for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Phase 2: Fetch series with episode counts (decoupled from projects)
    const { data: series, error } = await supabase
      .from('series')
      .select(
        `
        *,
        episodes(count),
        characters:series_characters(count),
        settings:series_settings(count)
      `
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Transform the data to include counts
    const transformedSeries = series.map((s: any) => ({
      ...s,
      episode_count: s.episodes[0]?.count || 0,
      character_count: s.characters[0]?.count || 0,
      setting_count: s.settings[0]?.count || 0,
      episodes: undefined,
      characters: undefined,
      settings: undefined,
    }))

    return NextResponse.json(transformedSeries)
  } catch (error: any) {
    console.error('Series fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch series' },
      { status: 500 }
    )
  }
}

// POST /api/series - Create a new series (standalone or project-associated)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      genre,
      project_id,
      visual_template,
      enforce_continuity,
      allow_continuity_breaks,
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Series name is required' },
        { status: 400 }
      )
    }

    // Phase 2: Check for duplicate series name for this user (no project association)
    const { data: existingSeries } = await supabase
      .from('series')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existingSeries) {
      return NextResponse.json(
        { error: 'A series with this name already exists' },
        { status: 409 }
      )
    }

    // If project_id provided, verify it exists and belongs to user (for context only)
    if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
          )
        }
        throw projectError
      }
    }

    // Validate genre if provided
    const validGenres = [
      'narrative',
      'product-showcase',
      'educational',
      'brand-content',
      'other',
    ]
    if (genre && !validGenres.includes(genre)) {
      return NextResponse.json(
        {
          error: `Invalid genre. Must be one of: ${validGenres.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Phase 2: Create series (decoupled from projects, no junction table)
    const { data: newSeries, error: seriesError } = await supabase
      .from('series')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        genre: genre || null,
        visual_template: visual_template || {},
        enforce_continuity:
          enforce_continuity !== undefined ? enforce_continuity : true,
        allow_continuity_breaks:
          allow_continuity_breaks !== undefined
            ? allow_continuity_breaks
            : true,
      })
      .select()
      .single()

    if (seriesError) throw seriesError

    return NextResponse.json(newSeries, { status: 201 })
  } catch (error: any) {
    console.error('Series creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create series' },
      { status: 500 }
    )
  }
}
