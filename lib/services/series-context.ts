/**
 * Series Context Service
 *
 * Provides automatic series context fetching for video generation and AI agents.
 * This service guarantees that all series-related data (characters, settings, visual assets)
 * is automatically available when creating videos from episodes.
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type Series = Database['public']['Tables']['series']['Row']
type Episode = Database['public']['Tables']['episodes']['Row']
type Character = Database['public']['Tables']['series_characters']['Row']
type Setting = Database['public']['Tables']['series_settings']['Row']
// TODO: Add these types to database.types.ts when schema is updated
type VisualAsset = any
type SeriesRelationship = any

export interface CompleteSeriesContext {
  series: Series
  episode: Episode
  characters: Character[]
  settings: Setting[]
  visualAssets: VisualAsset[]
  relationships: SeriesRelationship[]
  soraSettings: {
    defaultStyle?: string
    defaultAspectRatio?: string
    defaultDuration?: number
    styleGuidelines?: string
  }
  episodeContext: {
    storyBeat?: string
    emotionalArc?: string
    charactersUsed: string[]
    settingsUsed: string[]
    timelinePosition?: number
    isKeyEpisode: boolean
  }
}

/**
 * Fetches complete series context from an episode ID
 *
 * This function automatically retrieves all series-related data needed for
 * video generation, ensuring AI agents have full context.
 *
 * @param episodeId - The episode ID to fetch context for
 * @returns Complete series context including characters, settings, and episode metadata
 * @throws Error if episode not found or user not authorized
 */
export async function fetchCompleteSeriesContext(
  episodeId: string
): Promise<CompleteSeriesContext> {
  const supabase = await createClient()

  // Step 1: Get episode with series_id (guaranteed via trigger)
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', episodeId)
    .single()

  if (episodeError || !episode) {
    throw new Error(`Episode not found: ${episodeId}`)
  }

  // Step 2: Get series data
  const { data: series, error: seriesError } = await supabase
    .from('series')
    .select('*')
    .eq('id', episode.series_id)
    .single()

  if (seriesError || !series) {
    throw new Error(`Series not found for episode: ${episodeId}`)
  }

  // Step 3: Fetch all series-related data in parallel
  const [
    { data: characters },
    { data: settings },
    { data: visualAssets },
    { data: relationships }
  ] = await Promise.all([
    supabase
      .from('characters')
      .select('*')
      .eq('series_id', series.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('settings')
      .select('*')
      .eq('series_id', series.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('visual_assets')
      .select('*')
      .eq('series_id', series.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('series_relationships')
      .select('*')
      .eq('series_id', series.id)
  ])

  // Step 4: Compile context
  return {
    series,
    episode,
    characters: characters || [],
    settings: settings || [],
    visualAssets: visualAssets || [],
    relationships: relationships || [],
    soraSettings: {
      defaultStyle: series.default_style || undefined,
      defaultAspectRatio: series.default_aspect_ratio || undefined,
      defaultDuration: series.default_duration || undefined,
      styleGuidelines: series.style_guidelines || undefined
    },
    episodeContext: {
      storyBeat: episode.story_beat || undefined,
      emotionalArc: episode.emotional_arc || undefined,
      charactersUsed: episode.characters_used || [],
      settingsUsed: episode.settings_used || [],
      timelinePosition: episode.timeline_position || undefined,
      isKeyEpisode: episode.is_key_episode
    }
  }
}

/**
 * Formats series context for AI agent consumption
 *
 * Converts the complete series context into a structured format optimized
 * for AI agent understanding and prompt generation.
 *
 * @param context - Complete series context
 * @returns Formatted context string for AI agents
 */
export function formatSeriesContextForAgents(context: CompleteSeriesContext): string {
  const sections: string[] = []

  // Series Overview
  sections.push(`# Series: ${context.series.name}`)
  if (context.series.description) {
    sections.push(`Description: ${context.series.description}`)
  }
  if (context.series.genre) {
    sections.push(`Genre: ${context.series.genre}`)
  }
  sections.push('')

  // Episode Context
  sections.push(`## Episode ${context.episode.season_number}x${context.episode.episode_number}: ${context.episode.title}`)
  if (context.episodeContext.storyBeat) {
    sections.push(`Story Beat: ${context.episodeContext.storyBeat}`)
  }
  if (context.episodeContext.emotionalArc) {
    sections.push(`Emotional Arc: ${context.episodeContext.emotionalArc}`)
  }
  sections.push('')

  // Characters
  if (context.characters.length > 0) {
    sections.push('## Characters')
    context.characters.forEach(char => {
      sections.push(`- ${char.name}: ${char.description || 'No description'}`)
      // Visual description would go here if available in the schema
    })
    sections.push('')
  }

  // Settings
  if (context.settings.length > 0) {
    sections.push('## Settings')
    context.settings.forEach(setting => {
      sections.push(`- ${setting.name}: ${setting.description || 'No description'}`)
      // Visual description would go here if available in the schema
    })
    sections.push('')
  }

  // Visual Style Guidelines
  if (context.soraSettings.styleGuidelines) {
    sections.push('## Visual Style Guidelines')
    sections.push(context.soraSettings.styleGuidelines)
    sections.push('')
  }

  // Sora Settings
  if (context.soraSettings.defaultStyle || context.soraSettings.defaultAspectRatio) {
    sections.push('## Sora Generation Preferences')
    if (context.soraSettings.defaultStyle) {
      sections.push(`Style: ${context.soraSettings.defaultStyle}`)
    }
    if (context.soraSettings.defaultAspectRatio) {
      sections.push(`Aspect Ratio: ${context.soraSettings.defaultAspectRatio}`)
    }
    if (context.soraSettings.defaultDuration) {
      sections.push(`Duration: ${context.soraSettings.defaultDuration}s`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Checks if a video has complete series context
 *
 * @param videoId - Video ID to check
 * @returns Boolean indicating if video has series context
 */
export async function videoHasSeriesContext(videoId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: video } = await supabase
    .from('videos')
    .select('series_id, episode_id, is_standalone')
    .eq('id', videoId)
    .single()

  if (!video) return false

  // Standalone videos don't need series context
  if (video.is_standalone) return true

  // Episode-based videos should have series_id auto-populated
  return video.series_id !== null && video.episode_id !== null
}

/**
 * Gets character names for display from character IDs
 *
 * @param characterIds - Array of character UUIDs
 * @returns Array of character names
 */
export async function getCharacterNames(characterIds: string[]): Promise<string[]> {
  if (characterIds.length === 0) return []

  const supabase = await createClient()

  const { data: characters } = await supabase
    .from('characters')
    .select('name')
    .in('id', characterIds)

  return characters?.map(c => c.name) || []
}

/**
 * Gets setting names for display from setting IDs
 *
 * @param settingIds - Array of setting UUIDs
 * @returns Array of setting names
 */
export async function getSettingNames(settingIds: string[]): Promise<string[]> {
  if (settingIds.length === 0) return []

  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('name')
    .in('id', settingIds)

  return settings?.map(s => s.name) || []
}
