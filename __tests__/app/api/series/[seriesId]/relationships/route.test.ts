import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/series/[seriesId]/relationships/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series/[seriesId]/relationships', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'
  const characterAId = '550e8400-e29b-41d4-a716-446655440001'
  const characterBId = '550e8400-e29b-41d4-a716-446655440002'

  // Next.js 15 uses Promise<params> pattern
  const createParams = (id: string) => Promise.resolve({ seriesId: id })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/relationships', () => {
    it('returns relationships with character details', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockRelationships = [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          series_id: seriesId,
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
          character_a: { id: characterAId, name: 'Hero' },
          character_b: { id: characterBId, name: 'Sidekick' },
        },
      ]

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
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: mockRelationships,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].relationship_type).toBe('friends')
      expect(data[0].character_a.name).toBe('Hero')
    })

    it('returns empty array when no relationships', async () => {
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
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`)
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 500 on database error', async () => {
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
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`)
      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(500)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('POST /api/series/[seriesId]/relationships', () => {
    it('creates a relationship successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacters = [
        { id: characterAId, series_id: seriesId },
        { id: characterBId, series_id: seriesId },
      ]
      const mockRelationship = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        series_id: seriesId,
        character_a_id: characterAId,
        character_b_id: characterBId,
        relationship_type: 'friends',
        character_a: { id: characterAId, name: 'Hero' },
        character_b: { id: characterBId, name: 'Sidekick' },
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
              in: jest.fn().mockResolvedValue({
                data: mockCharacters,
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,  // No existing relationship
                    error: null,
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockRelationship,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.relationship_type).toBe('friends')
    })

    it('creates a custom relationship with label', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacters = [
        { id: characterAId, series_id: seriesId },
        { id: characterBId, series_id: seriesId },
      ]
      const mockRelationship = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        series_id: seriesId,
        character_a_id: characterAId,
        character_b_id: characterBId,
        relationship_type: 'custom',
        custom_label: 'Nemesis',
        character_a: { id: characterAId, name: 'Hero' },
        character_b: { id: characterBId, name: 'Villain' },
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
              in: jest.fn().mockResolvedValue({
                data: mockCharacters,
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockRelationship,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'custom',
          custom_label: 'Nemesis',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.relationship_type).toBe('custom')
      expect(data.custom_label).toBe('Nemesis')
    })

    it('returns 400 for missing character IDs', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('character_a_id')
    })

    it('returns 400 for missing relationship_type', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('relationship_type')
    })

    it('returns 400 for self-referential relationship', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterAId,  // Same ID
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cannot have a relationship with themselves')
    })

    it('returns 400 for invalid relationship_type', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'invalid_type',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid relationship_type')
    })

    it('returns 400 for custom type without label', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'custom',
          // Missing custom_label
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('custom_label is required')
    })

    it('returns 404 when characters not found', async () => {
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
              in: jest.fn().mockResolvedValue({
                data: [{ id: characterAId, series_id: seriesId }],  // Only one found
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 400 when character belongs to different series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacters = [
        { id: characterAId, series_id: seriesId },
        { id: characterBId, series_id: 'different-series-id' },  // Wrong series
      ]

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
              in: jest.fn().mockResolvedValue({
                data: mockCharacters,
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('must belong to the specified series')
    })

    it('returns 409 for duplicate relationship', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockCharacters = [
        { id: characterAId, series_id: seriesId },
        { id: characterBId, series_id: seriesId },
      ]
      const existingRelationship = {
        id: '550e8400-e29b-41d4-a716-446655440099',
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
              in: jest.fn().mockResolvedValue({
                data: mockCharacters,
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: existingRelationship,  // Duplicate found
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/relationships`, {
        method: 'POST',
        body: {
          character_a_id: characterAId,
          character_b_id: characterBId,
          relationship_type: 'friends',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })
})
