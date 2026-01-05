import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/series/[seriesId]/characters/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series/[seriesId]/characters', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'

  // Next.js 15 uses Promise<params> pattern
  const createParams = (id: string) => Promise.resolve({ seriesId: id })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/characters', () => {
    it('returns characters for a series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacters = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          series_id: seriesId,
          name: 'Hero',
          description: 'The main protagonist',
          role: 'protagonist',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          series_id: seriesId,
          name: 'Sidekick',
          description: 'The loyal companion',
          role: 'supporting',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
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
                order: jest.fn().mockResolvedValue({
                  data: mockCharacters,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`)

      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Hero')
      expect(data[0].role).toBe('protagonist')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`)

      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

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
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`)

      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('POST /api/series/[seriesId]/characters', () => {
    it('creates a character successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacter = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: seriesId,
        name: 'New Hero',
        description: 'A new character',
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,  // No duplicate
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCharacter,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'New Hero',
          description: 'A new character',
          role: 'protagonist',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Hero')
      expect(data.role).toBe('protagonist')
    })

    it('creates a character with optional fields', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacter = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: seriesId,
        name: 'Detailed Character',
        description: 'A character with all details',
        role: 'supporting',
        appearance_details: { hair: 'blonde', eyes: 'blue' },
        performance_style: 'Method acting',
        voice_profile: { tone: 'deep' },
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
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCharacter,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'Detailed Character',
          description: 'A character with all details',
          role: 'supporting',
          appearance_details: { hair: 'blonde', eyes: 'blue' },
          performance_style: 'Method acting',
          voice_profile: { tone: 'deep' },
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.appearance_details).toEqual({ hair: 'blonde', eyes: 'blue' })
    })

    it('returns 400 for missing name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

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
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          description: 'A character without a name',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('name is required')
    })

    it('returns 400 for missing description', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

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
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'Character Without Description',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('description is required')
    })

    it('returns 400 for invalid role', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

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
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'Character',
          description: 'A character',
          role: 'invalid_role',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid role')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'New Character',
          description: 'A character',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

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
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'New Character',
          description: 'A character',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 409 for duplicate character name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const existingCharacter = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'Existing Hero',
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
                    data: existingCharacter,  // Duplicate found
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/characters`, {
        method: 'POST',
        body: {
          name: 'Existing Hero',
          description: 'A character with duplicate name',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })
  })
})
