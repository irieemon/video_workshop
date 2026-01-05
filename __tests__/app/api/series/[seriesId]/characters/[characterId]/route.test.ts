import { createClient } from '@/lib/supabase/server'
import { GET, PATCH, DELETE } from '@/app/api/series/[seriesId]/characters/[characterId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series/[seriesId]/characters/[characterId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'
  const characterId = '550e8400-e29b-41d4-a716-446655440001'
  const mockParams = Promise.resolve({ seriesId, characterId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/characters/[characterId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`
      )
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
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`
      )
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when character not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_characters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'Not found' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`
      )
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns character when found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockCharacter = {
        id: characterId,
        name: 'Hero',
        description: 'The main protagonist',
        role: 'protagonist',
        appearance_details: { hair: 'brown', eyes: 'blue' },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_characters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockCharacter,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`
      )
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Hero')
      expect(data.role).toBe('protagonist')
    })
  })

  describe('PATCH /api/series/[seriesId]/characters/[characterId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        {
          method: 'PATCH',
          body: { name: 'Updated Hero' },
        }
      )
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 400 for invalid role', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

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

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        {
          method: 'PATCH',
          body: { role: 'invalid_role' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid role')
    })

    it('returns 400 for empty name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

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

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        {
          method: 'PATCH',
          body: { name: '' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('name cannot be empty')
    })

    it('returns 400 for empty description', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

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

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        {
          method: 'PATCH',
          body: { description: '   ' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('description cannot be empty')
    })

    it('updates character successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const updatedCharacter = {
        id: characterId,
        name: 'Updated Hero',
        description: 'The main protagonist with new powers',
        role: 'protagonist',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_characters') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedCharacter,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        {
          method: 'PATCH',
          body: { name: 'Updated Hero', description: 'The main protagonist with new powers' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Hero')
    })

    it('updates appearance_details', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const updatedCharacter = {
        id: characterId,
        appearance_details: { hair: 'blonde', eyes: 'green', height: 'tall' },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_characters') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedCharacter,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        {
          method: 'PATCH',
          body: { appearance_details: { hair: 'blonde', eyes: 'green', height: 'tall' } },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appearance_details.hair).toBe('blonde')
    })
  })

  describe('DELETE /api/series/[seriesId]/characters/[characterId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

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
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('deletes character successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_characters') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/characters/${characterId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
