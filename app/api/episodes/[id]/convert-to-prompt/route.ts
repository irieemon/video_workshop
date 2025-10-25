import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { convertScreenplayToPrompt, convertEpisodeToPrompts } from '@/lib/ai/screenplay-to-prompt'

/**
 * POST /api/episodes/[id]/convert-to-prompt
 * Convert episode screenplay to Sora-optimized video prompt(s)
 *
 * Body (optional):
 * {
 *   scene_id?: string,  // Convert specific scene only
 *   convert_all_scenes?: boolean  // Convert all scenes to separate prompts
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { scene_id, convert_all_scenes } = body

    // Fetch episode with series context
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        series_id,
        season_number,
        episode_number,
        title,
        screenplay_text,
        structured_screenplay,
        series:series_id (
          id,
          name,
          visual_template,
          characters:series_characters (
            id,
            name,
            description
          ),
          settings:series_settings (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Verify episode has screenplay content
    if (!episode.screenplay_text) {
      return NextResponse.json(
        { error: 'Episode has no screenplay content to convert' },
        { status: 400 }
      )
    }

    // Build series context
    const series = Array.isArray(episode.series) ? episode.series[0] : episode.series
    const seriesContext = series ? {
      name: series.name,
      visual_template: series.visual_template,
      characters: series.characters || [],
      settings: series.settings || [],
    } : undefined

    // Convert screenplay to prompt(s)
    if (convert_all_scenes) {
      // Convert all scenes to separate prompts
      const prompts = await convertEpisodeToPrompts({
        screenplay_text: episode.screenplay_text,
        structured_screenplay: episode.structured_screenplay,
        series_context: seriesContext,
      })

      return NextResponse.json({
        episode: {
          id: episode.id,
          title: episode.title,
          season: episode.season_number,
          episode: episode.episode_number,
        },
        prompts,
        total_scenes: prompts.length,
      })
    } else {
      // Convert single scene or entire screenplay
      const prompt = await convertScreenplayToPrompt({
        screenplay_text: episode.screenplay_text,
        structured_screenplay: episode.structured_screenplay,
        scene_id,
        series_context: seriesContext,
      })

      return NextResponse.json({
        episode: {
          id: episode.id,
          title: episode.title,
          season: episode.season_number,
          episode: episode.episode_number,
        },
        prompt,
      })
    }
  } catch (error: any) {
    console.error('Episode conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to convert episode to prompt', details: error.message },
      { status: 500 }
    )
  }
}
