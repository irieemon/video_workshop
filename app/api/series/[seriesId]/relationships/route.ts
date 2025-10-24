import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/relationships - List all character relationships in a series
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

    // Verify ownership through direct user_id (decoupled model)
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw seriesError
    }

    if (!series) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch relationships with character details
    const { data: relationships, error } = await supabase
      .from('character_relationships')
      .select(`
        *,
        character_a:series_characters!character_relationships_character_a_id_fkey(id, name),
        character_b:series_characters!character_relationships_character_b_id_fkey(id, name)
      `)
      .eq('series_id', seriesId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(relationships || [])
  } catch (error: any) {
    console.error('Relationships fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch relationships' },
      { status: 500 }
    )
  }
}

// POST /api/series/[seriesId]/relationships - Create a new character relationship
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

    // Verify ownership through direct user_id (decoupled model)
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw seriesError
    }

    if (!series) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      character_a_id,
      character_b_id,
      relationship_type,
      custom_label,
      is_symmetric = true,
      description,
      intensity,
      established_in_episode_id,
      evolution_notes,
    } = body

    // Validation
    if (!character_a_id || !character_b_id) {
      return NextResponse.json(
        { error: 'Both character_a_id and character_b_id are required' },
        { status: 400 }
      )
    }

    if (!relationship_type) {
      return NextResponse.json(
        { error: 'relationship_type is required' },
        { status: 400 }
      )
    }

    if (character_a_id === character_b_id) {
      return NextResponse.json(
        { error: 'A character cannot have a relationship with themselves' },
        { status: 400 }
      )
    }

    const validTypes = ['friends', 'rivals', 'romantic', 'family', 'allies', 'enemies', 'mentor_student', 'custom']
    if (!validTypes.includes(relationship_type)) {
      return NextResponse.json(
        { error: `Invalid relationship_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (relationship_type === 'custom' && !custom_label) {
      return NextResponse.json(
        { error: 'custom_label is required when relationship_type is "custom"' },
        { status: 400 }
      )
    }

    // Verify both characters exist and belong to this series
    const { data: charactersCheck, error: charCheckError } = await supabase
      .from('series_characters')
      .select('id, series_id')
      .in('id', [character_a_id, character_b_id])

    if (charCheckError) throw charCheckError

    if (!charactersCheck || charactersCheck.length !== 2) {
      return NextResponse.json(
        { error: 'One or both characters not found' },
        { status: 404 }
      )
    }

    if (charactersCheck.some(char => char.series_id !== seriesId)) {
      return NextResponse.json(
        { error: 'Characters must belong to the specified series' },
        { status: 400 }
      )
    }

    // Check for duplicate relationship (either direction)
    const { data: existingRel } = await supabase
      .from('character_relationships')
      .select('id')
      .eq('series_id', seriesId)
      .or(`and(character_a_id.eq.${character_a_id},character_b_id.eq.${character_b_id}),and(character_a_id.eq.${character_b_id},character_b_id.eq.${character_a_id})`)
      .maybeSingle()

    if (existingRel) {
      return NextResponse.json(
        { error: 'Relationship between these characters already exists' },
        { status: 409 }
      )
    }

    // Create relationship
    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .insert({
        series_id: seriesId,
        character_a_id,
        character_b_id,
        relationship_type,
        custom_label: relationship_type === 'custom' ? custom_label : null,
        is_symmetric,
        description: description || null,
        intensity: intensity || null,
        established_in_episode_id: established_in_episode_id || null,
        evolution_notes: evolution_notes || null,
      })
      .select(`
        *,
        character_a:series_characters!character_relationships_character_a_id_fkey(id, name),
        character_b:series_characters!character_relationships_character_b_id_fkey(id, name)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(relationship, { status: 201 })
  } catch (error: any) {
    console.error('Relationship creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create relationship' },
      { status: 500 }
    )
  }
}
