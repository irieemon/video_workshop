/**
 * Screenplay Enrichment Service
 *
 * Converts screenplay data (scenes, dialogue, actions) into enriched Sora video prompts
 * by integrating series context (characters, settings, visual style)
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Episode,
  Scene,
  ScreenplayEnrichmentData,
} from '@/lib/types/database.types'
import type {
  SeriesCharacter,
  SeriesSetting,
} from '@/lib/types/api.types'

interface SeriesContext {
  series: {
    name: string
    cameraStyle: string | null
    lightingMood: string | null
    colorPalette: string | null
    overallTone: string | null
    narrativePrefix: string | null
  }
  characters: SeriesCharacter[]
  settings: SeriesSetting[]
}

interface VisualDescription {
  dialogue: string[]
  actions: string[]
  visualCues: string[]
}

interface TechnicalSpecs {
  duration?: number
  aspectRatio?: '16:9' | '9:16' | '1:1'
  resolution?: '1080p' | '720p'
  cameraStyle?: string
  lightingMood?: string
  colorPalette?: string
  overallTone?: string
}

export class ScreenplayEnrichmentService {
  /**
   * Extract specific scene from episode's structured screenplay
   */
  async extractScene(episodeId: string, sceneId: string): Promise<Scene | null> {
    const supabase = await createClient()

    const { data: episode, error } = await supabase
      .from('episodes')
      .select('structured_screenplay')
      .eq('id', episodeId)
      .single()

    if (error || !episode?.structured_screenplay) {
      console.error('Failed to fetch episode:', error)
      return null
    }

    const scene = episode.structured_screenplay.scenes?.find(
      (s: Scene) => s.scene_id === sceneId
    )

    return scene || null
  }

  /**
   * Get all related series context for a scene
   */
  async getSeriesContext(seriesId: string, scene: Scene): Promise<SeriesContext | null> {
    const supabase = await createClient()

    // Fetch series with characters, settings, and visual style
    const { data: series, error } = await supabase
      .from('series')
      .select(`
        id,
        name,
        sora_camera_style,
        sora_lighting_mood,
        sora_color_palette,
        sora_overall_tone,
        sora_narrative_prefix,
        characters:series_characters(*),
        settings:series_settings(*)
      `)
      .eq('id', seriesId)
      .single()

    if (error || !series) {
      console.error('Failed to fetch series context:', error)
      return null
    }

    // Filter characters actually in the scene
    const sceneCharacters = (series.characters || []).filter((char: any) =>
      scene.characters.includes(char.name)
    )

    // Try to identify settings mentioned in scene location
    const sceneSettings = (series.settings || []).filter((setting: any) =>
      scene.location.toLowerCase().includes(setting.name.toLowerCase())
    )

    return {
      series: {
        name: series.name,
        cameraStyle: series.sora_camera_style,
        lightingMood: series.sora_lighting_mood,
        colorPalette: series.sora_color_palette,
        overallTone: series.sora_overall_tone,
        narrativePrefix: series.sora_narrative_prefix,
      },
      characters: sceneCharacters,
      settings: sceneSettings,
    }
  }

  /**
   * Convert dialogue and actions into visual descriptions for Sora
   */
  convertToVisualDescription(scene: Scene): VisualDescription {
    const dialogue: string[] = []
    const actions: string[] = []
    const visualCues: string[] = []

    // Extract dialogue with character attribution
    if (scene.dialogue) {
      scene.dialogue.forEach((d) => {
        const dialogueText = `${d.character}: "${d.lines.join(' ')}"`
        dialogue.push(dialogueText)

        // Generate visual cues from dialogue delivery
        const tone = this.inferToneFromDialogue(d.lines)
        visualCues.push(`${d.character} speaks ${tone}`)
      })
    }

    // Extract actions and convert to visual descriptions
    if (scene.action) {
      scene.action.forEach((action) => {
        actions.push(action)
        visualCues.push(this.actionToVisual(action))
      })
    }

    return { dialogue, actions, visualCues }
  }

  /**
   * Generate comprehensive Sora prompt with all screenplay context
   */
  async generateEnrichedPrompt(
    scene: Scene,
    seriesContext: SeriesContext,
    technicalSpecs: TechnicalSpecs
  ): Promise<string> {
    const visual = this.convertToVisualDescription(scene)

    // Build prompt sections
    const sections: string[] = []

    // 1. Series Context & Narrative Prefix
    if (seriesContext.series.narrativePrefix) {
      sections.push(`**Series Context**: ${seriesContext.series.narrativePrefix}`)
    }

    // 2. Scene Setting
    sections.push(
      `**Location**: ${scene.location} (${scene.time_of_day} ${scene.time_period})`
    )
    sections.push(`**Scene Description**: ${scene.description}`)

    // 3. Characters in Scene
    if (seriesContext.characters.length > 0) {
      const charDescriptions = seriesContext.characters
        .map((char) => `${char.name} (${char.role || 'Character'}): ${char.description}`)
        .join('; ')
      sections.push(`**Characters**: ${charDescriptions}`)
    }

    // 4. Actions & Visual Moments
    if (visual.actions.length > 0) {
      sections.push(`**Actions**: ${visual.actions.join('. ')}`)
    }

    // 5. Dialogue (What Characters Say)
    if (visual.dialogue.length > 0) {
      sections.push(`**Dialogue**: ${visual.dialogue.join(' | ')}`)
    }

    // 6. Visual Cues (How to show the dialogue/actions)
    if (visual.visualCues.length > 0) {
      sections.push(`**Visual Execution**: ${visual.visualCues.join('. ')}`)
    }

    // 7. Technical Specifications
    const techSpecs = this.buildTechnicalSpecs(technicalSpecs, seriesContext.series)
    sections.push(`\n---\n${techSpecs}`)

    return sections.join('\n\n')
  }

  /**
   * Create enrichment data structure for storage
   */
  createEnrichmentData(
    scene: Scene,
    seriesContext: SeriesContext
  ): ScreenplayEnrichmentData {
    return {
      sourceScene: {
        sceneId: scene.scene_id,
        sceneNumber: scene.scene_number,
        location: scene.location,
        timeOfDay: scene.time_of_day,
        timePeriod: scene.time_period,
      },
      extractedDialogue: scene.dialogue || [],
      extractedActions: scene.action || [],
      charactersInScene: seriesContext.characters.map((c) => c.id),
      settingsInScene: seriesContext.settings.map((s) => s.id),
      emotionalBeat: this.extractEmotionalBeat(scene),
      durationEstimate: scene.duration_estimate,
      enrichmentTimestamp: new Date().toISOString(),
    }
  }

  // Private helper methods

  private buildTechnicalSpecs(specs: TechnicalSpecs, seriesStyle: any): string {
    const duration = specs.duration || 6.5
    const aspectRatio = specs.aspectRatio || '9:16'
    const resolution = specs.resolution || '1080p'
    const cameraStyle = specs.cameraStyle || seriesStyle.cameraStyle || 'ARRI ALEXA 35'
    const lightingMood = specs.lightingMood || seriesStyle.lightingMood || 'Natural'
    const colorPalette = specs.colorPalette || seriesStyle.colorPalette || 'Neutral'
    const overallTone = specs.overallTone || seriesStyle.overallTone || 'Cinematic'

    return `**Format & Look**
- **Duration:** ${duration} seconds
- **Aspect Ratio:** ${aspectRatio} vertical
- **Resolution:** ${resolution}
- **Camera Style:** ${cameraStyle}
- **Lighting Mood:** ${lightingMood}
- **Color Palette:** ${colorPalette}
- **Overall Tone:** ${overallTone}`
  }

  private inferToneFromDialogue(lines: string[]): string {
    const text = lines.join(' ')
    const lowerText = text.toLowerCase()

    // Infer emotional tone from dialogue content
    if (text.includes('!')) return 'with intensity'
    if (text.includes('?')) return 'questioningly'
    if (lowerText.includes('whisper')) return 'in a whisper'
    if (lowerText.includes('shout') || lowerText.includes('yell')) return 'shouting'
    if (text.length < 20) return 'tersely'

    return 'conversationally'
  }

  private actionToVisual(action: string): string {
    // Convert screenplay action into visual description
    // "Orin walks between cryo pods" → "Orin moving slowly through mist-filled bay"
    return action
      .replace(/walks/gi, 'moving')
      .replace(/looks at/gi, 'gazing at')
      .replace(/turns/gi, 'pivoting')
      .replace(/runs/gi, 'rushing')
      .replace(/sits/gi, 'settling')
  }

  private extractEmotionalBeat(scene: Scene): string {
    // Attempt to extract emotional tone from scene description
    const description = scene.description.toLowerCase()

    if (description.includes('tense') || description.includes('fear')) return 'tension'
    if (description.includes('warm') || description.includes('comfort')) return 'warmth'
    if (description.includes('sad') || description.includes('melanchol')) return 'sadness'
    if (description.includes('joy') || description.includes('happy')) return 'joy'
    if (description.includes('awe') || description.includes('wonder')) return 'awe'
    if (description.includes('dread') || description.includes('ominous')) return 'dread'

    return 'neutral'
  }
}

// Export singleton instance
export const screenplayEnrichment = new ScreenplayEnrichmentService()
