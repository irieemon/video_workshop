import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId] - Get series with full context
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch series with all related data
    const { data: series, error } = await supabase
      .from('series')
      .select(
        `
        *,
        project:projects!inner(id, name, user_id),
        characters:series_characters(*),
        settings:series_settings(*),
        visual_style:series_visual_style(*),
        seasons:seasons(
          *,
          episodes:series_episodes(count)
        ),
        episodes:series_episodes(
          *,
          video:videos(id, title, status)
        )
      `
      )
      .eq('id', seriesId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw error
    }

    // Verify ownership through project
    const project = Array.isArray(series.project) ? series.project[0] : series.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(series)
  } catch (error: any) {
    console.error('Series fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch series' },
      { status: 500 }
    )
  }
}

// PATCH /api/series/[seriesId] - Update series
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership through project
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, project:projects!inner(id, user_id)')
      .eq('id', seriesId)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw seriesError
    }

    const project = Array.isArray(series.project) ? series.project[0] : series.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Validate genre if provided
    const validGenres = ['narrative', 'product-showcase', 'educational', 'brand-content', 'other']
    if (genre && !validGenres.includes(genre)) {
      return NextResponse.json(
        { error: `Invalid genre. Must be one of: ${validGenres.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object (only include fields that were provided)
    const updateData: any = {}
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Series name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) updateData.description = description?.trim() || null
    if (genre !== undefined) updateData.genre = genre
    if (visual_template !== undefined) updateData.visual_template = visual_template
    if (enforce_continuity !== undefined) updateData.enforce_continuity = enforce_continuity
    if (allow_continuity_breaks !== undefined) updateData.allow_continuity_breaks = allow_continuity_breaks

    // Update series
    const { data: updatedSeries, error } = await supabase
      .from('series')
      .update(updateData)
      .eq('id', seriesId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updatedSeries)
  } catch (error: any) {
    console.error('Series update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update series' },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[seriesId] - Delete series
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership through project
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, project:projects!inner(id, user_id)')
      .eq('id', seriesId)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw seriesError
    }

    const project = Array.isArray(series.project) ? series.project[0] : series.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete series (CASCADE will delete related characters, settings, episodes, etc.)
    const { error } = await supabase
      .from('series')
      .delete()
      .eq('id', seriesId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Series deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete series' },
      { status: 500 }
    )
  }
}
