/**
 * Continuity Validation
 *
 * Validates visual continuity between segments and provides auto-correction
 * suggestions for maintaining consistency across multi-segment videos.
 *
 * Part of Multi-Segment Video Generation Feature (Phase 2)
 */

import type { SegmentVisualState } from './visual-state-extractor'
import OpenAI from 'openai'

// ============================================================================
// Types
// ============================================================================

export interface ContinuityIssue {
  type: 'character_position' | 'lighting' | 'camera' | 'mood' | 'visual_element' | 'critical'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  previousState: string
  currentState: string
  suggestion: string
}

export interface ContinuityValidationResult {
  isValid: boolean
  issues: ContinuityIssue[]
  overallScore: number // 0-100, where 100 = perfect continuity
  autoCorrection?: string // Auto-generated correction text
}

export interface ValidationOptions {
  strictMode?: boolean // More stringent validation
  allowedDiscrepancies?: string[] // Types of issues to ignore
  autoCorrect?: boolean // Generate auto-correction suggestions
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates continuity between two consecutive segments
 *
 * @param previousState - Visual state from previous segment
 * @param currentContext - Context being prepared for current segment
 * @param options - Validation options
 * @returns Validation result with issues and suggestions
 */
export async function validateContinuity(
  previousState: SegmentVisualState,
  currentContext: string,
  options: ValidationOptions = {}
): Promise<ContinuityValidationResult> {
  const issues: ContinuityIssue[] = []

  // Extract current state from context (simplified parsing for Phase 2)
  const currentParsed = parseContextForValidation(currentContext)

  // Validate character positions
  const characterIssues = validateCharacterPositions(
    previousState.character_positions,
    currentParsed.characterPositions
  )
  issues.push(...characterIssues)

  // Validate lighting consistency
  const lightingIssue = validateLighting(previousState.lighting_state, currentParsed.lighting)
  if (lightingIssue) issues.push(lightingIssue)

  // Validate camera consistency
  const cameraIssue = validateCamera(previousState.camera_position, currentParsed.camera)
  if (cameraIssue) issues.push(cameraIssue)

  // Validate mood/atmosphere
  const moodIssue = validateMood(previousState.mood_atmosphere, currentParsed.mood)
  if (moodIssue) issues.push(moodIssue)

  // Filter out allowed discrepancies
  const filteredIssues = filterAllowedIssues(issues, options.allowedDiscrepancies || [])

  // Calculate overall continuity score
  const score = calculateContinuityScore(filteredIssues, options.strictMode || false)

  // Generate auto-correction if needed and requested
  let autoCorrection: string | undefined
  if (options.autoCorrect && filteredIssues.length > 0) {
    autoCorrection = await generateAutoCorrection(previousState, filteredIssues)
  }

  return {
    isValid: score >= (options.strictMode ? 90 : 75),
    issues: filteredIssues,
    overallScore: score,
    autoCorrection,
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates character position consistency
 */
function validateCharacterPositions(
  previousPositions: Record<string, string>,
  currentPositions: Record<string, string>
): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []

  for (const [character, prevPosition] of Object.entries(previousPositions)) {
    const currentPosition = currentPositions[character]

    if (!currentPosition) {
      // Character disappeared without explanation
      issues.push({
        type: 'character_position',
        severity: 'high',
        description: `Character "${character}" was present but is not mentioned in current segment`,
        previousState: prevPosition,
        currentState: 'Not mentioned',
        suggestion: `Add transition: "${character} exits frame" or include character in current segment`,
      })
      continue
    }

    // Check if position changed dramatically without transition
    const isIncompatible = checkPositionCompatibility(prevPosition, currentPosition)
    if (isIncompatible) {
      issues.push({
        type: 'character_position',
        severity: 'medium',
        description: `Character "${character}" position changed abruptly`,
        previousState: prevPosition,
        currentState: currentPosition,
        suggestion: `Add transition movement: "${character} moves from ${prevPosition} to ${currentPosition}"`,
      })
    }
  }

  return issues
}

/**
 * Checks if two positions are compatible (no teleportation)
 */
function checkPositionCompatibility(prevPosition: string, currentPosition: string): boolean {
  // Simplified logic for Phase 2
  // In Phase 3, this could use semantic similarity or spatial reasoning

  const incompatiblePairs = [
    ['left', 'right'],
    ['foreground', 'background'],
    ['inside', 'outside'],
    ['ground', 'air'],
  ]

  const prevLower = prevPosition.toLowerCase()
  const currLower = currentPosition.toLowerCase()

  for (const [pos1, pos2] of incompatiblePairs) {
    if (
      (prevLower.includes(pos1) && currLower.includes(pos2)) ||
      (prevLower.includes(pos2) && currLower.includes(pos1))
    ) {
      return true // Incompatible
    }
  }

  return false
}

/**
 * Validates lighting consistency
 */
function validateLighting(
  previousLighting: string,
  currentLighting: string
): ContinuityIssue | null {
  if (!currentLighting || currentLighting === previousLighting) {
    return null
  }

  // Check for dramatic lighting changes
  const prevLower = previousLighting.toLowerCase()
  const currLower = currentLighting.toLowerCase()

  const timeChanges = [
    ['day', 'night'],
    ['sunrise', 'sunset'],
    ['bright', 'dark'],
  ]

  for (const [state1, state2] of timeChanges) {
    if (
      (prevLower.includes(state1) && currLower.includes(state2)) ||
      (prevLower.includes(state2) && currLower.includes(state1))
    ) {
      return {
        type: 'lighting',
        severity: 'high',
        description: 'Lighting changed dramatically between segments',
        previousState: previousLighting,
        currentState: currentLighting,
        suggestion: `Add transition: "Time passes as lighting shifts from ${previousLighting} to ${currentLighting}"`,
      }
    }
  }

  // Minor lighting change
  return {
    type: 'lighting',
    severity: 'low',
    description: 'Lighting conditions changed slightly',
    previousState: previousLighting,
    currentState: currentLighting,
    suggestion: 'Ensure lighting transition is smooth and motivated by narrative',
  }
}

/**
 * Validates camera consistency
 */
function validateCamera(previousCamera: string, currentCamera: string): ContinuityIssue | null {
  if (!currentCamera || currentCamera === previousCamera) {
    return null
  }

  // Check for jarring camera jumps
  const prevLower = previousCamera.toLowerCase()
  const currLower = currentCamera.toLowerCase()

  const jarringJumps = [
    ['close-up', 'wide'],
    ['low angle', 'high angle'],
    ['first person', 'third person'],
  ]

  for (const [angle1, angle2] of jarringJumps) {
    if (
      (prevLower.includes(angle1) && currLower.includes(angle2)) ||
      (prevLower.includes(angle2) && currLower.includes(angle1))
    ) {
      return {
        type: 'camera',
        severity: 'medium',
        description: 'Camera angle changed dramatically',
        previousState: previousCamera,
        currentState: currentCamera,
        suggestion: `Consider intermediate shot between ${previousCamera} and ${currentCamera}`,
      }
    }
  }

  return null
}

/**
 * Validates mood/atmosphere consistency
 */
function validateMood(previousMood: string, currentMood: string): ContinuityIssue | null {
  if (!currentMood || currentMood === previousMood) {
    return null
  }

  // Check for dramatic mood shifts
  const prevLower = previousMood.toLowerCase()
  const currLower = currentMood.toLowerCase()

  const opposingMoods = [
    ['tense', 'relaxed'],
    ['happy', 'sad'],
    ['calm', 'chaotic'],
    ['bright', 'dark'],
  ]

  for (const [mood1, mood2] of opposingMoods) {
    if (
      (prevLower.includes(mood1) && currLower.includes(mood2)) ||
      (prevLower.includes(mood2) && currLower.includes(mood1))
    ) {
      return {
        type: 'mood',
        severity: 'medium',
        description: 'Mood/atmosphere shifted dramatically',
        previousState: previousMood,
        currentState: currentMood,
        suggestion: `Narrative should justify mood transition from ${previousMood} to ${currentMood}`,
      }
    }
  }

  return null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses current context to extract state information
 */
function parseContextForValidation(context: string): {
  characterPositions: Record<string, string>
  lighting: string
  camera: string
  mood: string
} {
  // Simplified parsing for Phase 2
  // In Phase 3, this could use more sophisticated NLP

  const result = {
    characterPositions: {} as Record<string, string>,
    lighting: '',
    camera: '',
    mood: '',
  }

  // Extract character positions
  const characterMatch = context.match(/CHARACTER POSITIONS:\n((?:- .+\n)+)/i)
  if (characterMatch) {
    const lines = characterMatch[1].split('\n').filter((l) => l.trim())
    lines.forEach((line) => {
      const match = line.match(/- (.+?): (.+)/)
      if (match) {
        result.characterPositions[match[1]] = match[2]
      }
    })
  }

  // Extract lighting
  const lightingMatch = context.match(/LIGHTING: (.+)/i)
  if (lightingMatch) {
    result.lighting = lightingMatch[1]
  }

  // Extract camera
  const cameraMatch = context.match(/CAMERA: (.+)/i)
  if (cameraMatch) {
    result.camera = cameraMatch[1]
  }

  // Extract mood
  const moodMatch = context.match(/MOOD\/ATMOSPHERE: (.+)/i)
  if (moodMatch) {
    result.mood = moodMatch[1]
  }

  return result
}

/**
 * Filters out allowed discrepancies
 */
function filterAllowedIssues(
  issues: ContinuityIssue[],
  allowedDiscrepancies: string[]
): ContinuityIssue[] {
  if (allowedDiscrepancies.length === 0) {
    return issues
  }

  return issues.filter((issue) => !allowedDiscrepancies.includes(issue.type))
}

/**
 * Calculates overall continuity score (0-100)
 */
function calculateContinuityScore(issues: ContinuityIssue[], strictMode: boolean): number {
  if (issues.length === 0) {
    return 100
  }

  // Severity weights
  const severityWeights = {
    low: strictMode ? 5 : 2,
    medium: strictMode ? 15 : 10,
    high: strictMode ? 30 : 20,
    critical: 50,
  }

  // Calculate total penalty
  const totalPenalty = issues.reduce((sum, issue) => {
    return sum + severityWeights[issue.severity]
  }, 0)

  // Calculate score (capped at 0)
  const score = Math.max(0, 100 - totalPenalty)

  return Math.round(score)
}

// ============================================================================
// Auto-Correction
// ============================================================================

/**
 * Generates auto-correction suggestions using AI
 */
async function generateAutoCorrection(
  previousState: SegmentVisualState,
  issues: ContinuityIssue[]
): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const systemPrompt = `You are a video continuity expert. Given a previous segment's visual state and a list of continuity issues, generate brief correction instructions that can be added to the next segment's prompt to fix the issues.

Keep corrections concise and actionable. Focus on transitions and adjustments that maintain visual flow.`

  const userPrompt = `PREVIOUS SEGMENT VISUAL STATE:
${JSON.stringify(previousState, null, 2)}

CONTINUITY ISSUES DETECTED:
${issues.map((issue, i) => `${i + 1}. [${issue.severity}] ${issue.description}\n   Suggestion: ${issue.suggestion}`).join('\n')}

Generate brief correction instructions (2-4 sentences) to add to the next segment's prompt.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    })

    return response.choices[0].message.content || 'Unable to generate auto-correction'
  } catch (error) {
    console.error('Auto-correction generation error:', error)
    return 'Auto-correction unavailable - please review issues manually'
  }
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validates continuity across multiple segments
 */
export async function validateSegmentChain(
  segments: Array<{ visualState: SegmentVisualState; context: string }>,
  options: ValidationOptions = {}
): Promise<Array<{ segmentIndex: number; validation: ContinuityValidationResult }>> {
  const results: Array<{ segmentIndex: number; validation: ContinuityValidationResult }> = []

  for (let i = 1; i < segments.length; i++) {
    const previousState = segments[i - 1].visualState
    const currentContext = segments[i].context

    const validation = await validateContinuity(previousState, currentContext, options)
    results.push({ segmentIndex: i, validation })
  }

  return results
}
