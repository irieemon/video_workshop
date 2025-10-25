import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/episodes/[id]/full-data - Get complete episode data for video creation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch episode with all related data
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        *,
        series:series_id (
          id,
          name,
          characters:series_characters (
            id,
            name,
            description,
            visual_description
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

    if (episodeError) {
      if (episodeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      }
      throw episodeError
    }

    // Verify user owns the series
    if (!episode.series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    // Extract character and setting IDs mentioned in the screenplay
    const charactersInEpisode = episode.series.characters || []
    const settingsInEpisode = episode.series.settings || []

    // Parse screenplay to find which characters/settings are actually used
    const usedCharacterIds: string[] = []
    const usedSettingIds: string[] = []

    if (episode.screenplay_text) {
      const screenplayLower = episode.screenplay_text.toLowerCase()
      
      // Check which characters appear in the screenplay
      charactersInEpisode.forEach((char: any) => {
        if (screenplayLower.includes(char.name.toLowerCase())) {
          usedCharacterIds.push(char.id)
        }
      })

      // Check which settings appear in the screenplay
      settingsInEpisode.forEach((setting: any) => {
        if (screenplayLower.includes(setting.name.toLowerCase())) {
          usedSettingIds.push(setting.id)
        }
      })
    }

    return NextResponse.json({
      episode: {
        id: episode.id,
        title: episode.title,
        logline: episode.logline,
        synopsis: episode.synopsis,
        screenplay_text: episode.screenplay_text,
        season_number: episode.season_number,
        episode_number: episode.episode_number,
        status: episode.status,
      },
      series: {
        id: episode.series.id,
        name: episode.series.name,
      },
      characters: charactersInEpisode,
      settings: settingsInEpisode,
      suggestedCharacters: usedCharacterIds,
      suggestedSettings: usedSettingIds,
    })
  } catch (error: any) {
    console.error('Episode full data fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch episode data' },
      { status: 500 }
    )
  }
}
