/**
 * Tests for /api/series/[seriesId] route
 *
 * Tests GET (fetch series with context), PATCH (update), and DELETE operations
 */

import { createClient } from '@/lib/supabase/server'
import { GET, PATCH, DELETE } from '@/app/api/series/[seriesId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'
import { decrementUsage } from '@/lib/stripe/usage'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe/usage')

describe('/api/series/[seriesId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'

  // Next.js 15 uses Promise<params> pattern
  const createParams = (id: string) => Promise.resolve({ seriesId: id })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(decrementUsage as jest.Mock).mockResolvedValue({ success: true })
  })

  describe('GET /api/series/[seriesId]', () => {
    it('returns series with full context', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        description: 'A test series',
        genre: 'narrative',
        project: { id: 'project-id', name: 'Test Project', user_id: 'test-user-id' },
        characters: [
          { id: 'char-1', name: 'Hero' },
          { id: 'char-2', name: 'Villain' },
        ],
        settings: [
          { id: 'setting-1', name: 'City' },
        ],
        visual_style: { id: 'vs-1', primary_color: '#ff0000' },
        seasons: [],
        episodes: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSeries,
              error: null,
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`)

      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Test Series')
      expect(data.characters).toHaveLength(2)
      expect(data.settings).toHaveLength(1)
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`)

      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`)

      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 403 when user does not own series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: seriesId,
        name: 'Other User Series',
        project: { id: 'project-id', name: 'Other Project', user_id: 'other-user-id' },
        characters: [],
        settings: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSeries,
              error: null,
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`)

      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(403)
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'OTHER' },
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`)

      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/series/[seriesId]', () => {
    it('updates series successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const updatedSeries = {
        id: seriesId,
        name: 'Updated Series Name',
        description: 'Updated description',
        genre: 'educational',
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: {
          name: 'Updated Series Name',
          description: 'Updated description',
          genre: 'educational',
        },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Series Name')
      expect(data.genre).toBe('educational')
    })

    it('updates only provided fields', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const updatedSeries = {
        id: seriesId,
        name: 'Only Name Updated',
        description: 'Original description',
        genre: 'narrative',
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: {
          name: 'Only Name Updated',
        },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Only Name Updated')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: { name: 'New Name' },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
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
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: { name: 'New Name' },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 400 for invalid genre', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
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
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: { genre: 'invalid-genre' },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid genre')
    })

    it('returns 400 for empty name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
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
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: { name: '   ' },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cannot be empty')
    })

    it('updates continuity settings', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const updatedSeries = {
        id: seriesId,
        name: 'Series',
        enforce_continuity: true,
        allow_continuity_breaks: false,
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'PATCH',
        body: {
          enforce_continuity: true,
          allow_continuity_breaks: false,
        },
      })

      const response = await PATCH(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.enforce_continuity).toBe(true)
      expect(data.allow_continuity_breaks).toBe(false)
    })
  })

  describe('DELETE /api/series/[seriesId]', () => {
    it('deletes series successfully', async () => {
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
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(decrementUsage).toHaveBeenCalledWith(
        expect.anything(),
        'test-user-id',
        'projects'
      )
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
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
      }))

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 500 on database error during delete', async () => {
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
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Delete failed' },
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(seriesId) })

      expect(response.status).toBe(500)
    })
  })
})
