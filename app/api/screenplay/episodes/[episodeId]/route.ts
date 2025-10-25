import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/screenplay/episodes/[episodeId]
 * Get a specific episode with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get episode with series ownership check
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*, series!inner(id, user_id)')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Verify user owns the series
    if (episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ episode })
  } catch (error: any) {
    console.error('Get episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/screenplay/episodes/[episodeId]
 * Update an episode
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Verify ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*, series!inner(id, user_id)')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode || episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Update episode
    const { data: updatedEpisode, error: updateError } = await supabase
      .from('episodes')
      .update({
        title: body.title,
        logline: body.logline,
        structure_type: body.structure_type,
        act_breakdown: body.act_breakdown,
        plots: body.plots,
        story_beats: body.story_beats,
        character_development: body.character_development,
        runtime_minutes: body.runtime_minutes,
        status: body.status,
        notes: body.notes,
      })
      .eq('id', episodeId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update episode:', updateError)
      return NextResponse.json(
        { error: 'Failed to update episode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ episode: updatedEpisode })
  } catch (error: any) {
    console.error('Update episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/screenplay/episodes/[episodeId]
 * Delete an episode
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*, series!inner(id, user_id)')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode || episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Delete episode (CASCADE will handle scenes and related data)
    const { error: deleteError } = await supabase
      .from('episodes')
      .delete()
      .eq('id', episodeId)

    if (deleteError) {
      console.error('Failed to delete episode:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete episode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
