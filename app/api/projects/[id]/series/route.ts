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

    // Fetch series through junction table with episode counts
    const { data: seriesAssociations, error } = await supabase
      .from('project_series')
      .select(
        `
        id,
        created_at,
        series:series_id (
          *,
          episodes:series_episodes(count),
          characters:series_characters(count),
          settings:series_settings(count)
        )
      `
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Flatten and transform the data to include counts
    const transformedSeries = seriesAssociations
      ?.map((assoc: any) => {
        if (!assoc.series) return null
        const s = assoc.series
        return {
          ...s,
          episode_count: s.episodes?.[0]?.count || 0,
          character_count: s.characters?.[0]?.count || 0,
          setting_count: s.settings?.[0]?.count || 0,
          episodes: undefined,
          characters: undefined,
          settings: undefined,
        }
      })
      .filter(Boolean) || []

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

    // Check for duplicate series name in project through junction table
    const { data: existingAssociations } = await supabase
      .from('project_series')
      .select(`
        series:series_id (
          id,
          name
        )
      `)
      .eq('project_id', projectId)

    const existingSeries = existingAssociations?.find(
      (assoc: any) => assoc.series?.name === name.trim()
    )

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

    // Create series (no project_id since it's decoupled)
    const { data: newSeries, error: seriesError } = await supabase
      .from('series')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        genre: genre || null,
        visual_template: visual_template || {},
        enforce_continuity: enforce_continuity !== undefined ? enforce_continuity : true,
        allow_continuity_breaks: allow_continuity_breaks !== undefined ? allow_continuity_breaks : true,
      })
      .select()
      .single()

    if (seriesError) throw seriesError

    // Associate series with project through junction table
    const { error: associationError } = await supabase
      .from('project_series')
      .insert({
        project_id: projectId,
        series_id: newSeries.id,
        created_by: user.id,
      })

    if (associationError) {
      // Rollback: delete the series we just created
      await supabase.from('series').delete().eq('id', newSeries.id)
      throw associationError
    }

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
