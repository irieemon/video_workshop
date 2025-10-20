import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/characters - List all characters in a series
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

    // Fetch characters
    const { data: characters, error } = await supabase
      .from('series_characters')
      .select('*')
      .eq('series_id', seriesId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(characters)
  } catch (error: any) {
    console.error('Characters fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch characters' },
      { status: 500 }
    )
  }
}

// POST /api/series/[seriesId]/characters - Create a new character
export async function POST(
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
      role,
      appearance_details,
      performance_style,
      introduced_episode_id,
      evolution_timeline
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Character description is required' },
        { status: 400 }
      )
    }

    // Check for duplicate character name in series
    const { data: existingCharacter } = await supabase
      .from('series_characters')
      .select('id')
      .eq('series_id', seriesId)
      .eq('name', name.trim())
      .single()

    if (existingCharacter) {
      return NextResponse.json(
        { error: 'A character with this name already exists in this series' },
        { status: 409 }
      )
    }

    // Validate role if provided
    const validRoles = ['protagonist', 'supporting', 'background', 'other']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Create character
    const { data: character, error } = await supabase
      .from('series_characters')
      .insert({
        series_id: seriesId,
        name: name.trim(),
        description: description.trim(),
        role: role || null,
        appearance_details: appearance_details || {},
        performance_style: performance_style?.trim() || null,
        introduced_episode_id: introduced_episode_id || null,
        evolution_timeline: evolution_timeline || []
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(character, { status: 201 })
  } catch (error: any) {
    console.error('Character creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create character' },
      { status: 500 }
    )
  }
}
