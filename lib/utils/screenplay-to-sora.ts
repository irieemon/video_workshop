/**
 * Screenplay to Sora Prompt Builder
 *
 * Converts structured screenplay scenes with dialogue into production-ready Sora video prompts
 */

import type { Scene, StructuredScreenplay } from '@/lib/types/database.types'

export interface SoraPromptOptions {
  // Technical Specs
  duration?: number
  aspectRatio?: '16:9' | '9:16' | '1:1'
  resolution?: '1080p' | '720p'

  // Visual Style
  cameraStyle?: string
  lightingMood?: string
  colorPalette?: string
  overallTone?: string

  // Character-specific
  characterDescriptions?: Record<string, string> // character name → physical description

  // Optional custom additions
  customInstructions?: string
}

export interface SoraPromptOutput {
  prompt: string
  sceneInfo: {
    sceneNumber: number
    location: string
    timeOfDay: string
    timePeriod: string
    characters: string[]
    duration: number
  }
  dialogue: {
    character: string
    lines: string[]
  }[]
  actions: string[]
}

/**
 * Convert a screenplay scene into a Sora-ready video prompt
 */
export function sceneToSoraPrompt(
  scene: Scene,
  options: SoraPromptOptions = {}
): SoraPromptOutput {
  const {
    duration = scene.duration_estimate || 6,
    aspectRatio = '9:16',
    resolution = '1080p',
    cameraStyle,
    lightingMood,
    colorPalette,
    overallTone,
    characterDescriptions = {},
    customInstructions,
  } = options

  // Build the prompt sections
  const sections: string[] = []

  // === STORY & DIRECTION ===
  sections.push('**Story & Direction**')
  sections.push(scene.description)
  sections.push('')

  // Add character descriptions if available
  if (scene.characters && scene.characters.length > 0) {
    sections.push('**Characters in Scene:**')
    scene.characters.forEach(charName => {
      const description = characterDescriptions[charName]
      if (description) {
        sections.push(`- **${charName}**: ${description}`)
      } else {
        sections.push(`- **${charName}**`)
      }
    })
    sections.push('')
  }

  // === DIALOGUE ===
  if (scene.dialogue && scene.dialogue.length > 0) {
    sections.push('**Dialogue:**')
    scene.dialogue.forEach(d => {
      const lines = Array.isArray(d.lines) ? d.lines.join(' ') : d.lines
      sections.push(`**${d.character}**: "${lines}"`)
    })
    sections.push('')
  }

  // === ACTIONS ===
  if (scene.action && scene.action.length > 0) {
    sections.push('**Key Actions:**')
    scene.action.forEach(action => {
      sections.push(`- ${action}`)
    })
    sections.push('')
  }

  // === TECHNICAL SPECS ===
  sections.push('**Format & Technical Specs**')
  sections.push(`- **Duration:** ${duration} seconds`)
  sections.push(`- **Aspect Ratio:** ${aspectRatio}`)
  sections.push(`- **Resolution:** ${resolution}`)
  sections.push(`- **Scene Type:** ${scene.time_of_day} ${scene.location} - ${scene.time_period}`)
  sections.push('')

  // === VISUAL STYLE ===
  if (cameraStyle || lightingMood || colorPalette || overallTone) {
    sections.push('**Visual Style**')
    if (cameraStyle) sections.push(`- **Camera:** ${cameraStyle}`)
    if (lightingMood) sections.push(`- **Lighting:** ${lightingMood}`)
    if (colorPalette) sections.push(`- **Color Palette:** ${colorPalette}`)
    if (overallTone) sections.push(`- **Overall Tone:** ${overallTone}`)
    sections.push('')
  }

  // === LOCATION ===
  sections.push('**Location & Setting**')
  sections.push(`**${scene.location}** (${scene.time_of_day} - ${scene.time_period})`)
  sections.push('')

  // === CUSTOM INSTRUCTIONS ===
  if (customInstructions) {
    sections.push('**Additional Instructions:**')
    sections.push(customInstructions)
    sections.push('')
  }

  // Assemble final prompt
  const prompt = sections.join('\n')

  return {
    prompt,
    sceneInfo: {
      sceneNumber: scene.scene_number,
      location: scene.location,
      timeOfDay: scene.time_of_day,
      timePeriod: scene.time_period,
      characters: scene.characters || [],
      duration,
    },
    dialogue: scene.dialogue || [],
    actions: scene.action || [],
  }
}

/**
 * Extract all scenes from a structured screenplay
 */
export function getAllScenes(screenplay: StructuredScreenplay | null): Scene[] {
  if (!screenplay || !screenplay.scenes) {
    return []
  }
  return screenplay.scenes
}

/**
 * Find a specific scene by scene number
 */
export function findSceneByNumber(
  screenplay: StructuredScreenplay | null,
  sceneNumber: number
): Scene | null {
  const scenes = getAllScenes(screenplay)
  return scenes.find(s => s.scene_number === sceneNumber) || null
}

/**
 * Find scenes by character name
 */
export function findScenesByCharacter(
  screenplay: StructuredScreenplay | null,
  characterName: string
): Scene[] {
  const scenes = getAllScenes(screenplay)
  return scenes.filter(s =>
    s.characters && s.characters.some(c =>
      c.toLowerCase().includes(characterName.toLowerCase())
    )
  )
}

/**
 * Generate a quick preview of a scene for selection UI
 */
export function generateScenePreview(scene: Scene): string {
  const parts: string[] = []

  parts.push(`Scene ${scene.scene_number}: ${scene.location}`)
  parts.push(`(${scene.time_of_day} - ${scene.time_period})`)

  if (scene.characters && scene.characters.length > 0) {
    parts.push(`\nCharacters: ${scene.characters.join(', ')}`)
  }

  if (scene.dialogue && scene.dialogue.length > 0) {
    const firstDialogue = scene.dialogue[0]
    const firstLine = Array.isArray(firstDialogue.lines)
      ? firstDialogue.lines[0]
      : firstDialogue.lines
    parts.push(`\n${firstDialogue.character}: "${firstLine.substring(0, 50)}..."`)
  }

  return parts.join(' ')
}

/**
 * Build character descriptions map from series characters
 */
export function buildCharacterDescriptions(
  characters: Array<{
    name: string
    description: string | null
    role?: string | null
    performance_style?: string | null
  }>
): Record<string, string> {
  const descriptions: Record<string, string> = {}

  characters.forEach(char => {
    const parts: string[] = []

    if (char.description) parts.push(char.description)
    if (char.role) parts.push(`(${char.role})`)
    if (char.performance_style) parts.push(`Performance: ${char.performance_style}`)

    descriptions[char.name] = parts.join(' | ')
  })

  return descriptions
}
