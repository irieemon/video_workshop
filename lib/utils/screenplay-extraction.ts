/**
 * Screenplay Extraction Utilities
 * Extracts and validates structured screenplay JSON from AI responses
 */

import type { StructuredScreenplay, Scene, Act, Beat, DialogueLine } from '@/lib/types/database.types'

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  sceneNumber?: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings?: string[]
}

/**
 * Extract structured screenplay JSON from AI response text
 * Looks for JSON between ---STRUCTURED-SCREENPLAY-START--- and ---STRUCTURED-SCREENPLAY-END--- markers
 */
export function extractStructuredScreenplay(text: string): StructuredScreenplay | null {
  // Look for the structured screenplay markers
  const startMarker = '---STRUCTURED-SCREENPLAY-START---'
  const endMarker = '---STRUCTURED-SCREENPLAY-END---'

  const startIndex = text.indexOf(startMarker)
  if (startIndex === -1) {
    return null
  }

  const endIndex = text.indexOf(endMarker, startIndex)
  if (endIndex === -1) {
    return null
  }

  // Extract the content between markers
  const markedContent = text.substring(startIndex + startMarker.length, endIndex).trim()

  // Remove code block markers if present
  let jsonContent = markedContent
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.substring(7)
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.substring(3)
  }

  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.substring(0, jsonContent.length - 3)
  }

  jsonContent = jsonContent.trim()

  try {
    const parsed = JSON.parse(jsonContent)
    return parsed as StructuredScreenplay
  } catch (error) {
    console.error('Failed to parse structured screenplay JSON:', error)
    return null
  }
}

/**
 * Validate a Scene object
 */
function validateScene(scene: any, sceneNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields
  if (!scene.scene_id || typeof scene.scene_id !== 'string') {
    errors.push({
      field: 'scene_id',
      message: 'Scene must have a valid scene_id string',
      sceneNumber
    })
  }

  if (typeof scene.scene_number !== 'number') {
    errors.push({
      field: 'scene_number',
      message: 'Scene must have a valid scene_number',
      sceneNumber
    })
  }

  if (!scene.location || typeof scene.location !== 'string') {
    errors.push({
      field: 'location',
      message: 'Scene must have a location string',
      sceneNumber
    })
  }

  // Validate time_of_day enum
  const validTimeOfDay = ['INT', 'EXT', 'INT/EXT']
  if (!validTimeOfDay.includes(scene.time_of_day)) {
    errors.push({
      field: 'time_of_day',
      message: `Scene time_of_day must be "INT", "EXT", or "INT/EXT", got "${scene.time_of_day}"`,
      sceneNumber
    })
  }

  // Validate time_period enum
  const validTimePeriod = ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS']
  if (!validTimePeriod.includes(scene.time_period)) {
    errors.push({
      field: 'time_period',
      message: `Scene time_period must be "DAY", "NIGHT", "DAWN", "DUSK", or "CONTINUOUS", got "${scene.time_period}"`,
      sceneNumber
    })
  }

  // Description must be present and not conversational AI text
  if (!scene.description || typeof scene.description !== 'string' || scene.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Scene must have a non-empty description',
      sceneNumber
    })
  } else {
    // Check for conversational AI patterns
    const conversationalPatterns = [
      /^(great|perfect|excellent|wonderful)!/i,
      /let's (develop|create|build|work)/i,
      /tell me (more|about)/i,
      /i'm ready to help/i,
      /what (do you|would you like)/i
    ]

    if (conversationalPatterns.some(pattern => pattern.test(scene.description))) {
      errors.push({
        field: 'description',
        message: 'Scene description contains conversational AI text instead of scene description',
        sceneNumber
      })
    }
  }

  // Characters array must have at least one character
  if (!Array.isArray(scene.characters) || scene.characters.length === 0) {
    errors.push({
      field: 'characters',
      message: 'Scene must have at least one character in the characters array',
      sceneNumber
    })
  }

  // Action array must have at least one action beat
  if (!Array.isArray(scene.action) || scene.action.length === 0) {
    errors.push({
      field: 'action',
      message: 'Scene must have at least one action beat in the action array',
      sceneNumber
    })
  }

  // Validate dialogue structure if present
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    scene.dialogue.forEach((dialogueLine: any, index: number) => {
      if (!dialogueLine.character || typeof dialogueLine.character !== 'string') {
        errors.push({
          field: `dialogue[${index}].character`,
          message: 'Dialogue line must have a character name',
          sceneNumber
        })
      }

      if (!Array.isArray(dialogueLine.lines) || dialogueLine.lines.length === 0) {
        errors.push({
          field: `dialogue[${index}].lines`,
          message: 'Dialogue line must have at least one line in the lines array',
          sceneNumber
        })
      }
    })
  }

  return errors
}

/**
 * Validate a complete StructuredScreenplay object
 */
export function validateStructuredScreenplay(screenplay: StructuredScreenplay): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate acts
  if (!Array.isArray(screenplay.acts)) {
    errors.push({
      field: 'acts',
      message: 'Screenplay must have an acts array'
    })
  }

  // Validate scenes (CRITICAL)
  if (!Array.isArray(screenplay.scenes)) {
    errors.push({
      field: 'scenes',
      message: 'Screenplay must have a scenes array'
    })
  } else if (screenplay.scenes.length === 0) {
    errors.push({
      field: 'scenes',
      message: 'Screenplay must have at least one scene'
    })
  } else {
    // Validate each scene
    screenplay.scenes.forEach((scene, index) => {
      const sceneErrors = validateScene(scene, index + 1)
      errors.push(...sceneErrors)
    })

    // Check for duplicate scene IDs
    const sceneIds = new Set<string>()
    screenplay.scenes.forEach((scene, index) => {
      if (scene.scene_id && sceneIds.has(scene.scene_id)) {
        errors.push({
          field: 'scene_id',
          message: `Duplicate scene_id "${scene.scene_id}"`,
          sceneNumber: index + 1
        })
      }
      if (scene.scene_id) {
        sceneIds.add(scene.scene_id)
      }
    })
  }

  // Validate beats (optional but must be array if present)
  if (screenplay.beats !== undefined && !Array.isArray(screenplay.beats)) {
    errors.push({
      field: 'beats',
      message: 'Beats must be an array if provided'
    })
  } else if (screenplay.beats && screenplay.beats.length > 0) {
    // Check for duplicate beat IDs
    const beatIds = new Set<string>()
    screenplay.beats.forEach((beat, index) => {
      if (!beat.beat_id || typeof beat.beat_id !== 'string') {
        errors.push({
          field: `beats[${index}].beat_id`,
          message: 'Beat must have a valid beat_id string'
        })
      } else if (beatIds.has(beat.beat_id)) {
        errors.push({
          field: `beats[${index}].beat_id`,
          message: `Duplicate beat_id "${beat.beat_id}"`
        })
      } else {
        beatIds.add(beat.beat_id)
      }

      // Validate beat_type enum
      const validBeatTypes = ['plot', 'character', 'theme', 'turning-point']
      if (!validBeatTypes.includes(beat.beat_type)) {
        errors.push({
          field: `beats[${index}].beat_type`,
          message: `Beat type must be "plot", "character", "theme", or "turning-point", got "${beat.beat_type}"`
        })
      }
    })
  }

  // Warnings for missing optional content
  if (screenplay.scenes.length > 0) {
    const scenesWithDialogue = screenplay.scenes.filter(s => s.dialogue && s.dialogue.length > 0).length
    if (scenesWithDialogue === 0) {
      warnings.push('No scenes have dialogue. Consider adding dialogue for more engaging content.')
    }

    if (!screenplay.beats || screenplay.beats.length === 0) {
      warnings.push('No narrative beats defined. Consider adding beats for better story structure.')
    }

    if (screenplay.acts.length === 0) {
      warnings.push('No acts defined. Consider organizing scenes into acts for better structure.')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No errors'
  }

  return errors.map(error => {
    const scenePrefix = error.sceneNumber ? `Scene ${error.sceneNumber}: ` : ''
    return `${scenePrefix}${error.field} - ${error.message}`
  }).join('\n')
}
