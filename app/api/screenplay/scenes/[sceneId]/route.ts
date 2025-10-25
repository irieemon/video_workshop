import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/screenplay/scenes/[sceneId]
 * Get a specific scene
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get scene with ownership check
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('*, episode!inner(id, series!inner(id, user_id))')
      .eq('id', sceneId)
      .single()

    if (sceneError || !scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      )
    }

    if (scene.episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ scene })
  } catch (error: any) {
    console.error('Get scene error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/screenplay/scenes/[sceneId]
 * Update a scene
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
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
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('*, episode!inner(id, series!inner(id, user_id))')
      .eq('id', sceneId)
      .single()

    if (sceneError || !scene || scene.episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      )
    }

    // Build updated scene heading if components changed
    let sceneHeading = body.scene_heading
    if (body.interior_exterior || body.location || body.time_of_day) {
      const interiorExterior = body.interior_exterior || scene.interior_exterior || 'INT'
      const location = body.location || scene.location || 'LOCATION'
      const timeOfDay = body.time_of_day || scene.time_of_day || 'DAY'
      sceneHeading = `${interiorExterior}. ${location} - ${timeOfDay}`
    }

    // Update scene
    const { data: updatedScene, error: updateError } = await supabase
      .from('scenes')
      .update({
        scene_heading: sceneHeading,
        location: body.location,
        time_of_day: body.time_of_day,
        interior_exterior: body.interior_exterior,
        action_description: body.action_description,
        dialogue: body.dialogue,
        emotional_beat: body.emotional_beat,
        act_number: body.act_number,
        plot_line: body.plot_line,
        scene_purpose: body.scene_purpose,
        story_function: body.story_function,
        characters_present: body.characters_present,
        props_needed: body.props_needed,
        video_prompt: body.video_prompt,
        video_id: body.video_id,
      })
      .eq('id', sceneId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update scene:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scene' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scene: updatedScene })
  } catch (error: any) {
    console.error('Update scene error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/screenplay/scenes/[sceneId]
 * Delete a scene
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('*, episode!inner(id, series!inner(id, user_id))')
      .eq('id', sceneId)
      .single()

    if (sceneError || !scene || scene.episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      )
    }

    // Delete scene
    const { error: deleteError } = await supabase
      .from('scenes')
      .delete()
      .eq('id', sceneId)

    if (deleteError) {
      console.error('Failed to delete scene:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete scene' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete scene error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
