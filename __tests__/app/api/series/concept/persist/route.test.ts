jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/series-concept-persister', () => ({
  SeriesConceptPersister: jest.fn().mockImplementation(() => ({
    persistConcept: jest.fn(),
  })),
}))
jest.mock('@/lib/validation/series-concept-validator', () => ({
  validateSeriesConcept: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { SeriesConceptPersister } from '@/lib/services/series-concept-persister'
import { validateSeriesConcept } from '@/lib/validation/series-concept-validator'
import { POST } from '@/app/api/series/concept/persist/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/concept/persist', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  let mockPersistConcept: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    mockPersistConcept = jest.fn()
    ;(SeriesConceptPersister as jest.Mock).mockImplementation(() => ({
      persistConcept: mockPersistConcept,
    }))
  })

  describe('POST /api/series/concept/persist', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/persist', {
        method: 'POST',
        body: { concept: {} },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 for invalid concept structure', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(validateSeriesConcept as jest.Mock).mockReturnValue({
        success: false,
        errors: {
          format: () => ({ issues: ['Invalid concept'] }),
        },
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/persist', {
        method: 'POST',
        body: { concept: { invalid: true } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid concept structure')
    })

    it('persists concept successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const validConcept = {
        title: 'My Series',
        description: 'A great series',
        genre: 'drama',
        tone: 'serious',
        characters: [],
        settings: [],
        themes: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(validateSeriesConcept as jest.Mock).mockReturnValue({
        success: true,
        data: validConcept,
      })

      mockPersistConcept.mockResolvedValue({
        success: true,
        seriesId: 'new-series-id',
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/persist', {
        method: 'POST',
        body: { concept: validConcept },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.seriesId).toBe('new-series-id')
      expect(mockPersistConcept).toHaveBeenCalledWith(validConcept, mockUser.id)
    })

    it('returns 500 when persister fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const validConcept = {
        title: 'My Series',
        description: 'A great series',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(validateSeriesConcept as jest.Mock).mockReturnValue({
        success: true,
        data: validConcept,
      })

      mockPersistConcept.mockResolvedValue({
        success: false,
        error: 'Database error',
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/persist', {
        method: 'POST',
        body: { concept: validConcept },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })

    it('returns 500 on unexpected error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(validateSeriesConcept as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/persist', {
        method: 'POST',
        body: { concept: {} },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })
  })
})
