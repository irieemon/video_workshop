import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/characters/[characterId] - Get specific character
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; characterId: string }> }
) {
  try {
    const { seriesId, characterId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch character with ownership verification
    const { data: character, error } = await supabase
      .from('series_characters')
      .select(
        `
        *,
        series:series!inner(
          id,
          project:projects!inner(id, user_id)
        )
      `
      )
      .eq('id', characterId)
      .eq('series_id', seriesId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      throw error
    }

    const seriesData = Array.isArray(character.series) ? character.series[0] : character.series
    const project = Array.isArray(seriesData.project) ? seriesData.project[0] : seriesData.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove series from response
    const { series, ...characterData } = character
    return NextResponse.json(characterData)
  } catch (error: any) {
    console.error('Character fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch character' },
      { status: 500 }
    )
  }
}

// PATCH /api/series/[seriesId]/characters/[characterId] - Update character
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; characterId: string }> }
) {
  try {
    const { seriesId, characterId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: character, error: charError } = await supabase
      .from('series_characters')
      .select(
        `
        id,
        series:series!inner(
          id,
          project:projects!inner(id, user_id)
        )
      `
      )
      .eq('id', characterId)
      .eq('series_id', seriesId)
      .single()

    if (charError) {
      if (charError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      throw charError
    }

    const seriesData = Array.isArray(character.series) ? character.series[0] : character.series
    const project = Array.isArray(seriesData.project) ? seriesData.project[0] : seriesData.project
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

    // Validate role if provided
    const validRoles = ['protagonist', 'supporting', 'background', 'other']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Character name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) {
      if (!description || description.trim().length === 0) {
        return NextResponse.json(
          { error: 'Character description cannot be empty' },
          { status: 400 }
        )
      }
      updateData.description = description.trim()
    }
    if (role !== undefined) updateData.role = role
    if (appearance_details !== undefined) updateData.appearance_details = appearance_details
    if (performance_style !== undefined) updateData.performance_style = performance_style?.trim() || null
    if (introduced_episode_id !== undefined) updateData.introduced_episode_id = introduced_episode_id
    if (evolution_timeline !== undefined) updateData.evolution_timeline = evolution_timeline

    // Update character
    const { data: updatedCharacter, error } = await supabase
      .from('series_characters')
      .update(updateData)
      .eq('id', characterId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updatedCharacter)
  } catch (error: any) {
    console.error('Character update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update character' },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[seriesId]/characters/[characterId] - Delete character
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; characterId: string }> }
) {
  try {
    const { seriesId, characterId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: character, error: charError } = await supabase
      .from('series_characters')
      .select(
        `
        id,
        series:series!inner(
          id,
          project:projects!inner(id, user_id)
        )
      `
      )
      .eq('id', characterId)
      .eq('series_id', seriesId)
      .single()

    if (charError) {
      if (charError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      throw charError
    }

    const seriesData = Array.isArray(character.series) ? character.series[0] : character.series
    const project = Array.isArray(seriesData.project) ? seriesData.project[0] : seriesData.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete character
    const { error } = await supabase
      .from('series_characters')
      .delete()
      .eq('id', characterId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Character deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete character' },
      { status: 500 }
    )
  }
}
