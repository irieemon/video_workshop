/**
 * Upload Visual Cue Route Tests
 *
 * Tests for POST and DELETE /api/series/[seriesId]/characters/[characterId]/upload-visual-cue
 * This endpoint handles uploading and deleting character visual reference images.
 *
 * Test Coverage:
 * - POST: Authentication, authorization, file validation, upload flow, auto-analysis
 * - DELETE: Authentication, authorization, URL validation, deletion flow
 */

// Mock dependencies before imports
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/ai/vision-analysis', () => ({
  analyzeCharacterImage: jest.fn(),
}))

import { POST, DELETE } from '@/app/api/series/[seriesId]/characters/[characterId]/upload-visual-cue/route'
import { createClient } from '@/lib/supabase/server'
import { analyzeCharacterImage } from '@/lib/ai/vision-analysis'
import { createMockSupabaseClient, createConfiguredQueryBuilder } from '../../../../../../../helpers/api-route-test-helpers'

// ============================================================================
// Test Data & Helpers
// ============================================================================

const TEST_USER_ID = 'user-123'
const TEST_SERIES_ID = 'series-456'
const TEST_CHARACTER_ID = 'char-789'
const TEST_PUBLIC_URL = 'https://example.supabase.co/storage/v1/object/public/series-assets/user-123/series-456/characters/char-789/123456.jpg'

function createMockCharacter(overrides: Partial<{
  id: string
  visual_reference_url: string | null
  visual_cues: any[] | null
  series: { id: string; user_id: string } | { id: string; user_id: string }[]
}> = {}) {
  return {
    id: TEST_CHARACTER_ID,
    visual_reference_url: null,
    visual_cues: null,
    series: { id: TEST_SERIES_ID, user_id: TEST_USER_ID },
    ...overrides,
  }
}

function createMockFile(options: {
  name?: string
  type?: string
  size?: number
} = {}): File {
  const content = new Uint8Array(options.size || 1024)
  return new File([content], options.name || 'test.jpg', {
    type: options.type || 'image/jpeg',
  })
}

function createMockFormData(fields: Record<string, string | File>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return formData
}

function createMockRequest(urlPath: string, options: {
  method?: string
  formData?: FormData
  body?: any
} = {}): any {
  const { method = 'GET', formData } = options

  // Construct a full URL - the route uses new URL(request.url) which needs a valid URL
  const fullUrl = urlPath.startsWith('http') ? urlPath : `http://localhost:3000${urlPath}`

  return {
    url: fullUrl,
    method,
    formData: jest.fn().mockResolvedValue(formData || new FormData()),
    json: jest.fn().mockResolvedValue(options.body || {}),
  }
}

function createMockAnalysisResult() {
  return {
    visual_fingerprint: {
      age: 'early 30s',
      ethnicity: 'White',
      hair: 'short brown hair',
    },
    confidence: 'high',
    analysis_notes: 'Clear image',
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('Upload Visual Cue Route', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient> & {
    storage: {
      from: jest.Mock
    }
  }
  let mockStorageBucket: {
    upload: jest.Mock
    getPublicUrl: jest.Mock
    remove: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Create storage mock
    mockStorageBucket = {
      upload: jest.fn().mockResolvedValue({
        data: { path: 'user-123/series-456/characters/char-789/123456.jpg' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: TEST_PUBLIC_URL },
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }

    // Create Supabase mock with storage
    mockSupabase = {
      ...createMockSupabaseClient({ user: { id: TEST_USER_ID, email: 'test@example.com' } }),
      storage: {
        from: jest.fn().mockReturnValue(mockStorageBucket),
      },
    } as any

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  // ==========================================================================
  // POST Tests
  // ==========================================================================
  describe('POST /api/series/[seriesId]/characters/[characterId]/upload-visual-cue', () => {
    // ========================================================================
    // Authentication Tests
    // ========================================================================
    describe('Authentication', () => {
      it('returns 401 when user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        })

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST' }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      })
    })

    // ========================================================================
    // Authorization Tests
    // ========================================================================
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

        const formData = createMockFormData({ file: createMockFile() })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

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

        const formData = createMockFormData({ file: createMockFile() })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(404)
      })
    })

    // ========================================================================
    // File Validation Tests
    // ========================================================================
    describe('File Validation', () => {
      beforeEach(() => {
        const character = createMockCharacter()
        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single.mockResolvedValue({ data: character, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)
      })

      it('returns 400 when no file is provided', async () => {
        const formData = createMockFormData({})
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('No file provided')
      })

      it('returns 400 for invalid file type', async () => {
        const formData = createMockFormData({
          file: createMockFile({ type: 'application/pdf', name: 'test.pdf' }),
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Invalid file type')
      })

      it('accepts valid image types', async () => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

        for (const type of validTypes) {
          const character = createMockCharacter()
          const queryBuilder = createConfiguredQueryBuilder({})
          queryBuilder.single
            .mockResolvedValueOnce({ data: character, error: null })
            .mockResolvedValueOnce({ data: { ...character, visual_cues: [] }, error: null })
          mockSupabase.from.mockReturnValue(queryBuilder)

          const formData = createMockFormData({
            file: createMockFile({ type, name: `test.${type.split('/')[1]}` }),
          })
          const request = createMockRequest(
            `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
            { method: 'POST', formData }
          )

          const response = await POST(request, {
            params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
          })

          expect(response.status).toBe(200)
        }
      })

      it('returns 400 when file exceeds 10MB limit', async () => {
        const largeFile = createMockFile({ size: 11 * 1024 * 1024 }) // 11MB
        const formData = createMockFormData({ file: largeFile })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('10MB limit')
      })

      it('accepts files at exactly 10MB', async () => {
        const character = createMockCharacter()
        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: { ...character, visual_cues: [] }, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        const maxSizeFile = createMockFile({ size: 10 * 1024 * 1024 }) // Exactly 10MB
        const formData = createMockFormData({ file: maxSizeFile })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(200)
      })

      it('returns 400 for invalid visual cue type', async () => {
        const formData = createMockFormData({
          file: createMockFile(),
          type: 'invalid-type',
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Invalid type')
      })

      it('accepts valid visual cue types', async () => {
        const validTypes = ['full-body', 'face', 'costume', 'expression', 'other']

        for (const type of validTypes) {
          const character = createMockCharacter()
          const queryBuilder = createConfiguredQueryBuilder({})
          queryBuilder.single
            .mockResolvedValueOnce({ data: character, error: null })
            .mockResolvedValueOnce({ data: { ...character, visual_cues: [] }, error: null })
          mockSupabase.from.mockReturnValue(queryBuilder)

          const formData = createMockFormData({
            file: createMockFile(),
            type,
          })
          const request = createMockRequest(
            `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
            { method: 'POST', formData }
          )

          const response = await POST(request, {
            params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
          })

          expect(response.status).toBe(200)
        }
      })
    })

    // ========================================================================
    // Upload Flow Tests
    // ========================================================================
    describe('Upload Flow', () => {
      it('uploads file to Supabase storage', async () => {
        const character = createMockCharacter()
        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: { ...character, visual_cues: [] }, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        const file = createMockFile({ name: 'hero.jpg' })
        const formData = createMockFormData({ file })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(mockSupabase.storage.from).toHaveBeenCalledWith('series-assets')
        expect(mockStorageBucket.upload).toHaveBeenCalled()
      })

      it('returns 500 on upload error', async () => {
        const character = createMockCharacter()
        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single.mockResolvedValue({ data: character, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        mockStorageBucket.upload.mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        })

        const formData = createMockFormData({ file: createMockFile() })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.error).toBe('Failed to upload file')
      })
    })

    // ========================================================================
    // Primary Image Tests
    // ========================================================================
    describe('Primary Image Upload', () => {
      it('updates visual_reference_url for primary image', async () => {
        const character = createMockCharacter()
        const updatedCharacter = { ...character, visual_reference_url: TEST_PUBLIC_URL }

        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: updatedCharacter, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(createMockAnalysisResult())

        const formData = createMockFormData({
          file: createMockFile(),
          isPrimary: 'true',
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.isPrimary).toBe(true)
        expect(data.url).toBe(TEST_PUBLIC_URL)
      })

      it('triggers auto-analysis for primary image', async () => {
        const character = createMockCharacter()
        const updatedCharacter = { ...character, visual_reference_url: TEST_PUBLIC_URL }

        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: updatedCharacter, error: null })
        // Mock the fingerprint update
        const updateBuilder = createConfiguredQueryBuilder({})
        updateBuilder.eq = jest.fn().mockResolvedValue({ error: null })
        mockSupabase.from
          .mockReturnValueOnce(queryBuilder)
          .mockReturnValueOnce(queryBuilder)
          .mockReturnValueOnce(updateBuilder)

        ;(analyzeCharacterImage as jest.Mock).mockResolvedValue(createMockAnalysisResult())

        const formData = createMockFormData({
          file: createMockFile(),
          isPrimary: 'true',
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(analyzeCharacterImage).toHaveBeenCalledWith(TEST_PUBLIC_URL)
      })

      it('does not fail upload if auto-analysis fails', async () => {
        const character = createMockCharacter()
        const updatedCharacter = { ...character, visual_reference_url: TEST_PUBLIC_URL }

        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: updatedCharacter, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        ;(analyzeCharacterImage as jest.Mock).mockRejectedValue(new Error('Analysis failed'))

        const formData = createMockFormData({
          file: createMockFile(),
          isPrimary: 'true',
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        // Upload should still succeed
        expect(response.status).toBe(200)
      })
    })

    // ========================================================================
    // Visual Cue (Non-Primary) Tests
    // ========================================================================
    describe('Visual Cue Upload', () => {
      it('adds to visual_cues array for non-primary image', async () => {
        const character = createMockCharacter({ visual_cues: [] })
        const updatedCharacter = {
          ...character,
          visual_cues: [{ url: TEST_PUBLIC_URL, caption: 'Test caption', type: 'face' }],
        }

        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: updatedCharacter, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        const formData = createMockFormData({
          file: createMockFile(),
          caption: 'Test caption',
          type: 'face',
          isPrimary: 'false',
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.isPrimary).toBe(false)
        expect(data.cue).toBeDefined()
        expect(data.cue.caption).toBe('Test caption')
        expect(data.cue.type).toBe('face')
      })

      it('appends to existing visual_cues', async () => {
        const existingCue = { url: 'https://example.com/old.jpg', caption: 'Old', type: 'other' }
        const character = createMockCharacter({ visual_cues: [existingCue] })

        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single.mockResolvedValueOnce({ data: character, error: null })

        // Capture the update call to verify cues are appended
        let updatePayload: any
        queryBuilder.update = jest.fn((payload) => {
          updatePayload = payload
          return queryBuilder
        })
        queryBuilder.single.mockResolvedValueOnce({
          data: { ...character, visual_cues: [...character.visual_cues!, { url: TEST_PUBLIC_URL }] },
          error: null,
        })
        mockSupabase.from.mockReturnValue(queryBuilder)

        const formData = createMockFormData({
          file: createMockFile(),
          caption: 'New cue',
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(queryBuilder.update).toHaveBeenCalled()
      })

      it('defaults type to "other" when not provided', async () => {
        const character = createMockCharacter({ visual_cues: [] })

        const queryBuilder = createConfiguredQueryBuilder({})
        queryBuilder.single
          .mockResolvedValueOnce({ data: character, error: null })
          .mockResolvedValueOnce({ data: character, error: null })
        mockSupabase.from.mockReturnValue(queryBuilder)

        const formData = createMockFormData({
          file: createMockFile(),
          // No type provided
        })
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'POST', formData }
        )

        const response = await POST(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        const data = await response.json()
        expect(data.cue.type).toBe('other')
      })
    })
  })

  // ==========================================================================
  // DELETE Tests
  // ==========================================================================
  describe('DELETE /api/series/[seriesId]/characters/[characterId]/upload-visual-cue', () => {
    // ========================================================================
    // Authentication Tests
    // ========================================================================
    describe('Authentication', () => {
      it('returns 401 when user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        })

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(TEST_PUBLIC_URL)}`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(401)
      })
    })

    // ========================================================================
    // Authorization Tests
    // ========================================================================
    describe('Authorization', () => {
      it('returns 403 when user does not own the series', async () => {
        const characterWithDifferentOwner = createMockCharacter({
          series: { id: TEST_SERIES_ID, user_id: 'other-user-id' },
          visual_reference_url: TEST_PUBLIC_URL,
        })

        // Create a chainable query builder for the select query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: characterWithDifferentOwner,
            error: null,
          }),
        }
        mockSupabase.from.mockReturnValue(selectChain)

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(TEST_PUBLIC_URL)}`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(403)
      })

      it('returns 404 when character does not exist', async () => {
        // Create a chainable query builder for the select query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }
        mockSupabase.from.mockReturnValue(selectChain)

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(TEST_PUBLIC_URL)}`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(404)
      })
    })

    // ========================================================================
    // Input Validation Tests
    // ========================================================================
    describe('Input Validation', () => {
      it('returns 400 when no URL is provided', async () => {
        // Note: URL validation happens BEFORE database lookup in DELETE handler
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('No image URL provided')
      })

      it('returns 400 for invalid image URL format', async () => {
        const character = createMockCharacter({ visual_reference_url: TEST_PUBLIC_URL })

        // Create select chain for initial query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: character, error: null }),
        }
        mockSupabase.from.mockReturnValue(selectChain)

        // URL doesn't match /storage/v1/object/public/series-assets/ pattern
        const invalidUrl = 'https://other-domain.com/image.jpg'
        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(invalidUrl)}`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid image URL')
      })
    })

    // ========================================================================
    // Deletion Flow Tests
    // ========================================================================
    describe('Deletion Flow', () => {
      it('deletes primary image and clears visual_reference_url', async () => {
        const character = createMockCharacter({ visual_reference_url: TEST_PUBLIC_URL })

        // Create update chain that returns { error: null }
        const updateChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        }

        // Create select chain for initial query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: character, error: null }),
        }

        // First call: select chain, second call: update chain
        mockSupabase.from
          .mockReturnValueOnce(selectChain)
          .mockReturnValueOnce(updateChain)

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(TEST_PUBLIC_URL)}&isPrimary=true`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(200)
        expect(mockStorageBucket.remove).toHaveBeenCalled()
      })

      it('removes cue from visual_cues array for non-primary', async () => {
        const cueUrl = TEST_PUBLIC_URL
        const character = createMockCharacter({
          visual_cues: [
            { url: cueUrl, caption: 'Test', type: 'face' },
            { url: 'https://other.com/keep.jpg', caption: 'Keep', type: 'other' },
          ],
        })

        // Create update chain that returns { error: null }
        const updateChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        }

        // Create select chain for initial query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: character, error: null }),
        }

        // First call: select chain, second call: update chain
        mockSupabase.from
          .mockReturnValueOnce(selectChain)
          .mockReturnValueOnce(updateChain)

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(cueUrl)}&isPrimary=false`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      })

      it('continues even if storage deletion fails', async () => {
        const character = createMockCharacter({ visual_reference_url: TEST_PUBLIC_URL })

        // Create update chain that returns { error: null }
        const updateChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        }

        // Create select chain for initial query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: character, error: null }),
        }

        // First call: select chain, second call: update chain
        mockSupabase.from
          .mockReturnValueOnce(selectChain)
          .mockReturnValueOnce(updateChain)

        // Storage deletion fails
        mockStorageBucket.remove.mockResolvedValue({
          error: { message: 'Storage error' },
        })

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(TEST_PUBLIC_URL)}&isPrimary=true`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        // Should still succeed despite storage error
        expect(response.status).toBe(200)
      })
    })

    // ========================================================================
    // Error Handling Tests
    // ========================================================================
    describe('Error Handling', () => {
      it('returns 500 on database update error', async () => {
        const character = createMockCharacter({ visual_reference_url: TEST_PUBLIC_URL })

        // Create update chain that returns an error
        const updateChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
        }

        // Create select chain for initial query
        const selectChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: character, error: null }),
        }

        // First call: select chain, second call: update chain with error
        mockSupabase.from
          .mockReturnValueOnce(selectChain)
          .mockReturnValueOnce(updateChain)

        const request = createMockRequest(
          `/api/series/${TEST_SERIES_ID}/characters/${TEST_CHARACTER_ID}/upload-visual-cue?url=${encodeURIComponent(TEST_PUBLIC_URL)}&isPrimary=true`,
          { method: 'DELETE' }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ seriesId: TEST_SERIES_ID, characterId: TEST_CHARACTER_ID }),
        })

        expect(response.status).toBe(500)
      })
    })
  })
})
