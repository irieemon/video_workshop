/**
 * Tests for Continuity Validator
 *
 * Tests the visual continuity validation and auto-correction functionality
 * for multi-segment video generation.
 */

// Mock OpenAI before imports
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  }
})

import OpenAI from 'openai'
import {
  validateContinuity,
  validateSegmentChain,
  ContinuityIssue,
  ContinuityValidationResult,
  ValidationOptions,
} from '@/lib/ai/continuity-validator'
import type { SegmentVisualState } from '@/lib/ai/visual-state-extractor'

describe('Continuity Validator', () => {
  // Get mock instance
  const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>
  let mockCreate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Add smooth transition between segments.' } }],
    })
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as any)
  })

  // Helper to create mock visual state
  function createMockVisualState(overrides: Partial<SegmentVisualState> = {}): SegmentVisualState {
    return {
      character_positions: {},
      lighting_state: 'natural daylight',
      camera_position: 'medium shot',
      key_visual_elements: [],
      mood_atmosphere: 'calm',
      timestamp: 0,
      ...overrides,
    }
  }

  describe('validateContinuity', () => {
    describe('Character Position Validation', () => {
      it('detects missing character in current segment', async () => {
        const previousState = createMockVisualState({
          character_positions: { Hero: 'center of frame', Sidekick: 'left side' },
        })

        // Context with only Hero mentioned
        const currentContext = `CHARACTER POSITIONS:
- Hero: center of frame
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        expect(result.issues).toHaveLength(1)
        expect(result.issues[0].type).toBe('character_position')
        expect(result.issues[0].severity).toBe('high')
        expect(result.issues[0].description).toContain('Sidekick')
        expect(result.issues[0].suggestion).toContain('exits frame')
      })

      it('detects incompatible position change (left to right)', async () => {
        const previousState = createMockVisualState({
          character_positions: { Hero: 'far left of frame' },
        })

        const currentContext = `CHARACTER POSITIONS:
- Hero: far right of frame
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const positionIssue = result.issues.find(
          (i) => i.type === 'character_position' && i.severity === 'medium'
        )
        expect(positionIssue).toBeDefined()
        expect(positionIssue?.description).toContain('abruptly')
      })

      it('detects incompatible position change (foreground to background)', async () => {
        const previousState = createMockVisualState({
          character_positions: { Hero: 'foreground' },
        })

        const currentContext = `CHARACTER POSITIONS:
- Hero: background
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const positionIssue = result.issues.find((i) => i.type === 'character_position')
        expect(positionIssue).toBeDefined()
      })

      it('allows compatible position changes', async () => {
        const previousState = createMockVisualState({
          character_positions: { Hero: 'center of frame' },
        })

        const currentContext = `CHARACTER POSITIONS:
- Hero: slightly left of center
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const positionIssues = result.issues.filter((i) => i.type === 'character_position')
        expect(positionIssues).toHaveLength(0)
      })
    })

    describe('Lighting Validation', () => {
      it('detects dramatic day to night change', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'bright daylight',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: dark night scene
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const lightingIssue = result.issues.find(
          (i) => i.type === 'lighting' && i.severity === 'high'
        )
        expect(lightingIssue).toBeDefined()
        expect(lightingIssue?.description).toContain('dramatically')
      })

      it('detects sunrise to sunset change', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'sunrise golden hour',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: sunset orange glow
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const lightingIssue = result.issues.find((i) => i.type === 'lighting')
        expect(lightingIssue?.severity).toBe('high')
      })

      it('allows minor lighting changes with low severity', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'natural indoor lighting',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: slightly dimmer indoor lighting
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const lightingIssue = result.issues.find((i) => i.type === 'lighting')
        expect(lightingIssue?.severity).toBe('low')
      })

      it('passes when lighting unchanged', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'natural daylight',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const lightingIssues = result.issues.filter((i) => i.type === 'lighting')
        expect(lightingIssues).toHaveLength(0)
      })
    })

    describe('Camera Validation', () => {
      it('detects jarring close-up to wide jump', async () => {
        const previousState = createMockVisualState({
          camera_position: 'extreme close-up on face',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: wide establishing shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const cameraIssue = result.issues.find((i) => i.type === 'camera')
        expect(cameraIssue).toBeDefined()
        expect(cameraIssue?.severity).toBe('medium')
        expect(cameraIssue?.suggestion).toContain('intermediate shot')
      })

      it('detects low angle to high angle jump', async () => {
        const previousState = createMockVisualState({
          camera_position: 'dramatic low angle',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: high angle looking down
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const cameraIssue = result.issues.find((i) => i.type === 'camera')
        expect(cameraIssue).toBeDefined()
      })

      it('allows similar camera positions', async () => {
        const previousState = createMockVisualState({
          camera_position: 'medium shot',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot with slight movement
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const cameraIssues = result.issues.filter((i) => i.type === 'camera')
        expect(cameraIssues).toHaveLength(0)
      })
    })

    describe('Mood Validation', () => {
      it('detects tense to relaxed mood shift', async () => {
        const previousState = createMockVisualState({
          mood_atmosphere: 'extremely tense and suspenseful',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: completely relaxed and peaceful`

        const result = await validateContinuity(previousState, currentContext)

        const moodIssue = result.issues.find((i) => i.type === 'mood')
        expect(moodIssue).toBeDefined()
        expect(moodIssue?.severity).toBe('medium')
      })

      it('detects happy to sad mood shift', async () => {
        const previousState = createMockVisualState({
          mood_atmosphere: 'joyful and happy celebration',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: deeply sad and melancholic`

        const result = await validateContinuity(previousState, currentContext)

        const moodIssue = result.issues.find((i) => i.type === 'mood')
        expect(moodIssue).toBeDefined()
      })

      it('passes when mood unchanged', async () => {
        const previousState = createMockVisualState({
          mood_atmosphere: 'calm',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        const moodIssues = result.issues.filter((i) => i.type === 'mood')
        expect(moodIssues).toHaveLength(0)
      })
    })

    describe('Scoring System', () => {
      it('returns perfect score (100) when no issues', async () => {
        const previousState = createMockVisualState()

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        expect(result.overallScore).toBe(100)
        expect(result.isValid).toBe(true)
      })

      it('applies low severity penalty (2 points in normal mode)', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'warm lighting',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: slightly cooler lighting
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        // Low severity = 2 point penalty in normal mode
        expect(result.overallScore).toBe(98)
      })

      it('applies strict mode penalties (5 points for low)', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'warm lighting',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: slightly cooler lighting
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext, { strictMode: true })

        // Low severity = 5 point penalty in strict mode
        expect(result.overallScore).toBe(95)
      })

      it('calculates valid threshold correctly (75 in normal mode)', async () => {
        const previousState = createMockVisualState({
          character_positions: { Hero: 'far left' },
          lighting_state: 'bright day',
        })

        // Create issues worth ~26 points (invalid in normal mode)
        const currentContext = `CHARACTER POSITIONS:
- Hero: far right
LIGHTING: dark night
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        // High (20) + Medium (10) = 30 penalty, score = 70
        expect(result.overallScore).toBeLessThanOrEqual(75)
        expect(result.isValid).toBe(false)
      })

      it('uses 90 threshold in strict mode', async () => {
        const previousState = createMockVisualState({
          camera_position: 'close-up',
        })

        // Create issues worth ~10 points
        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: wide shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext, { strictMode: true })

        // Medium severity in strict mode = 15 penalty
        expect(result.overallScore).toBe(85)
        expect(result.isValid).toBe(false) // Below 90 threshold in strict mode
      })
    })

    describe('Allowed Discrepancies', () => {
      it('filters out allowed issue types', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'bright day',
          camera_position: 'close-up',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: dark night
CAMERA: wide shot
MOOD/ATMOSPHERE: calm`

        const options: ValidationOptions = {
          allowedDiscrepancies: ['lighting'],
        }

        const result = await validateContinuity(previousState, currentContext, options)

        // Lighting issue should be filtered out
        const lightingIssues = result.issues.filter((i) => i.type === 'lighting')
        expect(lightingIssues).toHaveLength(0)

        // Camera issue should still be present
        const cameraIssues = result.issues.filter((i) => i.type === 'camera')
        expect(cameraIssues).toHaveLength(1)
      })

      it('filters multiple allowed types', async () => {
        const previousState = createMockVisualState({
          lighting_state: 'bright day',
          mood_atmosphere: 'tense',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: dark night
CAMERA: medium shot
MOOD/ATMOSPHERE: relaxed`

        const options: ValidationOptions = {
          allowedDiscrepancies: ['lighting', 'mood'],
        }

        const result = await validateContinuity(previousState, currentContext, options)

        expect(result.issues).toHaveLength(0)
        expect(result.overallScore).toBe(100)
      })
    })

    describe('Auto-Correction', () => {
      it('generates auto-correction when requested and issues exist', async () => {
        const previousState = createMockVisualState({
          character_positions: { Hero: 'far left' },
        })

        const currentContext = `CHARACTER POSITIONS:
- Hero: far right
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const options: ValidationOptions = {
          autoCorrect: true,
        }

        const result = await validateContinuity(previousState, currentContext, options)

        expect(result.autoCorrection).toBeDefined()
        expect(result.autoCorrection).toBe('Add smooth transition between segments.')
        expect(mockCreate).toHaveBeenCalled()
      })

      it('does not generate auto-correction when no issues', async () => {
        const previousState = createMockVisualState()

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const options: ValidationOptions = {
          autoCorrect: true,
        }

        const result = await validateContinuity(previousState, currentContext, options)

        expect(result.autoCorrection).toBeUndefined()
        expect(mockCreate).not.toHaveBeenCalled()
      })

      it('handles auto-correction API error gracefully', async () => {
        mockCreate.mockRejectedValueOnce(new Error('API error'))

        const previousState = createMockVisualState({
          lighting_state: 'bright day',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: dark night
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const options: ValidationOptions = {
          autoCorrect: true,
        }

        const result = await validateContinuity(previousState, currentContext, options)

        expect(result.autoCorrection).toBe(
          'Auto-correction unavailable - please review issues manually'
        )
      })

      it('handles null API response content', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: null } }],
        })

        const previousState = createMockVisualState({
          lighting_state: 'bright day',
        })

        const currentContext = `CHARACTER POSITIONS:
LIGHTING: dark night
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const options: ValidationOptions = {
          autoCorrect: true,
        }

        const result = await validateContinuity(previousState, currentContext, options)

        expect(result.autoCorrection).toBe('Unable to generate auto-correction')
      })
    })

    describe('Context Parsing', () => {
      it('handles context with no character positions', async () => {
        const previousState = createMockVisualState()

        const currentContext = `LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`

        const result = await validateContinuity(previousState, currentContext)

        // Should not throw and handle gracefully
        expect(result).toBeDefined()
        expect(result.isValid).toBe(true)
      })

      it('handles context with missing sections', async () => {
        const previousState = createMockVisualState()

        const currentContext = `Some random text without proper format`

        const result = await validateContinuity(previousState, currentContext)

        // Should not throw
        expect(result).toBeDefined()
      })
    })
  })

  describe('validateSegmentChain', () => {
    it('validates multiple segments in sequence', async () => {
      const segments = [
        {
          visualState: createMockVisualState({
            character_positions: { Hero: 'center' },
          }),
          context: '',
        },
        {
          visualState: createMockVisualState({
            character_positions: { Hero: 'center' },
          }),
          context: `CHARACTER POSITIONS:
- Hero: center
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`,
        },
        {
          visualState: createMockVisualState({
            character_positions: { Hero: 'center' },
          }),
          context: `CHARACTER POSITIONS:
- Hero: center
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`,
        },
      ]

      const results = await validateSegmentChain(segments)

      expect(results).toHaveLength(2) // n-1 validations for n segments
      expect(results[0].segmentIndex).toBe(1)
      expect(results[1].segmentIndex).toBe(2)
    })

    it('returns empty array for single segment', async () => {
      const segments = [
        {
          visualState: createMockVisualState(),
          context: '',
        },
      ]

      const results = await validateSegmentChain(segments)

      expect(results).toHaveLength(0)
    })

    it('returns empty array for empty segment array', async () => {
      const results = await validateSegmentChain([])

      expect(results).toHaveLength(0)
    })

    it('passes options to each validation', async () => {
      const segments = [
        {
          visualState: createMockVisualState({
            lighting_state: 'day',
          }),
          context: '',
        },
        {
          visualState: createMockVisualState(),
          context: `LIGHTING: night
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`,
        },
      ]

      const options: ValidationOptions = {
        allowedDiscrepancies: ['lighting'],
      }

      const results = await validateSegmentChain(segments, options)

      // Lighting issue should be filtered
      expect(results[0].validation.issues.filter((i) => i.type === 'lighting')).toHaveLength(0)
    })

    it('detects issues across chain', async () => {
      const segments = [
        {
          visualState: createMockVisualState({
            character_positions: { Hero: 'left' },
          }),
          context: '',
        },
        {
          visualState: createMockVisualState(),
          context: `CHARACTER POSITIONS:
- Hero: right
LIGHTING: natural daylight
CAMERA: medium shot
MOOD/ATMOSPHERE: calm`,
        },
      ]

      const results = await validateSegmentChain(segments)

      expect(results[0].validation.issues.length).toBeGreaterThan(0)
    })
  })
})
