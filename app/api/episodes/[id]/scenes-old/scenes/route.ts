import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/episodes/[episodeId]/scenes
 *
 * Retrieves all scenes from an episode's structured screenplay
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch episode with structured screenplay
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, title, season_number, episode_number, structured_screenplay, user_id')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Verify user owns the episode
    if (episode.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - episode belongs to another user' },
        { status: 403 }
      )
    }

    // Check if episode has structured screenplay
    if (!episode.structured_screenplay || !episode.structured_screenplay.scenes) {
      return NextResponse.json({
        episode: {
          id: episode.id,
          title: episode.title,
          season_number: episode.season_number,
          episode_number: episode.episode_number,
        },
        scenes: [],
        message: 'Episode does not have a structured screenplay yet',
      })
    }

    // Return scenes with summary info
    const scenes = episode.structured_screenplay.scenes.map((scene: any) => ({
      scene_id: scene.scene_id,
      scene_number: scene.scene_number,
      location: scene.location,
      time_of_day: scene.time_of_day,
      time_period: scene.time_period,
      description: scene.description,
      characters: scene.characters || [],
      hasDialogue: (scene.dialogue && scene.dialogue.length > 0) || false,
      hasActions: (scene.action && scene.action.length > 0) || false,
      duration_estimate: scene.duration_estimate,
      dialoguePreview: scene.dialogue
        ? scene.dialogue.slice(0, 2).map((d: any) => ({
            character: d.character,
            firstLine: d.lines[0],
          }))
        : [],
    }))

    return NextResponse.json({
      episode: {
        id: episode.id,
        title: episode.title,
        season_number: episode.season_number,
        episode_number: episode.episode_number,
      },
      scenes,
      totalScenes: scenes.length,
    })
  } catch (error: any) {
    console.error('Episode scenes fetch error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch episode scenes',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
