jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, PATCH } from '@/app/api/series/[seriesId]/visual-style/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/[seriesId]/visual-style', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440001'
  const mockParams = Promise.resolve({ seriesId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/visual-style', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`)
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when visual style not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: series check
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: seriesId, user_id: 'test-user-id' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Second call: visual style not found
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns visual style for authorized user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVisualStyle = {
        id: 'vs-123',
        series_id: seriesId,
        cinematography: { camera_movement: 'smooth pans', shot_types: ['wide', 'close-up'] },
        lighting: { style: 'natural', mood: 'warm' },
        color_palette: { primary: '#FF5733', secondary: '#3498DB' },
        composition_rules: ['rule of thirds', 'leading lines'],
        audio_style: { background: 'ambient', voice: 'narrator' },
        default_platform: 'youtube-shorts',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: seriesId, user_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVisualStyle,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.series_id).toBe(seriesId)
      expect(data.cinematography).toEqual(mockVisualStyle.cinematography)
      expect(data.lighting).toEqual(mockVisualStyle.lighting)
      expect(data.default_platform).toBe('youtube-shorts')
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/series/[seriesId]/visual-style', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`, {
        method: 'PATCH',
        body: { lighting: { style: 'cinematic' } },
      })
      const response = await PATCH(request, { params: mockParams })

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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`, {
        method: 'PATCH',
        body: { lighting: { style: 'cinematic' } },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 for invalid default_platform', async () => {
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
                data: { id: seriesId, user_id: mockUser.id },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`, {
        method: 'PATCH',
        body: { default_platform: 'invalid-platform' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid default_platform')
    })

    it('updates visual style successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const updatedVisualStyle = {
        id: 'vs-123',
        series_id: seriesId,
        lighting: { style: 'cinematic', mood: 'dramatic' },
        default_platform: 'tiktok',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: series ownership check
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: seriesId, user_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Second call: update visual style
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedVisualStyle,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`, {
        method: 'PATCH',
        body: { lighting: { style: 'cinematic', mood: 'dramatic' }, default_platform: 'tiktok' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.lighting.style).toBe('cinematic')
      expect(data.default_platform).toBe('tiktok')
    })

    it('validates valid platform options', async () => {
      const mockUser = { id: 'test-user-id' }
      const validPlatforms = ['tiktok', 'instagram', 'youtube-shorts', 'both']

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      for (const platform of validPlatforms) {
        let callCount = 0
        mockSupabaseClient.from.mockImplementation(() => {
          callCount++

          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { id: seriesId, user_id: mockUser.id },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }

          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { default_platform: platform },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        })

        const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`, {
          method: 'PATCH',
          body: { default_platform: platform },
        })
        const response = await PATCH(request, { params: mockParams })

        expect(response.status).toBe(200)
      }
    })

    it('returns 500 on update error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: seriesId, user_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(() => {
                  throw new Error('Update failed')
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/visual-style`, {
        method: 'PATCH',
        body: { lighting: { style: 'cinematic' } },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
