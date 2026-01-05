/**
 * Tests for lib/ai/vision-analysis.ts
 *
 * Tests the OpenAI Vision API integration for character image analysis.
 * Covers:
 * - analyzeCharacterImage: Single image analysis with visual fingerprint extraction
 * - analyzeMultipleImages: Parallel analysis and result merging
 */

// Mock OpenAI before any imports
jest.mock('openai', () => require('../../helpers/openai-mock').createOpenAIMockFactory())

import { analyzeCharacterImage, analyzeMultipleImages } from '@/lib/ai/vision-analysis'
import { getOpenAIMocks, mockChatCompletionJSON, mockChatCompletionError } from '../../helpers/openai-mock'

// Get mock functions after jest.mock is set up
const { mockCreate } = getOpenAIMocks()

// ============================================================================
// Test Data Builders
// ============================================================================

interface MockVisualFingerprint {
  age?: string
  ethnicity?: string
  hair?: string
  eyes?: string
  face_shape?: string
  body_type?: string
  height?: string
  default_clothing?: string
  distinctive_features?: string
}

interface MockVisionResponse {
  visual_fingerprint: MockVisualFingerprint
  confidence: 'high' | 'medium' | 'low'
  analysis_notes?: string
}

function createMockVisionResponse(
  overrides: Partial<MockVisionResponse> = {}
): MockVisionResponse {
  return {
    visual_fingerprint: {
      age: 'early 30s',
      ethnicity: 'White',
      hair: 'short brown wavy hair',
      eyes: 'blue eyes',
      face_shape: 'oval',
      body_type: 'athletic',
      height: 'tall',
      default_clothing: 'casual t-shirt and jeans',
      distinctive_features: 'light beard',
      ...(overrides.visual_fingerprint || {}),
    },
    confidence: overrides.confidence ?? 'high',
    analysis_notes: overrides.analysis_notes ?? 'Clear image with good lighting',
  }
}

function createMinimalVisionResponse(): MockVisionResponse {
  return {
    visual_fingerprint: {
      age: 'mid 20s',
      ethnicity: 'Asian',
    },
    confidence: 'low',
    analysis_notes: 'Partial face visible',
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('vision-analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // analyzeCharacterImage Tests
  // ==========================================================================

  describe('analyzeCharacterImage', () => {
    const testImageUrl = 'https://example.com/character.jpg'

    describe('Successful Analysis', () => {
      it('returns visual fingerprint for valid image', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.visual_fingerprint).toBeDefined()
        expect(result.visual_fingerprint.age).toBe('early 30s')
        expect(result.visual_fingerprint.ethnicity).toBe('White')
        expect(result.visual_fingerprint.hair).toBe('short brown wavy hair')
        expect(result.confidence).toBe('high')
      })

      it('extracts all visual fingerprint fields correctly', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.visual_fingerprint).toEqual({
          age: 'early 30s',
          ethnicity: 'White',
          hair: 'short brown wavy hair',
          eyes: 'blue eyes',
          face_shape: 'oval',
          body_type: 'athletic',
          height: 'tall',
          default_clothing: 'casual t-shirt and jeans',
          distinctive_features: 'light beard',
        })
      })

      it('includes analysis notes when provided', async () => {
        const mockResponse = createMockVisionResponse({
          analysis_notes: 'Image has good contrast and lighting',
        })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.analysis_notes).toBe('Image has good contrast and lighting')
      })

      it('handles high confidence responses', async () => {
        const mockResponse = createMockVisionResponse({ confidence: 'high' })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.confidence).toBe('high')
      })

      it('handles medium confidence responses', async () => {
        const mockResponse = createMockVisionResponse({ confidence: 'medium' })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.confidence).toBe('medium')
      })

      it('handles low confidence responses', async () => {
        const mockResponse = createMockVisionResponse({ confidence: 'low' })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.confidence).toBe('low')
      })

      it('handles minimal fingerprint data', async () => {
        const mockResponse = createMinimalVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeCharacterImage(testImageUrl)

        expect(result.visual_fingerprint.age).toBe('mid 20s')
        expect(result.visual_fingerprint.ethnicity).toBe('Asian')
        expect(result.visual_fingerprint.hair).toBeUndefined()
        expect(result.confidence).toBe('low')
      })
    })

    describe('API Call Configuration', () => {
      it('sends correct image URL in request', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await analyzeCharacterImage(testImageUrl)

        expect(mockCreate).toHaveBeenCalledTimes(1)
        const callArgs = mockCreate.mock.calls[0][0]
        const imageContent = callArgs.messages[0].content.find(
          (c: { type: string }) => c.type === 'image_url'
        )
        expect(imageContent.image_url.url).toBe(testImageUrl)
        expect(imageContent.image_url.detail).toBe('high')
      })

      it('requests JSON response format', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await analyzeCharacterImage(testImageUrl)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.response_format).toEqual({ type: 'json_object' })
      })

      it('uses low temperature for consistency', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await analyzeCharacterImage(testImageUrl)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.temperature).toBe(0.3)
      })

      it('includes prompt with visual fingerprint structure', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        await analyzeCharacterImage(testImageUrl)

        const callArgs = mockCreate.mock.calls[0][0]
        const textContent = callArgs.messages[0].content.find(
          (c: { type: string }) => c.type === 'text'
        )
        expect(textContent.text).toContain('visual_fingerprint')
        expect(textContent.text).toContain('ethnicity')
        expect(textContent.text).toContain('character consistency')
      })
    })

    describe('Error Handling', () => {
      it('throws error when API returns empty content', async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: null } }],
        })

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow(
          'No response from vision API'
        )
      })

      it('throws error when API returns empty choices', async () => {
        mockCreate.mockResolvedValue({
          choices: [],
        })

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow()
      })

      it('throws error for invalid JSON response', async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: 'not valid json' } }],
        })

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow(
          'Failed to analyze image'
        )
      })

      it('throws error when visual_fingerprint is missing', async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ confidence: 'high' }) } }],
        })

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow(
          'Invalid response format: missing visual_fingerprint'
        )
      })

      it('throws error with API error message', async () => {
        mockChatCompletionError(mockCreate, 'API rate limit exceeded')

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow(
          'Failed to analyze image: API rate limit exceeded'
        )
      })

      it('handles network timeout errors', async () => {
        const timeoutError = new Error('Request timeout')
        timeoutError.name = 'TimeoutError'
        mockCreate.mockRejectedValue(timeoutError)

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow(
          'Failed to analyze image: Request timeout'
        )
      })

      it('handles generic errors with unknown error message', async () => {
        mockCreate.mockRejectedValue('string error')

        await expect(analyzeCharacterImage(testImageUrl)).rejects.toThrow(
          'Failed to analyze image: Unknown error'
        )
      })
    })
  })

  // ==========================================================================
  // analyzeMultipleImages Tests
  // ==========================================================================

  describe('analyzeMultipleImages', () => {
    describe('Input Validation', () => {
      it('throws error for empty array', async () => {
        await expect(analyzeMultipleImages([])).rejects.toThrow(
          'No images provided for analysis'
        )
      })
    })

    describe('Single Image Delegation', () => {
      it('delegates single image to analyzeCharacterImage', async () => {
        const mockResponse = createMockVisionResponse()
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeMultipleImages(['https://example.com/single.jpg'])

        expect(mockCreate).toHaveBeenCalledTimes(1)
        expect(result.visual_fingerprint.age).toBe('early 30s')
        expect(result.confidence).toBe('high')
      })

      it('returns same result as single image analysis', async () => {
        const mockResponse = createMockVisionResponse({
          confidence: 'medium',
          analysis_notes: 'Single image analysis',
        })
        mockChatCompletionJSON(mockCreate, mockResponse)

        const result = await analyzeMultipleImages(['https://example.com/test.jpg'])

        // Should NOT have merged notes
        expect(result.analysis_notes).toBe('Single image analysis')
        expect(result.confidence).toBe('medium')
      })
    })

    describe('Multiple Image Analysis', () => {
      it('analyzes multiple images in parallel', async () => {
        const response1 = createMockVisionResponse({ confidence: 'high' })
        const response2 = createMockVisionResponse({ confidence: 'medium' })

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response1) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response2) } }],
          })

        await analyzeMultipleImages([
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ])

        expect(mockCreate).toHaveBeenCalledTimes(2)
      })

      it('merges results from multiple images', async () => {
        const response1 = createMockVisionResponse({
          visual_fingerprint: {
            age: 'early 30s',
            ethnicity: 'White',
            hair: 'brown hair',
          },
          confidence: 'high',
        })
        const response2 = createMockVisionResponse({
          visual_fingerprint: {
            age: 'late 20s',
            ethnicity: 'White',
            eyes: 'blue eyes',
          },
          confidence: 'medium',
        })

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response1) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response2) } }],
          })

        const result = await analyzeMultipleImages([
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ])

        // Should have merged notes
        expect(result.analysis_notes).toBe('Merged from multiple images')
        expect(result.confidence).toBe('medium')
      })

      it('prioritizes high confidence data in merge', async () => {
        // High confidence result with age and ethnicity
        const highConfidence: MockVisionResponse = {
          visual_fingerprint: {
            age: 'early 30s',
            ethnicity: 'Black',
          },
          confidence: 'high',
        }

        // Low confidence result with different age but more fields
        const lowConfidence: MockVisionResponse = {
          visual_fingerprint: {
            age: 'late 40s', // Should be ignored (high confidence has age)
            ethnicity: 'White', // Should be ignored (high confidence has ethnicity)
            hair: 'curly black hair', // Should be used
            eyes: 'dark brown eyes', // Should be used
          },
          confidence: 'low',
        }

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(lowConfidence) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(highConfidence) } }],
          })

        const result = await analyzeMultipleImages([
          'https://example.com/low.jpg',
          'https://example.com/high.jpg',
        ])

        // High confidence values should take priority
        expect(result.visual_fingerprint.age).toBe('early 30s')
        expect(result.visual_fingerprint.ethnicity).toBe('Black')
        // Low confidence fills in missing fields
        expect(result.visual_fingerprint.hair).toBe('curly black hair')
        expect(result.visual_fingerprint.eyes).toBe('dark brown eyes')
      })

      it('uses medium confidence over low confidence', async () => {
        const mediumConfidence: MockVisionResponse = {
          visual_fingerprint: {
            age: 'mid 30s',
            hair: 'blonde hair',
          },
          confidence: 'medium',
        }

        const lowConfidence: MockVisionResponse = {
          visual_fingerprint: {
            age: 'early 20s', // Should be ignored
            hair: 'red hair', // Should be ignored
            eyes: 'green eyes', // Should be used (not in medium)
          },
          confidence: 'low',
        }

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(lowConfidence) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(mediumConfidence) } }],
          })

        const result = await analyzeMultipleImages([
          'https://example.com/low.jpg',
          'https://example.com/medium.jpg',
        ])

        expect(result.visual_fingerprint.age).toBe('mid 30s')
        expect(result.visual_fingerprint.hair).toBe('blonde hair')
        expect(result.visual_fingerprint.eyes).toBe('green eyes')
      })

      it('merges all fingerprint fields correctly', async () => {
        const response1: MockVisionResponse = {
          visual_fingerprint: {
            age: 'early 30s',
            ethnicity: 'Hispanic',
            hair: 'dark curly hair',
            body_type: 'athletic',
          },
          confidence: 'high',
        }

        const response2: MockVisionResponse = {
          visual_fingerprint: {
            eyes: 'brown eyes',
            face_shape: 'oval',
            height: 'average height',
            default_clothing: 'business casual',
            distinctive_features: 'small scar on chin',
          },
          confidence: 'high',
        }

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response1) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response2) } }],
          })

        const result = await analyzeMultipleImages([
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ])

        // All fields should be present from merged sources
        expect(result.visual_fingerprint.age).toBe('early 30s')
        expect(result.visual_fingerprint.ethnicity).toBe('Hispanic')
        expect(result.visual_fingerprint.hair).toBe('dark curly hair')
        expect(result.visual_fingerprint.body_type).toBe('athletic')
        expect(result.visual_fingerprint.eyes).toBe('brown eyes')
        expect(result.visual_fingerprint.face_shape).toBe('oval')
        expect(result.visual_fingerprint.height).toBe('average height')
        expect(result.visual_fingerprint.default_clothing).toBe('business casual')
        expect(result.visual_fingerprint.distinctive_features).toBe('small scar on chin')
      })

      it('handles three images correctly', async () => {
        // Use minimal responses to avoid default values interfering
        const responses: MockVisionResponse[] = [
          {
            visual_fingerprint: { age: 'early 30s', ethnicity: 'White' },
            confidence: 'low',
          },
          {
            visual_fingerprint: { age: 'mid 30s', hair: 'brown', body_type: 'slim' },
            confidence: 'medium',
          },
          {
            visual_fingerprint: { hair: 'dark brown', eyes: 'blue' },
            confidence: 'high',
          },
        ]

        responses.forEach((response) => {
          mockCreate.mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response) } }],
          })
        })

        const result = await analyzeMultipleImages([
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
        ])

        expect(mockCreate).toHaveBeenCalledTimes(3)
        // High confidence values should win (hair, eyes)
        expect(result.visual_fingerprint.hair).toBe('dark brown')
        expect(result.visual_fingerprint.eyes).toBe('blue')
        // Medium confidence age (high confidence has no age)
        expect(result.visual_fingerprint.age).toBe('mid 30s')
        // Medium confidence body_type (high confidence has no body_type)
        expect(result.visual_fingerprint.body_type).toBe('slim')
        // Low confidence ethnicity (only low has it)
        expect(result.visual_fingerprint.ethnicity).toBe('White')
      })
    })

    describe('Error Handling', () => {
      it('propagates error when all images fail', async () => {
        mockChatCompletionError(mockCreate, 'Vision API unavailable')

        await expect(
          analyzeMultipleImages([
            'https://example.com/1.jpg',
            'https://example.com/2.jpg',
          ])
        ).rejects.toThrow('Failed to analyze image')
      })

      it('propagates error when first image fails', async () => {
        mockChatCompletionError(mockCreate, 'Invalid image format')

        await expect(
          analyzeMultipleImages(['https://example.com/invalid.jpg'])
        ).rejects.toThrow('Failed to analyze image')
      })
    })

    describe('Result Structure', () => {
      it('returns medium confidence for merged results', async () => {
        const response1 = createMockVisionResponse({ confidence: 'high' })
        const response2 = createMockVisionResponse({ confidence: 'low' })

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response1) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response2) } }],
          })

        const result = await analyzeMultipleImages([
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
        ])

        // Merged results always have medium confidence
        expect(result.confidence).toBe('medium')
      })

      it('sets merged analysis notes', async () => {
        const response1 = createMockVisionResponse({
          analysis_notes: 'Good lighting',
        })
        const response2 = createMockVisionResponse({
          analysis_notes: 'Side profile',
        })

        mockCreate
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response1) } }],
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(response2) } }],
          })

        const result = await analyzeMultipleImages([
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
        ])

        expect(result.analysis_notes).toBe('Merged from multiple images')
      })
    })
  })
})
