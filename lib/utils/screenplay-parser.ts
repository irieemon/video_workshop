/**
 * Screenplay Parser Utility
 *
 * Parses screenplay text into structured format with scenes, dialogue, and actions
 */

import type { Scene, StructuredScreenplay, DialogueLine } from '@/lib/types/database.types'

interface ParsedScene {
  sceneHeading: string
  content: string[]
}

/**
 * Parse screenplay text into structured format
 */
export function parseScreenplayText(screenplayText: string): StructuredScreenplay | null {
  if (!screenplayText || screenplayText.trim().length === 0) {
    return null
  }

  // Split into lines and clean
  const lines = screenplayText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Extract scenes
  const parsedScenes = extractScenes(lines)

  // Convert to structured scenes
  const scenes: Scene[] = parsedScenes.map((parsed, index) =>
    parseScene(parsed, index + 1)
  )

  return {
    scenes,
    acts: extractActs(lines),
    beats: [],
    notes: []
  }
}

/**
 * Extract scene headings and content
 */
function extractScenes(lines: string[]): ParsedScene[] {
  const scenes: ParsedScene[] = []
  let currentScene: ParsedScene | null = null

  for (const line of lines) {
    // Scene heading pattern: INT./EXT. LOCATION - TIME
    if (isSceneHeading(line)) {
      if (currentScene) {
        scenes.push(currentScene)
      }
      // Remove markdown heading markers (###) from scene heading
      const cleanHeading = line.replace(/^#{1,6}\s*/, '').trim()
      currentScene = {
        sceneHeading: cleanHeading,
        content: []
      }
    } else if (currentScene && !isMetadata(line)) {
      currentScene.content.push(line)
    }
  }

  if (currentScene) {
    scenes.push(currentScene)
  }

  return scenes
}

/**
 * Check if line is a scene heading
 */
function isSceneHeading(line: string): boolean {
  // Remove markdown heading markers (###)
  const cleaned = line.replace(/^#{1,6}\s*/, '').trim()
  const upper = cleaned.toUpperCase()
  return (
    (upper.startsWith('INT.') ||
     upper.startsWith('EXT.') ||
     upper.startsWith('INT/EXT.')) &&
    (upper.includes('–') || upper.includes('-') || upper.includes('—'))
  )
}

/**
 * Check if line is metadata to skip
 */
function isMetadata(line: string): boolean {
  return (
    line.startsWith('#') ||
    line.startsWith('**') ||
    line.startsWith('---') ||
    line.toLowerCase().includes('act i') ||
    line.toLowerCase().includes('act ii') ||
    line.toLowerCase().includes('act iii') ||
    line.toLowerCase().startsWith('episode structure') ||
    line.toLowerCase().startsWith('character arcs') ||
    line.toLowerCase().startsWith('visual')
  )
}

/**
 * Parse individual scene into structured format
 */
function parseScene(parsed: ParsedScene, sceneNumber: number): Scene {
  const { sceneHeading, content } = parsed

  // Parse scene heading
  const { location, timeOfDay, timePeriod } = parseSceneHeading(sceneHeading)

  // Extract description (first paragraph before dialogue)
  const description = extractDescription(content)

  // Extract dialogue
  const dialogue = extractDialogue(content)

  // Extract actions
  const actions = extractActions(content, dialogue)

  // Extract characters from dialogue
  const characters = Array.from(new Set(dialogue.map(d => d.character)))

  // Estimate duration (rough: 1 second per line of dialogue + action)
  const durationEstimate = Math.max(3, Math.min(10, dialogue.length + actions.length))

  return {
    scene_id: `scene_${sceneNumber}`,
    scene_number: sceneNumber,
    location,
    time_of_day: timeOfDay,
    time_period: timePeriod,
    description,
    characters,
    dialogue,
    action: actions,
    duration_estimate: durationEstimate
  }
}

/**
 * Parse scene heading into components
 */
function parseSceneHeading(heading: string): {
  location: string
  timeOfDay: 'INT' | 'EXT' | 'INT/EXT'
  timePeriod: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS'
} {
  let timeOfDay: 'INT' | 'EXT' | 'INT/EXT' = 'INT'
  let location = ''
  let timePeriod: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' = 'DAY'

  const upper = heading.toUpperCase()

  // Extract time of day
  if (upper.startsWith('INT/EXT')) {
    timeOfDay = 'INT/EXT'
  } else if (upper.startsWith('EXT')) {
    timeOfDay = 'EXT'
  }

  // Split by delimiter (support em-dash, en-dash, and regular dash)
  const parts = heading.split(/–|—|-/).map(p => p.trim())

  if (parts.length >= 2) {
    // Location is between INT/EXT and time
    // Remove quotes if present
    location = parts[0]
      .replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim()

    // Handle multi-part locations (e.g., "ENGINEERING CORE – "SOL'S HEART"")
    // Take all parts except the last one (which is the time)
    if (parts.length > 2) {
      const locationParts = parts.slice(0, -1)
      location = locationParts.join(' – ')
        .replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')
        .replace(/^["']|["']$/g, '')
        .trim()
    }

    // Time period is the last part
    const timePart = parts[parts.length - 1].toUpperCase()
    if (timePart.includes('NIGHT')) timePeriod = 'NIGHT'
    else if (timePart.includes('DAY')) timePeriod = 'DAY'
    else if (timePart.includes('DAWN')) timePeriod = 'DAWN'
    else if (timePart.includes('DUSK')) timePeriod = 'DUSK'
    else if (timePart.includes('CONTINUOUS')) timePeriod = 'CONTINUOUS'
  }

  return { location, timeOfDay, timePeriod }
}

/**
 * Extract scene description
 */
function extractDescription(content: string[]): string {
  const descLines: string[] = []

  for (const line of content) {
    // Stop at first dialogue
    if (line.startsWith('>') || line.startsWith('**')) {
      break
    }
    // Skip italic stage directions
    if (line.startsWith('*') && line.endsWith('*')) {
      continue
    }
    if (line.length > 0 && !line.includes('CUT TO:')) {
      descLines.push(line)
    }
  }

  return descLines.join(' ').substring(0, 500) || 'Scene description'
}

/**
 * Extract dialogue from scene content
 */
function extractDialogue(content: string[]): DialogueLine[] {
  const dialogue: DialogueLine[] = []
  let currentCharacter: string | null = null
  let currentLines: string[] = []

  for (const line of content) {
    // Check if line starts with > (dialogue marker)
    if (line.startsWith('>')) {
      const dialogueLine = line.substring(1).trim()

      // Check if this line contains a character name (format: > **CHARACTER**)
      if (dialogueLine.includes('**')) {
        // Save previous dialogue
        if (currentCharacter && currentLines.length > 0) {
          dialogue.push({
            character: currentCharacter,
            lines: [...currentLines]
          })
        }

        // Extract character name
        const match = dialogueLine.match(/\*\*([^*]+)\*\*/)
        if (match) {
          currentCharacter = match[1].trim()
          currentLines = []
        }
      }
      // Regular dialogue line (not a character name)
      else if (currentCharacter) {
        // Skip parentheticals alone (like "(muttering)")
        if (!dialogueLine.match(/^\([^)]+\)$/)) {
          currentLines.push(dialogueLine)
        }
      }
    }
    // Also handle character names without > prefix (backwards compatibility)
    else if (line.includes('**')) {
      // Save previous dialogue
      if (currentCharacter && currentLines.length > 0) {
        dialogue.push({
          character: currentCharacter,
          lines: [...currentLines]
        })
      }

      // Extract character name
      const match = line.match(/\*\*([^*]+)\*\*/)
      if (match) {
        currentCharacter = match[1].trim()
        currentLines = []
      }
    }
  }

  // Add last dialogue
  if (currentCharacter && currentLines.length > 0) {
    dialogue.push({
      character: currentCharacter,
      lines: currentLines
    })
  }

  return dialogue
}

/**
 * Extract action lines
 */
function extractActions(content: string[], dialogue: DialogueLine[]): string[] {
  const actions: string[] = []
  const dialogueCharacters = new Set(dialogue.map(d => d.character))

  for (const line of content) {
    // Action is italic text: *action*
    if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
      const action = line.substring(1, line.length - 1).trim()
      if (action.length > 0 && !action.includes('CUT TO')) {
        actions.push(action)
      }
    }
    // Also capture stage directions before character names
    else if (!line.startsWith('>') &&
             !line.includes('**') &&
             !isSceneHeading(line) &&
             line.length > 10 &&
             line.length < 200) {
      // Check if it looks like an action (not a character name)
      const containsCharacter = Array.from(dialogueCharacters).some(char =>
        line.toUpperCase().includes(char.toUpperCase())
      )
      if (containsCharacter && !line.match(/^\*\*[^*]+\*\*$/)) {
        actions.push(line)
      }
    }
  }

  return actions
}

/**
 * Extract act structure
 */
function extractActs(lines: string[]): Array<{ act: number; title: string; description: string }> {
  const acts: Array<{ act: number; title: string; description: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^##\s*ACT\s+([IVX]+)/i)) {
      const match = line.match(/ACT\s+([IVX]+)\s*[–-]\s*(.+)/i)
      if (match) {
        const actNum = romanToNumber(match[1])
        const title = match[2].trim()
        const description = lines[i + 1] || ''
        acts.push({ act: actNum, title, description })
      }
    }
  }

  return acts
}

/**
 * Convert Roman numerals to numbers
 */
function romanToNumber(roman: string): number {
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 }
  return map[roman.toUpperCase()] || 1
}
