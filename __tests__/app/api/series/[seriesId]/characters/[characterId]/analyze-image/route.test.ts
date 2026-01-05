/**
 * Analyze Image Route Tests
 *
 * Tests for POST /api/series/[seriesId]/characters/[characterId]/analyze-image
 * This endpoint analyzes character images using OpenAI Vision API and updates
 * the character's visual fingerprint for consistent video generation.
 *
 * Test Coverage:
 * - Authentication & authorization
 * - Input validation (images required)
 * - Vision API integration
 * - Database update handling
 * - Error handling
 */

// Mock dependencies before imports
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/ai/vision-analysis', () => ({
  analyzeCharacterImage: jest.fn(),
  analyzeMultipleImages: jest.fn(),
}))

import { POST } from '@/app/api/series/[seriesId]/characters/[characterId]/analyze-image/route'
import { createClient } from '@/lib/supabase/server'
import { analyzeCharacterImage, analyzeMultipleImages } from '@/lib/ai/vision-analysis'
import { createMockRequest, createMockSupabaseClient, createConfiguredQueryBuilder } from '../../../../../../../helpers/api-route-test-helpers'

// ============================================================================
// Test Data
// ============================================================================

const TEST_USER_ID = 'user-123'
const TEST_SERIES_ID = 'series-456'
const TEST_CHARACTER_ID = 'char-789'

function createMockCharacter(overrides: Partial<{
  id: string
  name: string
  visual_reference_url: string | null
  visual_cues: any[] | null
  series: { id: string; user_id: string } | { id: string; user_id: string }[]
}> = {}) {
  return {
    id: TEST_CHARACTER_ID,
    name: 'Test Hero',
    visual_reference_url: 'https://example.com/hero.jpg',
    visual_cues: null,
    series: { id: TEST_SERIES_ID, user_id: TEST_USER_ID },
    ...overrides,
  }
}

function createMockAnalysisResult(overrides: Partial<{
  visual_fingerprint: Record<string, string>
  confidence: string
  analysis_notes: string
}> = {}) {
  return {
    visual_fingerprint: {
      age: 'early 30s',
      ethnicity: 'White',
      hair: 'short brown hair',
      eyes: 'blue eyes',
      face_shape: 'angular',
      body_type: 'athletic',
      height: 'tall',
      default_clothing: 'casual jacket',
      distinctive_features: 'small scar on chin',
    },
    confidence: 'high',
    analysis_notes: 'Clear image with good lighting',
    ...overrides,
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('POST /api/series/[seriesId]/characters/[characterId]/analyze-image', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = createMockSupabaseClient({ user: { id: TEST_USER_ID, email: 'test@example.com' } })
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================
  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 401 when auth returns error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      })

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(401)
    })
  })

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================
  describe('Authorization', () => {
    it('returns 403 when user does not own the series', async () => {
      const characterWithDifferentOwner = createMockCharacter({
        series: { id: TEST_SERIES_ID, user_id: 'other-user-id' },
      })

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValue({
        data: characterWithDifferentOwner,
        error: null,
      })
      mockSupabase.from.mockReturnValue(queryBuilder)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Forbidden')
    })

    it('returns 404 when character does not exist', async () => {
      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
      mockSupabase.from.mockReturnValue(queryBuilder)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Character not found')
    })

    it('handles series as array (edge case from join)', async () => {
      const characterWithSeriesArray = createMockCharacter({
        series: [{ id: TEST_SERIES_ID, user_id: TEST_USER_ID }],
      })

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: characterWithSeriesArray, error: null })
        .mockResolvedValueOnce({ data: { ...characterWithSeriesArray, visual_fingerprint: {} }, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(createMockAnalysisResult())

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================
  describe('Input Validation', () => {
    it('returns 400 when character has no images', async () => {
      const characterWithNoImages = createMockCharacter({
        visual_reference_url: null,
        visual_cues: null,
      })

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValue({
        data: characterWithNoImages,
        error: null,
      })
      mockSupabase.from.mockReturnValue(queryBuilder)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('No images found')
    })

    it('returns 400 when visual_cues is empty array', async () => {
      const characterWithEmptyVisualCues = createMockCharacter({
        visual_reference_url: null,
        visual_cues: [],
      })

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValue({
        data: characterWithEmptyVisualCues,
        error: null,
      })
      mockSupabase.from.mockReturnValue(queryBuilder)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(400)
    })
  })

  // ==========================================================================
  // Vision API Integration Tests
  // ==========================================================================
  describe('Vision API Integration', () => {
    it('calls analyzeCharacterImage for single image', async () => {
      const character = createMockCharacter({
        visual_reference_url: 'https://example.com/hero.jpg',
        visual_cues: null,
      })
      const analysisResult = createMockAnalysisResult()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: { ...character, visual_fingerprint: analysisResult.visual_fingerprint }, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(200)
      expect(analyzeCharacterImage).toHaveBeenCalledWith('https://example.com/hero.jpg')
      expect(analyzeMultipleImages).not.toHaveBeenCalled()
    })

    it('calls analyzeMultipleImages for multiple images', async () => {
      const character = createMockCharacter({
        visual_reference_url: 'https://example.com/hero.jpg',
        visual_cues: [
          { url: 'https://example.com/hero-side.jpg' },
          { url: 'https://example.com/hero-action.jpg' },
        ],
      })
      const analysisResult = createMockAnalysisResult()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: { ...character, visual_fingerprint: analysisResult.visual_fingerprint }, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeMultipleImages as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(200)
      expect(analyzeMultipleImages).toHaveBeenCalledWith([
        'https://example.com/hero.jpg',
        'https://example.com/hero-side.jpg',
        'https://example.com/hero-action.jpg',
      ])
      expect(analyzeCharacterImage).not.toHaveBeenCalled()
    })

    it('handles visual_cues only (no primary reference)', async () => {
      const character = createMockCharacter({
        visual_reference_url: null,
        visual_cues: [{ url: 'https://example.com/cue1.jpg' }],
      })
      const analysisResult = createMockAnalysisResult()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: { ...character, visual_fingerprint: analysisResult.visual_fingerprint }, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(200)
      expect(analyzeCharacterImage).toHaveBeenCalledWith('https://example.com/cue1.jpg')
    })

    it('skips visual_cues without URL', async () => {
      const character = createMockCharacter({
        visual_reference_url: 'https://example.com/hero.jpg',
        visual_cues: [
          { description: 'No URL here' },
          { url: 'https://example.com/valid.jpg' },
        ],
      })
      const analysisResult = createMockAnalysisResult()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: { ...character, visual_fingerprint: analysisResult.visual_fingerprint }, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeMultipleImages as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(analyzeMultipleImages).toHaveBeenCalledWith([
        'https://example.com/hero.jpg',
        'https://example.com/valid.jpg',
      ])
    })
  })

  // ==========================================================================
  // Database Update Tests
  // ==========================================================================
  describe('Database Updates', () => {
    it('updates character with visual fingerprint', async () => {
      const character = createMockCharacter()
      const analysisResult = createMockAnalysisResult()
      const updatedCharacter = { ...character, visual_fingerprint: analysisResult.visual_fingerprint }

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: updatedCharacter, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(200)
      // Verify update was called (second call to from)
      expect(mockSupabase.from).toHaveBeenCalledWith('series_characters')
    })

    it('returns 500 on database update error', async () => {
      const character = createMockCharacter()
      const analysisResult = createMockAnalysisResult()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(500)
    })
  })

  // ==========================================================================
  // Response Structure Tests
  // ==========================================================================
  describe('Response Structure', () => {
    it('returns success response with all fields', async () => {
      const character = createMockCharacter()
      const analysisResult = createMockAnalysisResult({
        confidence: 'high',
        analysis_notes: 'Clear image, good lighting',
      })
      const updatedCharacter = { ...character, visual_fingerprint: analysisResult.visual_fingerprint }

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: updatedCharacter, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.character).toBeDefined()
      expect(data.analysis).toBeDefined()
      expect(data.analysis.confidence).toBe('high')
      expect(data.analysis.notes).toBe('Clear image, good lighting')
      expect(data.analysis.images_analyzed).toBe(1)
    })

    it('returns correct images_analyzed count for multiple images', async () => {
      const character = createMockCharacter({
        visual_reference_url: 'https://example.com/hero.jpg',
        visual_cues: [
          { url: 'https://example.com/cue1.jpg' },
          { url: 'https://example.com/cue2.jpg' },
        ],
      })
      const analysisResult = createMockAnalysisResult()
      const updatedCharacter = { ...character, visual_fingerprint: analysisResult.visual_fingerprint }

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single
        .mockResolvedValueOnce({ data: character, error: null })
        .mockResolvedValueOnce({ data: updatedCharacter, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeMultipleImages as jest.Mock).mockResolvedValue(analysisResult)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      const data = await response.json()
      expect(data.analysis.images_analyzed).toBe(3)
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================
  describe('Error Handling', () => {
    it('returns 500 on vision API error', async () => {
      const character = createMockCharacter()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValueOnce({ data: character, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      ;(analyzeCharacterImage as jest.Mock).mockRejectedValue(new Error('Vision API unavailable'))

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Vision API unavailable')
    })

    it('handles generic errors with fallback message', async () => {
      const character = createMockCharacter()

      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValueOnce({ data: character, error: null })
      mockSupabase.from.mockReturnValue(queryBuilder)

      // Throw non-Error object
      ;(analyzeCharacterImage as jest.Mock).mockRejectedValue('string error')

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to analyze image')
    })

    it('returns 500 on character fetch database error', async () => {
      const queryBuilder = createConfiguredQueryBuilder({})
      queryBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN', message: 'Connection failed' },
      })
      mockSupabase.from.mockReturnValue(queryBuilder)

      const request = createMockRequest(`/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/analyze-image`, {
        method: 'POST',
      })

      const response = await POST(request, {
        params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
      })

      expect(response.status).toBe(500)
    })
  })
})
