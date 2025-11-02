/**
 * Episode Segmentation Algorithm
 *
 * Intelligently breaks episodes into ~10-second narrative segments for
 * sequential video generation with visual and character continuity.
 *
 * Part of Multi-Segment Video Generation Feature (Phase 1)
 */

import type { Episode, Scene, DialogueLine, StructuredScreenplay } from '@/lib/types/database.types'

// ============================================================================
// Types
// ============================================================================

export interface VideoSegmentData {
  segment_number: number
  scene_ids: string[]
  start_timestamp: number
  end_timestamp: number
  estimated_duration: number
  narrative_beat: string
  narrative_transition?: string
  dialogue_lines: DialogueLine[]
  action_beats: string[]
  characters_in_segment: string[]
  settings_in_segment: string[]
  visual_continuity_notes?: string
}

export interface SegmentationResult {
  episode_id: string
  segments: VideoSegmentData[]
  total_duration: number
  segment_count: number
}

export interface SegmentationOptions {
  target_duration?: number  // Default 10 seconds
  min_duration?: number     // Default 8 seconds
  max_duration?: number     // Default 12 seconds
  prefer_scene_boundaries?: boolean  // Default true
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<SegmentationOptions> = {
  target_duration: 10,
  min_duration: 8,
  max_duration: 12,
  prefer_scene_boundaries: true
}

// Duration estimation constants (words per second for dialogue)
const WORDS_PER_SECOND = 2.5
const ACTION_BEAT_SECONDS = 2  // Average time for an action beat

// ============================================================================
// Main Segmentation Function
// ============================================================================

/**
 * Segments an episode into ~10-second video segments with natural break points
 *
 * @param episode - Episode with structured_screenplay data
 * @param options - Segmentation options
 * @returns Segmentation result with all segments and metadata
 */
export function segmentEpisode(
  episode: Episode,
  options: SegmentationOptions = {}
): SegmentationResult {
  console.log('[SEGMENTER] Function entered, episode ID:', episode.id)

  // Apply defaults with intelligent scaling
  const targetDuration = options.target_duration ?? DEFAULT_OPTIONS.target_duration
  const opts: Required<SegmentationOptions> = {
    target_duration: targetDuration,
    min_duration: options.min_duration ?? Math.max(targetDuration - 2, 3),
    max_duration: options.max_duration ?? Math.min(targetDuration + 2, 15), // Sora max is 15s
    prefer_scene_boundaries: options.prefer_scene_boundaries ?? DEFAULT_OPTIONS.prefer_scene_boundaries
  }
  console.log('[SEGMENTER] Options:', opts)

  if (!episode.structured_screenplay) {
    console.log('[SEGMENTER] No structured screenplay!')
    throw new Error('Episode must have structured_screenplay data to segment')
  }
  console.log('[SEGMENTER] Has structured screenplay')

  const screenplay = episode.structured_screenplay as StructuredScreenplay
  const scenes = screenplay.scenes
  console.log('[SEGMENTER] Scenes count:', scenes?.length)

  if (!scenes || scenes.length === 0) {
    console.log('[SEGMENTER] No scenes!')
    throw new Error('Episode must have at least one scene to segment')
  }

  const segments: VideoSegmentData[] = []
  let currentTimestamp = 0
  let segmentNumber = 1

  console.log('[SEGMENTER] Starting scene loop with', scenes.length, 'scenes')
  for (const scene of scenes) {
    console.log('[SEGMENTER] Processing scene:', scene.scene_id)
    // Use content-based duration for splitting decisions (not duration_estimate)
    const contentDuration = estimateSceneDurationFromContent(scene)
    // Use full duration (including estimate) for timestamp tracking
    const fullSceneDuration = estimateSceneDuration(scene)

    if (contentDuration <= opts.max_duration) {
      // Entire scene fits in one segment based on actual content
      const segment = createSegmentFromScene(
        scene,
        segmentNumber,
        currentTimestamp,
        episode
      )
      segments.push(segment)
      segmentNumber++
    } else {
      // Scene has enough content to split into multiple segments
      const sceneSegments = splitSceneIntoSegments(
        scene,
        segmentNumber,
        currentTimestamp,
        opts,
        episode
      )
      segments.push(...sceneSegments)
      segmentNumber += sceneSegments.length
    }

    // Use full duration for timestamp progression
    currentTimestamp += fullSceneDuration
  }
  console.log('[SEGMENTER] Scene loop complete, total segments:', segments.length)

  // Link segments with narrative transitions
  console.log('[SEGMENTER] Linking segments with transitions...')
  linkSegmentsWithTransitions(segments)
  console.log('[SEGMENTER] Transitions linked')

  // Safety clamp: Ensure no segment exceeds Sora's 15-second maximum
  console.log('[SEGMENTER] Applying safety clamp for Sora duration limits...')
  segments.forEach(segment => {
    if (segment.estimated_duration > 15) {
      console.log(`[SEGMENTER] ⚠️ Segment ${segment.segment_number} duration ${segment.estimated_duration}s exceeds 15s, clamping to 15s`)
      segment.estimated_duration = 15
    }
    if (segment.estimated_duration <= 0) {
      console.log(`[SEGMENTER] ⚠️ Segment ${segment.segment_number} duration ${segment.estimated_duration}s is invalid, setting to 3s minimum`)
      segment.estimated_duration = 3
    }
  })
  console.log('[SEGMENTER] Safety clamp applied')

  console.log('[SEGMENTER] Returning result')
  return {
    episode_id: episode.id,
    segments,
    total_duration: currentTimestamp,
    segment_count: segments.length
  }
}

// ============================================================================
// Duration Estimation
// ============================================================================

/**
 * Estimates duration of a scene based ONLY on actual content (dialogue + action)
 * Used for segmentation to avoid duration_estimate mismatch issues
 */
function estimateSceneDurationFromContent(scene: Scene): number {
  let duration = 0

  // Estimate from dialogue
  if (scene.dialogue && scene.dialogue.length > 0) {
    const totalWords = scene.dialogue.reduce((sum, dialogue) => {
      const wordCount = dialogue.lines.join(' ').split(/\s+/).length
      return sum + wordCount
    }, 0)
    duration += totalWords / WORDS_PER_SECOND
  }

  // Estimate from action beats
  if (scene.action && scene.action.length > 0) {
    duration += scene.action.length * ACTION_BEAT_SECONDS
  }

  // Minimum 3 seconds per scene
  return Math.max(duration, 3)
}

/**
 * Estimates duration of a scene based on dialogue and action
 * Includes explicit duration_estimate if provided
 */
export function estimateSceneDuration(scene: Scene): number {
  let duration = estimateSceneDurationFromContent(scene)

  // Use explicit duration if provided (for display/planning purposes)
  if (scene.duration_estimate) {
    duration = Math.max(duration, scene.duration_estimate)
  }

  return duration
}

/**
 * Estimates duration of specific dialogue lines
 */
function estimateDialogueDuration(dialogue: DialogueLine[]): number {
  const totalWords = dialogue.reduce((sum, d) => {
    const wordCount = d.lines.join(' ').split(/\s+/).length
    return sum + wordCount
  }, 0)
  return totalWords / WORDS_PER_SECOND
}

// ============================================================================
// Single Scene Segment Creation
// ============================================================================

/**
 * Creates a segment from a single scene that fits within max duration
 */
function createSegmentFromScene(
  scene: Scene,
  segmentNumber: number,
  startTimestamp: number,
  episode: Episode
): VideoSegmentData {
  // Use content-based duration for segment duration
  const contentDuration = estimateSceneDurationFromContent(scene)
  // Use full duration for timestamps to maintain timeline accuracy
  const fullDuration = estimateSceneDuration(scene)

  return {
    segment_number: segmentNumber,
    scene_ids: [scene.scene_id],
    start_timestamp: startTimestamp,
    end_timestamp: startTimestamp + fullDuration,
    estimated_duration: contentDuration, // Use actual content duration for video generation
    narrative_beat: generateNarrativeBeat(scene, episode),
    dialogue_lines: scene.dialogue || [],
    action_beats: scene.action || [],
    characters_in_segment: scene.characters || [],
    settings_in_segment: extractSettingsFromScene(scene, episode),
    visual_continuity_notes: generateVisualContinuityNotes(scene)
  }
}

// ============================================================================
// Multi-Segment Scene Splitting
// ============================================================================

/**
 * Splits a long scene into multiple segments at natural break points
 */
function splitSceneIntoSegments(
  scene: Scene,
  startingSegmentNumber: number,
  startingTimestamp: number,
  options: Required<SegmentationOptions>,
  episode: Episode
): VideoSegmentData[] {
  const breakPoints = findNaturalBreakPoints(scene, options.target_duration)
  const segments: VideoSegmentData[] = []

  let currentTimestamp = startingTimestamp
  let segmentNumber = startingSegmentNumber

  for (let i = 0; i < breakPoints.length; i++) {
    const breakPoint = breakPoints[i]
    const nextBreakPoint = breakPoints[i + 1]

    const segment = createSegmentFromBreakPoint(
      scene,
      breakPoint,
      nextBreakPoint,
      segmentNumber,
      currentTimestamp,
      episode
    )

    segments.push(segment)
    currentTimestamp += segment.estimated_duration
    segmentNumber++
  }

  return segments
}

/**
 * Finds natural break points in a scene for splitting
 */
interface BreakPoint {
  dialogueStartIndex: number
  dialogueEndIndex: number
  actionStartIndex: number
  actionEndIndex: number
  estimatedDuration: number
}

function findNaturalBreakPoints(
  scene: Scene,
  targetDuration: number
): BreakPoint[] {
  const breakPoints: BreakPoint[] = []
  const dialogue = scene.dialogue || []
  const action = scene.action || []

  let dialogueIndex = 0
  let actionIndex = 0

  while (dialogueIndex < dialogue.length || actionIndex < action.length) {
    const breakPoint: BreakPoint = {
      dialogueStartIndex: dialogueIndex,
      dialogueEndIndex: dialogueIndex,
      actionStartIndex: actionIndex,
      actionEndIndex: actionIndex,
      estimatedDuration: 0
    }

    // Accumulate dialogue and action until we reach target duration
    while (breakPoint.estimatedDuration < targetDuration) {
      let madeProgress = false

      if (dialogueIndex < dialogue.length) {
        const dialogueDuration = estimateDialogueDuration([dialogue[dialogueIndex]])
        if (breakPoint.estimatedDuration + dialogueDuration <= targetDuration + 2) {
          breakPoint.estimatedDuration += dialogueDuration
          breakPoint.dialogueEndIndex = dialogueIndex + 1
          dialogueIndex++
          madeProgress = true
        } else {
          break
        }
      }

      if (actionIndex < action.length && breakPoint.estimatedDuration < targetDuration) {
        breakPoint.estimatedDuration += ACTION_BEAT_SECONDS
        breakPoint.actionEndIndex = actionIndex + 1
        actionIndex++
        madeProgress = true
      }

      // Prevent infinite loop if nothing progresses
      if (!madeProgress) {
        // Force at least one element to make progress
        if (dialogueIndex < dialogue.length) {
          breakPoint.dialogueEndIndex = dialogueIndex + 1
          breakPoint.estimatedDuration += estimateDialogueDuration([dialogue[dialogueIndex]])
          dialogueIndex++
        } else if (actionIndex < action.length) {
          breakPoint.actionEndIndex = actionIndex + 1
          breakPoint.estimatedDuration += ACTION_BEAT_SECONDS
          actionIndex++
        } else {
          // No more content available - break both loops
          break
        }
        break
      }
    }

    // Only add breakPoint if it contains some content
    if (breakPoint.dialogueEndIndex > breakPoint.dialogueStartIndex ||
        breakPoint.actionEndIndex > breakPoint.actionStartIndex) {
      breakPoints.push(breakPoint)
    }
  }

  return breakPoints
}

/**
 * Creates a segment from a break point range
 */
function createSegmentFromBreakPoint(
  scene: Scene,
  breakPoint: BreakPoint,
  nextBreakPoint: BreakPoint | undefined,
  segmentNumber: number,
  startTimestamp: number,
  episode: Episode
): VideoSegmentData {
  const dialogue = scene.dialogue?.slice(
    breakPoint.dialogueStartIndex,
    breakPoint.dialogueEndIndex
  ) || []

  const actionBeats = scene.action?.slice(
    breakPoint.actionStartIndex,
    breakPoint.actionEndIndex
  ) || []

  return {
    segment_number: segmentNumber,
    scene_ids: [scene.scene_id],
    start_timestamp: startTimestamp,
    end_timestamp: startTimestamp + breakPoint.estimatedDuration,
    estimated_duration: breakPoint.estimatedDuration,
    narrative_beat: generateNarrativeBeatFromContent(scene, dialogue, actionBeats),
    dialogue_lines: dialogue,
    action_beats: actionBeats,
    characters_in_segment: extractCharactersFromDialogue(dialogue, scene.characters),
    settings_in_segment: extractSettingsFromScene(scene, episode),
    visual_continuity_notes: generateVisualContinuityNotes(scene)
  }
}

// ============================================================================
// Narrative & Continuity Generation
// ============================================================================

/**
 * Generates a narrative beat description for a scene
 */
function generateNarrativeBeat(scene: Scene, episode: Episode): string {
  const action = scene.action?.[0] || scene.description
  const location = scene.location

  return `${location}: ${action.slice(0, 100)}${action.length > 100 ? '...' : ''}`
}

/**
 * Generates a narrative beat from specific content
 */
function generateNarrativeBeatFromContent(
  scene: Scene,
  dialogue: DialogueLine[],
  actionBeats: string[]
): string {
  if (dialogue.length > 0) {
    const firstDialogue = dialogue[0]
    const preview = firstDialogue.lines[0].slice(0, 60)
    return `${scene.location}: ${firstDialogue.character} - "${preview}${firstDialogue.lines[0].length > 60 ? '...' : ''}"`
  }

  if (actionBeats.length > 0) {
    return `${scene.location}: ${actionBeats[0].slice(0, 100)}`
  }

  return `${scene.location}: Scene continues`
}

/**
 * Generates visual continuity notes for a scene
 */
function generateVisualContinuityNotes(scene: Scene): string {
  const notes: string[] = []

  // Location continuity
  notes.push(`Location: ${scene.location}`)

  // Time continuity
  notes.push(`Time: ${scene.time_of_day} ${scene.time_period}`)

  // Character continuity
  if (scene.characters && scene.characters.length > 0) {
    notes.push(`Characters: ${scene.characters.join(', ')}`)
  }

  return notes.join(' | ')
}

/**
 * Links segments with narrative transitions
 */
function linkSegmentsWithTransitions(segments: VideoSegmentData[]): void {
  for (let i = 1; i < segments.length; i++) {
    const prevSegment = segments[i - 1]
    const currentSegment = segments[i]

    // Generate transition based on whether it's same scene or different scene
    const isSameScene = prevSegment.scene_ids[0] === currentSegment.scene_ids[0]

    if (isSameScene) {
      currentSegment.narrative_transition = 'Continues seamlessly from previous segment'
    } else {
      currentSegment.narrative_transition = `Transitions from ${prevSegment.narrative_beat.split(':')[0]} to current location`
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts setting IDs from scene (maps location to settings)
 */
function extractSettingsFromScene(scene: Scene, episode: Episode): string[] {
  // For Phase 1, we return empty array
  // In Phase 2, we'll implement logic to map scene.location to series_settings IDs
  return []
}

/**
 * Extracts character IDs from dialogue
 */
function extractCharactersFromDialogue(
  dialogue: DialogueLine[],
  sceneCharacters: string[]
): string[] {
  // For Phase 1, return scene characters
  // In Phase 2, we'll implement character name → ID mapping
  return sceneCharacters || []
}
