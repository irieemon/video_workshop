import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/screenplay/scenes?episodeId=xxx
 * Get all scenes for an episode
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const episodeId = searchParams.get('episodeId')

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId required' },
        { status: 400 }
      )
    }

    // Verify user owns the episode via series
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, series!inner(id, user_id)')
      .eq('id', episodeId)
      .single() as { data: { id: string; series: { id: string; user_id: string } } | null; error: any }

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    if (episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get scenes
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('*')
      .eq('episode_id', episodeId)
      .order('scene_number', { ascending: true })

    if (scenesError) {
      console.error('Failed to fetch scenes:', scenesError)
      return NextResponse.json(
        { error: 'Failed to fetch scenes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scenes })
  } catch (error: any) {
    console.error('Get scenes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/screenplay/scenes
 * Create a new scene
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { episodeId, sceneData } = body

    // Verify ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, series!inner(id, user_id)')
      .eq('id', episodeId)
      .single() as { data: { id: string; series: { id: string; user_id: string } } | null; error: any }

    if (episodeError || !episode || episode.series.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Get next scene number
    const { data: existingScenes } = await supabase
      .from('scenes')
      .select('scene_number')
      .eq('episode_id', episodeId)
      .order('scene_number', { ascending: false })
      .limit(1)

    const nextSceneNumber = existingScenes && existingScenes.length > 0
      ? existingScenes[0].scene_number + 1
      : 1

    // Build scene heading
    const interiorExterior = sceneData.interior_exterior || 'INT'
    const location = sceneData.location || 'LOCATION'
    const timeOfDay = sceneData.time_of_day || 'DAY'
    const sceneHeading = `${interiorExterior}. ${location} - ${timeOfDay}`

    // Create scene
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .insert({
        episode_id: episodeId,
        scene_number: sceneData.scene_number || nextSceneNumber,
        scene_heading: sceneData.scene_heading || sceneHeading,
        location: sceneData.location || null,
        time_of_day: sceneData.time_of_day || null,
        interior_exterior: sceneData.interior_exterior || null,
        action_description: sceneData.action_description || null,
        dialogue: sceneData.dialogue || {},
        emotional_beat: sceneData.emotional_beat || null,
        act_number: sceneData.act_number || null,
        plot_line: sceneData.plot_line || null,
        scene_purpose: sceneData.scene_purpose || null,
        story_function: sceneData.story_function || null,
        characters_present: sceneData.characters_present || [],
        props_needed: sceneData.props_needed || [],
        video_prompt: sceneData.video_prompt || null,
      })
      .select()
      .single()

    if (sceneError) {
      console.error('Failed to create scene:', sceneError)
      return NextResponse.json(
        { error: 'Failed to create scene' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scene })
  } catch (error: any) {
    console.error('Create scene error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
