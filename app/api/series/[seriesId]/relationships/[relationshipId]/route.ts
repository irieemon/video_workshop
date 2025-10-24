import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/series/[seriesId]/relationships/[relationshipId] - Update a relationship
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; relationshipId: string }> }
) {
  try {
    const { seriesId, relationshipId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership through series user_id
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found or access denied' }, { status: 404 })
      }
      throw seriesError
    }

    // Verify relationship exists and belongs to this series
    const { data: existingRel, error: checkError } = await supabase
      .from('character_relationships')
      .select('id, series_id')
      .eq('id', relationshipId)
      .eq('series_id', seriesId)
      .single()

    if (checkError || !existingRel) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const {
      relationship_type,
      custom_label,
      is_symmetric,
      description,
      intensity,
      established_in_episode_id,
      evolution_notes,
      display_order,
    } = body

    // Build update object (only include provided fields)
    const updateData: any = {}

    if (relationship_type !== undefined) {
      const validTypes = ['friends', 'rivals', 'romantic', 'family', 'allies', 'enemies', 'mentor_student', 'custom']
      if (!validTypes.includes(relationship_type)) {
        return NextResponse.json(
          { error: `Invalid relationship_type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.relationship_type = relationship_type

      if (relationship_type === 'custom' && !custom_label) {
        return NextResponse.json(
          { error: 'custom_label is required when relationship_type is "custom"' },
          { status: 400 }
        )
      }

      // Clear custom_label if not custom type
      if (relationship_type !== 'custom') {
        updateData.custom_label = null
      }
    }

    if (custom_label !== undefined) updateData.custom_label = custom_label
    if (is_symmetric !== undefined) updateData.is_symmetric = is_symmetric
    if (description !== undefined) updateData.description = description
    if (intensity !== undefined) updateData.intensity = intensity
    if (established_in_episode_id !== undefined) updateData.established_in_episode_id = established_in_episode_id
    if (evolution_notes !== undefined) updateData.evolution_notes = evolution_notes
    if (display_order !== undefined) updateData.display_order = display_order

    // Update relationship
    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .update(updateData)
      .eq('id', relationshipId)
      .select(`
        *,
        character_a:series_characters!character_relationships_character_a_id_fkey(id, name),
        character_b:series_characters!character_relationships_character_b_id_fkey(id, name)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(relationship)
  } catch (error: any) {
    console.error('Relationship update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update relationship' },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[seriesId]/relationships/[relationshipId] - Delete a relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; relationshipId: string }> }
) {
  try {
    const { seriesId, relationshipId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership through series user_id
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found or access denied' }, { status: 404 })
      }
      throw seriesError
    }

    // Delete relationship
    const { error } = await supabase
      .from('character_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('series_id', seriesId)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ message: 'Relationship deleted successfully' })
  } catch (error: any) {
    console.error('Relationship deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete relationship' },
      { status: 500 }
    )
  }
}
