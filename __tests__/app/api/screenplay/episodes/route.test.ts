jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/screenplay/episodes/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/screenplay/episodes', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = 'series-123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/screenplay/episodes', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/episodes?seriesId=${seriesId}`)
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when seriesId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/episodes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('seriesId')
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

      const request = createMockRequest(`http://localhost:3000/api/screenplay/episodes?seriesId=${seriesId}`)
      const response = await GET(request)

      expect(response.status).toBe(404)
    })

    it('returns episodes for valid series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisodes = [
        { id: 'ep-1', title: 'Episode 1', episode_number: 1 },
        { id: 'ep-2', title: 'Episode 2', episode_number: 2 },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify series ownership
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: seriesId },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Second call: fetch episodes
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockEpisodes,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/episodes?seriesId=${seriesId}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episodes).toHaveLength(2)
      expect(data.episodes[0].title).toBe('Episode 1')
    })

    it('returns 500 on fetch error', async () => {
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
                    data: { id: seriesId },
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
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/episodes?seriesId=${seriesId}`)
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/screenplay/episodes', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/episodes', {
        method: 'POST',
        body: { seriesId, episodeData: { title: 'New Episode' } },
      })
      const response = await POST(request)

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

      const request = createMockRequest('http://localhost:3000/api/screenplay/episodes', {
        method: 'POST',
        body: { seriesId, episodeData: { title: 'New Episode' } },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('creates episode with auto-incremented episode number', async () => {
      const mockUser = { id: 'test-user-id' }
      const newEpisode = {
        id: 'new-ep-id',
        title: 'Episode 3',
        episode_number: 3,
        series_id: seriesId,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify series ownership
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: seriesId },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Second call: get existing episodes for auto-increment
        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [{ episode_number: 2 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Third call: insert new episode
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newEpisode,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/episodes', {
        method: 'POST',
        body: { seriesId, episodeData: { title: 'Episode 3' } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.id).toBe('new-ep-id')
      expect(data.episode.episode_number).toBe(3)
    })

    it('creates first episode when no existing episodes', async () => {
      const mockUser = { id: 'test-user-id' }
      const newEpisode = {
        id: 'new-ep-id',
        title: 'Episode 1',
        episode_number: 1,
        series_id: seriesId,
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
                    data: { id: seriesId },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [], // No existing episodes
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newEpisode,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/episodes', {
        method: 'POST',
        body: { seriesId, episodeData: { title: 'Episode 1' } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.episode_number).toBe(1)
    })

    it('returns 500 on insert error', async () => {
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
                    data: { id: seriesId },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/episodes', {
        method: 'POST',
        body: { seriesId, episodeData: { title: 'New Episode' } },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
