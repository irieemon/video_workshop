jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/series/[seriesId]/context/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/[seriesId]/context', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440001'
  const mockParams = Promise.resolve({ seriesId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/context', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/context`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/context`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns series context with characters, settings, and visual assets', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        user_id: mockUser.id,
        description: 'A test series',
        genre: 'narrative',
        sora_camera_style: 'Cinematic',
        sora_lighting_mood: 'Dramatic',
        characters: [
          { id: 'char-1', name: 'Alice', description: 'Protagonist', role: 'lead' },
          { id: 'char-2', name: 'Bob', description: 'Antagonist', role: 'antagonist' },
        ],
        settings: [
          { id: 'set-1', name: 'City Hall', description: 'Government building' },
        ],
        visual_assets: [
          { id: 'asset-1', name: 'Logo', storage_path: 'series/logo.png' },
        ],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSeries,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/context`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(seriesId)
      expect(data.name).toBe('Test Series')
      expect(data.characters).toHaveLength(2)
      expect(data.settings).toHaveLength(1)
      expect(data.visual_assets).toHaveLength(1)
    })

    it('returns 403 when series exists but returns null data', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Series query returns no error but null data
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/context`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/context`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
