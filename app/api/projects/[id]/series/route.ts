import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/projects/[id]/series - List all series in a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      throw projectError
    }

    // Fetch series with episode counts
    const { data: series, error } = await supabase
      .from('series')
      .select(
        `
        *,
        episodes:series_episodes(count),
        characters:series_characters(count),
        settings:series_settings(count)
      `
      )
      .eq('project_id', projectId)
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

// POST /api/projects/[id]/series - Create a new series
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      throw projectError
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      genre,
      visual_template,
      enforce_continuity,
      allow_continuity_breaks
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Series name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate series name in project
    const { data: existingSeries } = await supabase
      .from('series')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', name.trim())
      .single()

    if (existingSeries) {
      return NextResponse.json(
        { error: 'A series with this name already exists in this project' },
        { status: 409 }
      )
    }

    // Validate genre if provided
    const validGenres = ['narrative', 'product-showcase', 'educational', 'brand-content', 'other']
    if (genre && !validGenres.includes(genre)) {
      return NextResponse.json(
        { error: `Invalid genre. Must be one of: ${validGenres.join(', ')}` },
        { status: 400 }
      )
    }

    // Create series
    const { data: newSeries, error } = await supabase
      .from('series')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        genre: genre || null,
        visual_template: visual_template || {},
        enforce_continuity: enforce_continuity !== undefined ? enforce_continuity : true,
        allow_continuity_breaks: allow_continuity_breaks !== undefined ? allow_continuity_breaks : true,
      })
      .select()
      .single()

    if (error) throw error

    // Note: series_visual_style entry is auto-created by database trigger

    return NextResponse.json(newSeries, { status: 201 })
  } catch (error: any) {
    console.error('Series creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create series' },
      { status: 500 }
    )
  }
}
