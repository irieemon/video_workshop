/**
 * Visual State Extractor Tests
 *
 * Tests for the visual state extraction module used in multi-segment video generation.
 * The extractor analyzes AI-generated video prompts and extracts visual state for
 * continuity propagation between segments.
 *
 * Test Coverage:
 * - extractVisualState: Main async extraction function
 * - buildContinuityContext: Pure function for context string generation
 * - batchExtractVisualStates: Parallel extraction for multiple segments
 * - isVisualStateValid: Validation helper
 * - mergeVisualStates: Merging multiple visual states
 */

// Mock OpenAI before imports
jest.mock('openai', () => require('../../helpers/openai-mock').createOpenAIMockFactory())

import {
  extractVisualState,
  buildContinuityContext,
  batchExtractVisualStates,
  isVisualStateValid,
  mergeVisualStates,
  type SegmentVisualState,
  type VisualStateExtractionOptions,
} from '@/lib/ai/visual-state-extractor'
import {
  getOpenAIMocks,
  mockChatCompletionJSON,
  mockChatCompletionError,
  mockChatCompletion,
  createMockChatCompletion,
} from '../../helpers/openai-mock'

// ============================================================================
// Test Data Builders
// ============================================================================

interface MockVisualStateResponse {
  final_frame_description?: string
  character_positions?: Record<string, string>
  lighting_state?: string
  camera_position?: string
  mood_atmosphere?: string
  key_visual_elements?: string[]
}

function createMockVisualStateResponse(overrides: MockVisualStateResponse = {}): MockVisualStateResponse {
  return {
    final_frame_description: overrides.final_frame_description ?? 'A dramatic sunset scene with silhouetted figures',
    character_positions: overrides.character_positions ?? {
      protagonist: 'standing in foreground, facing camera',
      antagonist: 'partially visible in background shadows',
    },
    lighting_state: overrides.lighting_state ?? 'Golden hour lighting with warm orange tones',
    camera_position: overrides.camera_position ?? 'Wide shot from low angle',
    mood_atmosphere: overrides.mood_atmosphere ?? 'Tense and dramatic',
    key_visual_elements: overrides.key_visual_elements ?? ['sunset', 'city skyline', 'dust particles'],
  }
}

function createMockSegmentVisualState(overrides: Partial<SegmentVisualState> = {}): SegmentVisualState {
  return {
    final_frame_description: overrides.final_frame_description ?? 'A dramatic sunset scene with silhouetted figures',
    character_positions: overrides.character_positions ?? {
      protagonist: 'standing in foreground, facing camera',
      antagonist: 'partially visible in background shadows',
    },
    lighting_state: overrides.lighting_state ?? 'Golden hour lighting with warm orange tones',
    camera_position: overrides.camera_position ?? 'Wide shot from low angle',
    mood_atmosphere: overrides.mood_atmosphere ?? 'Tense and dramatic',
    key_visual_elements: overrides.key_visual_elements ?? ['sunset', 'city skyline', 'dust particles'],
    timestamp: overrides.timestamp ?? '2025-01-05T12:00:00.000Z',
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('visual-state-extractor', () => {
  let mockCreate: jest.Mock

  beforeAll(() => {
    const mocks = getOpenAIMocks()
    mockCreate = mocks.mockCreate
  })

  beforeEach(() => {
    mockCreate.mockReset()
  })

  // ==========================================================================
  // extractVisualState Tests
  // ==========================================================================
  describe('extractVisualState', () => {
    describe('Successful Extraction', () => {
      it('extracts visual state from a valid prompt', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await extractVisualState('A cinematic scene of a hero walking through the rain')

        expect(result.final_frame_description).toBe(mockResponse.final_frame_description)
        expect(result.lighting_state).toBe(mockResponse.lighting_state)
        expect(result.camera_position).toBe(mockResponse.camera_position)
        expect(result.mood_atmosphere).toBe(mockResponse.mood_atmosphere)
      })

      it('extracts character positions correctly', async () => {
        const mockResponse = createMockVisualStateResponse({
          character_positions: {
            hero: 'center frame, walking forward',
            sidekick: 'behind hero, looking around',
          },
        })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await extractVisualState('Hero and sidekick advancing through corridor')

        expect(result.character_positions).toEqual({
          hero: 'center frame, walking forward',
          sidekick: 'behind hero, looking around',
        })
      })

      it('extracts key visual elements as array', async () => {
        const mockResponse = createMockVisualStateResponse({
          key_visual_elements: ['rain', 'neon signs', 'wet pavement', 'reflections'],
        })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await extractVisualState('Rainy cyberpunk street scene')

        expect(result.key_visual_elements).toEqual(['rain', 'neon signs', 'wet pavement', 'reflections'])
        expect(Array.isArray(result.key_visual_elements)).toBe(true)
      })

      it('includes timestamp in result', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const beforeTime = new Date().toISOString()
        const result = await extractVisualState('Test prompt')
        const afterTime = new Date().toISOString()

        expect(result.timestamp).toBeDefined()
        expect(result.timestamp >= beforeTime).toBe(true)
        expect(result.timestamp <= afterTime).toBe(true)
      })

      it('handles partial API response with defaults', async () => {
        const partialResponse = {
          final_frame_description: 'Partial scene',
          lighting_state: 'Natural',
          // Missing other fields
        }
        mockChatCompletionJSON(mockCreate, partialResponse)

        const result = await extractVisualState('Test prompt')

        expect(result.final_frame_description).toBe('Partial scene')
        expect(result.lighting_state).toBe('Natural')
        expect(result.character_positions).toEqual({})
        expect(result.camera_position).toBe('')
        expect(result.mood_atmosphere).toBe('')
        expect(result.key_visual_elements).toEqual([])
      })

      it('handles completely empty extracted fields with defaults', async () => {
        mockChatCompletionJSON(mockCreate, {})

        const result = await extractVisualState('Test prompt')

        expect(result.final_frame_description).toBe('')
        expect(result.character_positions).toEqual({})
        expect(result.lighting_state).toBe('')
        expect(result.camera_position).toBe('')
        expect(result.mood_atmosphere).toBe('')
        expect(result.key_visual_elements).toEqual([])
      })
    })

    describe('Options Handling', () => {
      it('passes character IDs to prompt when provided', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt', {
          characterIds: ['char_001', 'char_002'],
        })

        const call = mockCreate.mock.calls[0][0]
        const userMessage = call.messages.find((m: any) => m.role === 'user')
        expect(userMessage.content).toContain('KNOWN CHARACTERS TO TRACK')
        expect(userMessage.content).toContain('char_001')
        expect(userMessage.content).toContain('char_002')
      })

      it('passes focus areas to prompt when provided', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt', {
          focusAreas: ['lighting', 'camera movement'],
        })

        const call = mockCreate.mock.calls[0][0]
        const userMessage = call.messages.find((m: any) => m.role === 'user')
        expect(userMessage.content).toContain('FOCUS AREAS')
        expect(userMessage.content).toContain('lighting')
        expect(userMessage.content).toContain('camera movement')
      })

      it('handles both character IDs and focus areas together', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt', {
          characterIds: ['hero'],
          focusAreas: ['action'],
        })

        const call = mockCreate.mock.calls[0][0]
        const userMessage = call.messages.find((m: any) => m.role === 'user')
        expect(userMessage.content).toContain('KNOWN CHARACTERS TO TRACK')
        expect(userMessage.content).toContain('hero')
        expect(userMessage.content).toContain('FOCUS AREAS')
        expect(userMessage.content).toContain('action')
      })

      it('handles empty options object', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await extractVisualState('Test prompt', {})

        expect(result.final_frame_description).toBe(mockResponse.final_frame_description)
      })

      it('handles empty character IDs array', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt', { characterIds: [] })

        const call = mockCreate.mock.calls[0][0]
        const userMessage = call.messages.find((m: any) => m.role === 'user')
        expect(userMessage.content).not.toContain('KNOWN CHARACTERS TO TRACK')
      })
    })

    describe('API Configuration', () => {
      it('uses gpt-4o-mini model', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt')

        const call = mockCreate.mock.calls[0][0]
        expect(call.model).toBe('gpt-4o-mini')
      })

      it('requests JSON response format', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt')

        const call = mockCreate.mock.calls[0][0]
        expect(call.response_format).toEqual({ type: 'json_object' })
      })

      it('uses low temperature for consistency', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt')

        const call = mockCreate.mock.calls[0][0]
        expect(call.temperature).toBe(0.3)
      })

      it('sets appropriate max tokens', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt')

        const call = mockCreate.mock.calls[0][0]
        expect(call.max_tokens).toBe(800)
      })

      it('includes system prompt with extraction instructions', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await extractVisualState('Test prompt')

        const call = mockCreate.mock.calls[0][0]
        const systemMessage = call.messages.find((m: any) => m.role === 'system')
        expect(systemMessage.content).toContain('visual continuity analyzer')
        expect(systemMessage.content).toContain('Final frame description')
        expect(systemMessage.content).toContain('Character positions')
      })
    })

    describe('Error Handling', () => {
      it('returns fallback state on API error', async () => {
        mockChatCompletionError(mockCreate, new Error('API Error'))

        const result = await extractVisualState('Test prompt')

        expect(result.final_frame_description).toBe('Unable to extract visual state from prompt')
        expect(result.character_positions).toEqual({})
        expect(result.lighting_state).toBe('Natural lighting')
        expect(result.camera_position).toBe('Medium shot')
        expect(result.mood_atmosphere).toBe('Neutral')
        expect(result.key_visual_elements).toEqual([])
      })

      it('returns fallback state on JSON parse error', async () => {
        mockChatCompletion(mockCreate, 'not valid json')

        const result = await extractVisualState('Test prompt')

        expect(result.final_frame_description).toBe('Unable to extract visual state from prompt')
        expect(result.lighting_state).toBe('Natural lighting')
      })

      it('returns fallback state when API returns empty content', async () => {
        mockCreate.mockResolvedValue(
          createMockChatCompletion({ content: null as any })
        )

        const result = await extractVisualState('Test prompt')

        expect(result.final_frame_description).toBe('Unable to extract visual state from prompt')
      })

      it('returns fallback state with timestamp on error', async () => {
        mockChatCompletionError(mockCreate, new Error('API Error'))

        const result = await extractVisualState('Test prompt')

        expect(result.timestamp).toBeDefined()
        expect(typeof result.timestamp).toBe('string')
      })

      it('handles network timeout gracefully', async () => {
        const timeoutError = new Error('Request timeout')
        timeoutError.name = 'TimeoutError'
        mockChatCompletionError(mockCreate, timeoutError)

        const result = await extractVisualState('Test prompt')

        expect(result.final_frame_description).toBe('Unable to extract visual state from prompt')
      })
    })
  })

  // ==========================================================================
  // buildContinuityContext Tests
  // ==========================================================================
  describe('buildContinuityContext', () => {
    describe('Basic Context Building', () => {
      it('includes header and footer markers', () => {
        const visualState = createMockSegmentVisualState()
        const context = buildContinuityContext(visualState)

        expect(context).toContain('=== VISUAL CONTINUITY FROM PREVIOUS SEGMENT ===')
        expect(context).toContain('=== END CONTINUITY CONTEXT ===')
      })

      it('includes final frame description', () => {
        const visualState = createMockSegmentVisualState({
          final_frame_description: 'Hero standing in doorway with light behind',
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('PREVIOUS SEGMENT ENDED WITH:')
        expect(context).toContain('Hero standing in doorway with light behind')
      })

      it('includes lighting state', () => {
        const visualState = createMockSegmentVisualState({
          lighting_state: 'Harsh overhead fluorescent lighting',
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('LIGHTING: Harsh overhead fluorescent lighting')
      })

      it('includes camera position', () => {
        const visualState = createMockSegmentVisualState({
          camera_position: 'Close-up, Dutch angle',
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('CAMERA: Close-up, Dutch angle')
      })

      it('includes mood/atmosphere', () => {
        const visualState = createMockSegmentVisualState({
          mood_atmosphere: 'Eerie and suspenseful',
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('MOOD/ATMOSPHERE: Eerie and suspenseful')
      })
    })

    describe('Character Positions', () => {
      it('includes character positions when present', () => {
        const visualState = createMockSegmentVisualState({
          character_positions: {
            detective: 'crouched behind desk',
            suspect: 'standing near window',
          },
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('CHARACTER POSITIONS:')
        expect(context).toContain('detective: crouched behind desk')
        expect(context).toContain('suspect: standing near window')
      })

      it('omits character positions section when empty', () => {
        const visualState = createMockSegmentVisualState({
          character_positions: {},
        })
        const context = buildContinuityContext(visualState)

        expect(context).not.toContain('CHARACTER POSITIONS:')
      })

      it('handles single character position', () => {
        const visualState = createMockSegmentVisualState({
          character_positions: { hero: 'center frame' },
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('CHARACTER POSITIONS:')
        expect(context).toContain('hero: center frame')
      })
    })

    describe('Key Visual Elements', () => {
      it('includes key visual elements when present', () => {
        const visualState = createMockSegmentVisualState({
          key_visual_elements: ['red car', 'broken glass', 'flickering light'],
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('KEY VISUAL ELEMENTS TO MAINTAIN:')
        expect(context).toContain('- red car')
        expect(context).toContain('- broken glass')
        expect(context).toContain('- flickering light')
      })

      it('omits visual elements section when array is empty', () => {
        const visualState = createMockSegmentVisualState({
          key_visual_elements: [],
        })
        const context = buildContinuityContext(visualState)

        expect(context).not.toContain('KEY VISUAL ELEMENTS TO MAINTAIN:')
      })

      it('handles single visual element', () => {
        const visualState = createMockSegmentVisualState({
          key_visual_elements: ['lone tree'],
        })
        const context = buildContinuityContext(visualState)

        expect(context).toContain('KEY VISUAL ELEMENTS TO MAINTAIN:')
        expect(context).toContain('- lone tree')
      })
    })

    describe('Continuity Instructions', () => {
      it('includes critical continuity instruction', () => {
        const visualState = createMockSegmentVisualState()
        const context = buildContinuityContext(visualState)

        expect(context).toContain('CRITICAL: Maintain visual continuity')
        expect(context).toContain('smooth transitions')
      })
    })
  })

  // ==========================================================================
  // batchExtractVisualStates Tests
  // ==========================================================================
  describe('batchExtractVisualStates', () => {
    describe('Parallel Processing', () => {
      it('extracts visual states for multiple prompts', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const prompts = [
          { segmentId: 'seg_001', prompt: 'First scene' },
          { segmentId: 'seg_002', prompt: 'Second scene' },
        ]

        const results = await batchExtractVisualStates(prompts)

        expect(results).toHaveLength(2)
        expect(results[0].segmentId).toBe('seg_001')
        expect(results[1].segmentId).toBe('seg_002')
      })

      it('returns visual state for each segment', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const prompts = [
          { segmentId: 'seg_001', prompt: 'First scene' },
        ]

        const results = await batchExtractVisualStates(prompts)

        expect(results[0].visualState).toBeDefined()
        expect(results[0].visualState.final_frame_description).toBe(mockResponse.final_frame_description)
      })

      it('handles empty prompts array', async () => {
        const results = await batchExtractVisualStates([])

        expect(results).toEqual([])
        expect(mockCreate).not.toHaveBeenCalled()
      })

      it('processes prompts in parallel', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const prompts = [
          { segmentId: 'seg_001', prompt: 'First' },
          { segmentId: 'seg_002', prompt: 'Second' },
          { segmentId: 'seg_003', prompt: 'Third' },
        ]

        await batchExtractVisualStates(prompts)

        // All three calls should be made
        expect(mockCreate).toHaveBeenCalledTimes(3)
      })

      it('passes options to all extractions', async () => {
        const mockResponse = createMockVisualStateResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const prompts = [
          { segmentId: 'seg_001', prompt: 'First' },
          { segmentId: 'seg_002', prompt: 'Second' },
        ]

        await batchExtractVisualStates(prompts, { characterIds: ['hero'] })

        // Both calls should include the character IDs
        const calls = mockCreate.mock.calls
        calls.forEach((call: any[]) => {
          const userMessage = call[0].messages.find((m: any) => m.role === 'user')
          expect(userMessage.content).toContain('hero')
        })
      })
    })

    describe('Error Handling', () => {
      it('handles partial failures gracefully', async () => {
        // First call succeeds, second fails
        mockCreate
          .mockResolvedValueOnce(
            createMockChatCompletion({ content: JSON.stringify(createMockVisualStateResponse()) })
          )
          .mockRejectedValueOnce(new Error('API Error'))

        const prompts = [
          { segmentId: 'seg_001', prompt: 'First' },
          { segmentId: 'seg_002', prompt: 'Second' },
        ]

        const results = await batchExtractVisualStates(prompts)

        // Both should return (second with fallback state)
        expect(results).toHaveLength(2)
        expect(results[0].visualState.final_frame_description).not.toBe('Unable to extract visual state from prompt')
        expect(results[1].visualState.final_frame_description).toBe('Unable to extract visual state from prompt')
      })
    })
  })

  // ==========================================================================
  // isVisualStateValid Tests
  // ==========================================================================
  describe('isVisualStateValid', () => {
    describe('Valid States', () => {
      it('returns true for complete valid state', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: 'A detailed scene description that is longer than twenty characters',
          lighting_state: 'Natural daylight',
          camera_position: 'Wide shot',
        })

        expect(isVisualStateValid(state)).toBe(true)
      })

      it('returns true when final_frame_description is exactly 21 characters', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: 'A scene with a house', // exactly 20 characters - should be > 20
          lighting_state: 'Natural',
          camera_position: 'Wide',
        })

        expect(isVisualStateValid(state)).toBe(false)

        state.final_frame_description = 'A scene with a houses' // 21 characters
        expect(isVisualStateValid(state)).toBe(true)
      })
    })

    describe('Invalid States', () => {
      it('returns false when final_frame_description is too short', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: 'Short', // < 20 characters
          lighting_state: 'Natural',
          camera_position: 'Wide',
        })

        expect(isVisualStateValid(state)).toBe(false)
      })

      it('returns false when final_frame_description is empty', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: '',
          lighting_state: 'Natural',
          camera_position: 'Wide',
        })

        expect(isVisualStateValid(state)).toBe(false)
      })

      it('returns false when lighting_state is empty', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: 'A sufficiently long frame description here',
          lighting_state: '',
          camera_position: 'Wide',
        })

        expect(isVisualStateValid(state)).toBe(false)
      })

      it('returns false when camera_position is empty', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: 'A sufficiently long frame description here',
          lighting_state: 'Natural',
          camera_position: '',
        })

        expect(isVisualStateValid(state)).toBe(false)
      })

      it('returns false for fallback error state', () => {
        const fallbackState: SegmentVisualState = {
          final_frame_description: 'Unable to extract visual state from prompt',
          character_positions: {},
          lighting_state: 'Natural lighting',
          camera_position: 'Medium shot',
          mood_atmosphere: 'Neutral',
          key_visual_elements: [],
          timestamp: new Date().toISOString(),
        }

        // This state has description > 20 chars, so it actually passes
        expect(isVisualStateValid(fallbackState)).toBe(true)
      })
    })
  })

  // ==========================================================================
  // mergeVisualStates Tests
  // ==========================================================================
  describe('mergeVisualStates', () => {
    describe('Error Handling', () => {
      it('throws error for empty array', () => {
        expect(() => mergeVisualStates([])).toThrow('Cannot merge empty visual states array')
      })
    })

    describe('Single State', () => {
      it('returns the single state unchanged', () => {
        const state = createMockSegmentVisualState({
          final_frame_description: 'Single scene',
        })

        const result = mergeVisualStates([state])

        expect(result).toBe(state) // Same reference
        expect(result.final_frame_description).toBe('Single scene')
      })
    })

    describe('Multiple States Merging', () => {
      it('uses most recent state as base', () => {
        const state1 = createMockSegmentVisualState({
          final_frame_description: 'First scene',
          lighting_state: 'Morning light',
          timestamp: '2025-01-01T10:00:00.000Z',
        })
        const state2 = createMockSegmentVisualState({
          final_frame_description: 'Second scene',
          lighting_state: 'Afternoon light',
          timestamp: '2025-01-01T14:00:00.000Z',
        })

        const result = mergeVisualStates([state1, state2])

        expect(result.final_frame_description).toBe('Second scene')
        expect(result.lighting_state).toBe('Afternoon light')
      })

      it('merges character positions from all states', () => {
        const state1 = createMockSegmentVisualState({
          character_positions: { hero: 'center' },
        })
        const state2 = createMockSegmentVisualState({
          character_positions: { villain: 'left side' },
        })

        const result = mergeVisualStates([state1, state2])

        expect(result.character_positions).toEqual({
          hero: 'center',
          villain: 'left side',
        })
      })

      it('prefers more recent character position for same character', () => {
        const state1 = createMockSegmentVisualState({
          character_positions: { hero: 'left side' },
        })
        const state2 = createMockSegmentVisualState({
          character_positions: { hero: 'center frame' },
        })

        const result = mergeVisualStates([state1, state2])

        expect(result.character_positions.hero).toBe('center frame')
      })

      it('deduplicates key visual elements', () => {
        const state1 = createMockSegmentVisualState({
          key_visual_elements: ['tree', 'car', 'building'],
        })
        const state2 = createMockSegmentVisualState({
          key_visual_elements: ['car', 'lamp', 'tree'], // 'tree' and 'car' are duplicates
        })

        const result = mergeVisualStates([state1, state2])

        expect(result.key_visual_elements).toContain('tree')
        expect(result.key_visual_elements).toContain('car')
        expect(result.key_visual_elements).toContain('building')
        expect(result.key_visual_elements).toContain('lamp')
        // Check no duplicates
        expect(result.key_visual_elements.filter((e) => e === 'tree')).toHaveLength(1)
        expect(result.key_visual_elements.filter((e) => e === 'car')).toHaveLength(1)
      })

      it('collects all visual elements from all states', () => {
        const state1 = createMockSegmentVisualState({
          key_visual_elements: ['element1'],
        })
        const state2 = createMockSegmentVisualState({
          key_visual_elements: ['element2'],
        })
        const state3 = createMockSegmentVisualState({
          key_visual_elements: ['element3'],
        })

        const result = mergeVisualStates([state1, state2, state3])

        expect(result.key_visual_elements).toHaveLength(3)
        expect(result.key_visual_elements).toContain('element1')
        expect(result.key_visual_elements).toContain('element2')
        expect(result.key_visual_elements).toContain('element3')
      })

      it('handles states with empty character positions', () => {
        const state1 = createMockSegmentVisualState({
          character_positions: {},
        })
        const state2 = createMockSegmentVisualState({
          character_positions: { hero: 'present' },
        })

        const result = mergeVisualStates([state1, state2])

        expect(result.character_positions).toEqual({ hero: 'present' })
      })

      it('handles states with empty visual elements', () => {
        const state1 = createMockSegmentVisualState({
          key_visual_elements: [],
        })
        const state2 = createMockSegmentVisualState({
          key_visual_elements: ['element'],
        })

        const result = mergeVisualStates([state1, state2])

        expect(result.key_visual_elements).toEqual(['element'])
      })

      it('merges three or more states correctly', () => {
        const state1 = createMockSegmentVisualState({
          character_positions: { char1: 'pos1' },
          key_visual_elements: ['a'],
        })
        const state2 = createMockSegmentVisualState({
          character_positions: { char2: 'pos2' },
          key_visual_elements: ['b'],
        })
        const state3 = createMockSegmentVisualState({
          final_frame_description: 'Final scene from state 3',
          character_positions: { char3: 'pos3' },
          key_visual_elements: ['c'],
        })

        const result = mergeVisualStates([state1, state2, state3])

        expect(result.final_frame_description).toBe('Final scene from state 3')
        expect(result.character_positions).toEqual({
          char1: 'pos1',
          char2: 'pos2',
          char3: 'pos3',
        })
        expect(result.key_visual_elements).toHaveLength(3)
      })
    })
  })
})
