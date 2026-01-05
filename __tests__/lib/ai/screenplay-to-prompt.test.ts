/**
 * Tests for Screenplay to Prompt Converter
 *
 * Tests the conversion of screenplay scenes to Sora-optimized video prompts.
 * Uses mocked OpenAI API to ensure deterministic test results.
 */

// Mock OpenAI - store the mock in the module for access
jest.mock('openai', () => {
  const mockCreate = jest.fn()
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }))
  // Attach the mock to the constructor for test access
  ;(MockOpenAI as any)._mockCreate = mockCreate

  return {
    __esModule: true,
    default: MockOpenAI,
  }
})

import OpenAI from 'openai'
import {
  convertScreenplayToPrompt,
  convertEpisodeToPrompts,
  ScreenplayToPromptOptions,
  SoraPrompt,
} from '@/lib/ai/screenplay-to-prompt'
import type { Scene, StructuredScreenplay } from '@/lib/types/database.types'

// Get the mock from the mocked module
const mockCreate = (): jest.Mock => (OpenAI as any)._mockCreate

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockSoraPromptResponse(): SoraPrompt {
  return {
    prompt: 'A dramatic wide shot of a hero standing on a cliff overlooking a vast kingdom at sunset. Golden hour lighting bathes the scene in warm tones. The camera slowly pushes in on the hero\'s determined expression.',
    scene_description: 'Hero overlooks kingdom at sunset',
    technical_details: {
      shot_type: 'wide',
      camera_movement: 'slow push-in',
      lighting: 'golden hour',
      mood: 'epic and hopeful',
      duration_estimate: 10,
    },
    visual_elements: ['cliff', 'kingdom panorama', 'sunset', 'hero silhouette'],
    characters_involved: ['Hero'],
  }
}

function createMockScene(overrides: Partial<Scene> = {}): Scene {
  return {
    scene_id: 'scene-1',
    scene_number: 1,
    location: 'Mountain Cliff',
    time_of_day: 'EXT',
    time_period: 'EVENING',
    description: 'A dramatic clifftop overlooking the kingdom',
    characters: ['Hero'],
    action: ['Hero stands at the edge, gazing at the horizon'],
    dialogue: [
      {
        character: 'Hero',
        lines: ['This is where it all begins...'],
      },
    ],
    ...overrides,
  } as Scene
}

function createMockStructuredScreenplay(scenes: Scene[]): StructuredScreenplay {
  return {
    title: 'Epic Adventure',
    scenes,
  } as StructuredScreenplay
}

function createMockSeriesContext() {
  return {
    name: 'Epic Adventure Series',
    visual_template: {
      camera_style: 'Cinematic',
      color_palette: 'Warm earth tones',
    },
    characters: [
      { name: 'Hero', description: 'A brave young warrior' },
      { name: 'Mentor', description: 'A wise elder guide' },
    ],
    settings: [
      { name: 'Mountain Cliff', description: 'A dramatic cliff overlooking the kingdom' },
      { name: 'Village', description: 'A peaceful mountain village' },
    ],
  }
}

// ============================================================================
// convertScreenplayToPrompt Tests
// ============================================================================

describe('convertScreenplayToPrompt', () => {
  beforeEach(() => {
    mockCreate().mockReset()
  })

  describe('Basic Conversion', () => {
    it('calls OpenAI with correct model and parameters', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'INT. OFFICE - DAY\nThe hero enters.',
      })

      expect(mockCreate()).toHaveBeenCalledTimes(1)
      const call = mockCreate().mock.calls[0][0]
      expect(call.model).toBe('gpt-4o')
      expect(call.temperature).toBe(0.7)
      expect(call.response_format).toEqual({ type: 'json_object' })
    })

    it('returns parsed SoraPrompt object', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const result = await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
      })

      expect(result.prompt).toBe(mockResponse.prompt)
      expect(result.scene_description).toBe(mockResponse.scene_description)
      expect(result.technical_details).toEqual(mockResponse.technical_details)
      expect(result.visual_elements).toEqual(mockResponse.visual_elements)
      expect(result.characters_involved).toEqual(mockResponse.characters_involved)
    })

    it('throws error when no response from OpenAI', async () => {
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: null } }],
      })

      await expect(
        convertScreenplayToPrompt({ screenplay_text: 'Test' })
      ).rejects.toThrow('No response from OpenAI')
    })

    it('throws error when empty choices array', async () => {
      mockCreate().mockResolvedValue({ choices: [] })

      await expect(
        convertScreenplayToPrompt({ screenplay_text: 'Test' })
      ).rejects.toThrow('No response from OpenAI')
    })
  })

  describe('System Prompt', () => {
    it('includes Sora optimization guidelines in system prompt', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({ screenplay_text: 'Test screenplay' })

      const call = mockCreate().mock.calls[0][0]
      const systemMessage = call.messages.find((m: any) => m.role === 'system')

      expect(systemMessage.content).toContain('Sora')
      expect(systemMessage.content).toContain('video generation prompts')
      expect(systemMessage.content).toContain('camera angles')
      expect(systemMessage.content).toContain('lighting')
      expect(systemMessage.content).toContain('visual elements')
    })

    it('includes JSON response format in system prompt', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({ screenplay_text: 'Test screenplay' })

      const call = mockCreate().mock.calls[0][0]
      const systemMessage = call.messages.find((m: any) => m.role === 'system')

      expect(systemMessage.content).toContain('"prompt"')
      expect(systemMessage.content).toContain('"scene_description"')
      expect(systemMessage.content).toContain('"technical_details"')
    })
  })

  describe('Series Context', () => {
    it('includes series name in user message when context provided', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
        series_context: createMockSeriesContext(),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('SERIES CONTEXT:')
      expect(userMessage.content).toContain('Epic Adventure Series')
    })

    it('includes visual template in context', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
        series_context: createMockSeriesContext(),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Visual Style:')
      expect(userMessage.content).toContain('Cinematic')
    })

    it('includes character descriptions in context', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
        series_context: createMockSeriesContext(),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Characters:')
      expect(userMessage.content).toContain('Hero: A brave young warrior')
      expect(userMessage.content).toContain('Mentor: A wise elder guide')
    })

    it('includes setting descriptions in context', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
        series_context: createMockSeriesContext(),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Settings:')
      expect(userMessage.content).toContain('Mountain Cliff')
      expect(userMessage.content).toContain('Village')
    })

    it('handles characters without descriptions', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
        series_context: {
          name: 'Test Series',
          characters: [{ name: 'Unknown', description: null }],
        },
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Unknown: No description')
    })

    it('omits context section when no series_context provided', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Test screenplay',
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).not.toContain('SERIES CONTEXT:')
    })
  })

  describe('Scene Selection', () => {
    it('extracts specific scene when scene_id provided', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene1 = createMockScene({ scene_id: 'scene-1', location: 'OFFICE' })
      const scene2 = createMockScene({ scene_id: 'scene-2', location: 'BEACH' })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback text',
        structured_screenplay: createMockStructuredScreenplay([scene1, scene2]),
        scene_id: 'scene-2',
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('BEACH')
      expect(userMessage.content).not.toContain('OFFICE')
    })

    it('uses first scene when no scene_id but structured_screenplay provided', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene1 = createMockScene({ scene_id: 'scene-1', location: 'FIRST LOCATION' })
      const scene2 = createMockScene({ scene_id: 'scene-2', location: 'SECOND LOCATION' })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback text',
        structured_screenplay: createMockStructuredScreenplay([scene1, scene2]),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('FIRST LOCATION')
    })

    it('uses raw screenplay_text when no structured_screenplay', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'INT. RAW SCREENPLAY - DAY\nSome action happens.',
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('RAW SCREENPLAY')
    })

    it('limits raw screenplay_text to 2000 characters', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const longText = 'A'.repeat(3000)
      await convertScreenplayToPrompt({ screenplay_text: longText })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      // The text should be limited to 2000 chars plus header text
      expect(userMessage.content.length).toBeLessThan(2100)
    })

    it('handles scene_id not found gracefully', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene1 = createMockScene({ scene_id: 'scene-1', location: 'OFFICE' })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene1]),
        scene_id: 'nonexistent',
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      // Should fall back to first scene
      expect(userMessage.content).toContain('OFFICE')
    })
  })

  describe('Scene Formatting', () => {
    it('formats scene heading correctly', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene = createMockScene({
        time_of_day: 'INT',
        location: 'Office Building',
        time_period: 'DAY',
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene]),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('INT. OFFICE BUILDING - DAY')
    })

    it('includes scene description', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene = createMockScene({
        description: 'A dimly lit room with papers scattered everywhere',
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene]),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('A dimly lit room with papers scattered')
    })

    it('includes characters present', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene = createMockScene({
        characters: ['Alice', 'Bob', 'Charlie'],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene]),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Characters: Alice, Bob, Charlie')
    })

    it('includes action lines', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene = createMockScene({
        action: ['Hero draws sword', 'Villain laughs menacingly'],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene]),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Hero draws sword')
      expect(userMessage.content).toContain('Villain laughs menacingly')
    })

    it('formats dialogue correctly', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene = createMockScene({
        dialogue: [
          { character: 'Hero', lines: ['I will not fail!'] },
          { character: 'Mentor', lines: ['Believe in yourself.', 'You are ready.'] },
        ],
      })

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene]),
      })

      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('Hero')
      expect(userMessage.content).toContain('I will not fail!')
      expect(userMessage.content).toContain('Mentor')
      expect(userMessage.content).toContain('Believe in yourself.')
    })

    it('handles scene with no optional fields', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scene: Scene = {
        scene_id: 'scene-minimal',
        scene_number: 1,
        location: 'Unknown',
        time_of_day: 'EXT',
        time_period: 'NIGHT',
        description: null,
        characters: [],
        action: [],
        dialogue: [],
      } as Scene

      await convertScreenplayToPrompt({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay([scene]),
      })

      // Should not throw
      const call = mockCreate().mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      expect(userMessage.content).toContain('EXT. UNKNOWN - NIGHT')
    })
  })
})

// ============================================================================
// convertEpisodeToPrompts Tests
// ============================================================================

describe('convertEpisodeToPrompts', () => {
  beforeEach(() => {
    mockCreate().mockReset()
  })

  describe('Without Structured Screenplay', () => {
    it('converts as single prompt when no structured_screenplay', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const result = await convertEpisodeToPrompts({
        screenplay_text: 'Simple screenplay text',
      })

      expect(result).toHaveLength(1)
      expect(result[0].prompt).toBe(mockResponse.prompt)
    })

    it('converts as single prompt when structured_screenplay has no scenes', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const result = await convertEpisodeToPrompts({
        screenplay_text: 'Fallback text',
        structured_screenplay: { title: 'Empty', scenes: [] } as StructuredScreenplay,
      })

      expect(result).toHaveLength(1)
    })
  })

  describe('With Structured Screenplay', () => {
    it('converts each scene to a separate prompt', async () => {
      const scene1Response = { ...createMockSoraPromptResponse(), scene_description: 'Scene 1' }
      const scene2Response = { ...createMockSoraPromptResponse(), scene_description: 'Scene 2' }
      const scene3Response = { ...createMockSoraPromptResponse(), scene_description: 'Scene 3' }

      mockCreate()
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(scene1Response) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(scene2Response) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(scene3Response) } }] })

      const scenes = [
        createMockScene({ scene_id: 'scene-1' }),
        createMockScene({ scene_id: 'scene-2' }),
        createMockScene({ scene_id: 'scene-3' }),
      ]

      const result = await convertEpisodeToPrompts({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay(scenes),
      })

      expect(result).toHaveLength(3)
      expect(result[0].scene_description).toBe('Scene 1')
      expect(result[1].scene_description).toBe('Scene 2')
      expect(result[2].scene_description).toBe('Scene 3')
    })

    it('calls OpenAI once per scene', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scenes = [
        createMockScene({ scene_id: 'scene-1' }),
        createMockScene({ scene_id: 'scene-2' }),
      ]

      await convertEpisodeToPrompts({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay(scenes),
      })

      expect(mockCreate()).toHaveBeenCalledTimes(2)
    })

    it('passes scene_id for each scene', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scenes = [
        createMockScene({ scene_id: 'first-scene', location: 'LOCATION A' }),
        createMockScene({ scene_id: 'second-scene', location: 'LOCATION B' }),
      ]

      await convertEpisodeToPrompts({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay(scenes),
      })

      // First call should have first scene
      const firstCall = mockCreate().mock.calls[0][0]
      const firstUserMessage = firstCall.messages.find((m: any) => m.role === 'user')
      expect(firstUserMessage.content).toContain('LOCATION A')

      // Second call should have second scene
      const secondCall = mockCreate().mock.calls[1][0]
      const secondUserMessage = secondCall.messages.find((m: any) => m.role === 'user')
      expect(secondUserMessage.content).toContain('LOCATION B')
    })

    it('preserves series_context across all scene conversions', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })

      const scenes = [
        createMockScene({ scene_id: 'scene-1' }),
        createMockScene({ scene_id: 'scene-2' }),
      ]

      await convertEpisodeToPrompts({
        screenplay_text: 'Fallback',
        structured_screenplay: createMockStructuredScreenplay(scenes),
        series_context: createMockSeriesContext(),
      })

      // Both calls should include series context
      mockCreate().mock.calls.forEach((call) => {
        const userMessage = call[0].messages.find((m: any) => m.role === 'user')
        expect(userMessage.content).toContain('Epic Adventure Series')
      })
    })
  })

  describe('Error Handling', () => {
    it('propagates error if any scene conversion fails', async () => {
      const mockResponse = createMockSoraPromptResponse()
      mockCreate()
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(mockResponse) } }] })
        .mockRejectedValueOnce(new Error('API error'))

      const scenes = [
        createMockScene({ scene_id: 'scene-1' }),
        createMockScene({ scene_id: 'scene-2' }),
      ]

      await expect(
        convertEpisodeToPrompts({
          screenplay_text: 'Fallback',
          structured_screenplay: createMockStructuredScreenplay(scenes),
        })
      ).rejects.toThrow('API error')
    })
  })
})
