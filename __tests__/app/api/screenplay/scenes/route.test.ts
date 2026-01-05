jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/screenplay/scenes/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/screenplay/scenes', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = 'episode-123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/screenplay/scenes', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes?episodeId=${episodeId}`)
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when episodeId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/scenes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('episodeId')
    })

    it('returns 404 when episode not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes?episodeId=${episodeId}`)
      const response = await GET(request)

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series: { id: 'series-123', user_id: 'different-user-id' },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes?episodeId=${episodeId}`)
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('returns scenes for valid episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series: { id: 'series-123', user_id: mockUser.id },
      }
      const mockScenes = [
        { id: 'scene-1', scene_number: 1, scene_heading: 'INT. OFFICE - DAY' },
        { id: 'scene-2', scene_number: 2, scene_heading: 'EXT. STREET - NIGHT' },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify episode ownership
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: fetch scenes
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockScenes,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes?episodeId=${episodeId}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenes).toHaveLength(2)
      expect(data.scenes[0].scene_heading).toBe('INT. OFFICE - DAY')
    })

    it('returns 500 on fetch error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series: { id: 'series-123', user_id: mockUser.id },
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
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
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

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes?episodeId=${episodeId}`)
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/screenplay/scenes', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/scenes', {
        method: 'POST',
        body: { episodeId, sceneData: { location: 'Office' } },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 404 when episode not found or not owned', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/scenes', {
        method: 'POST',
        body: { episodeId, sceneData: { location: 'Office' } },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('creates scene with auto-generated scene heading', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series: { id: 'series-123', user_id: mockUser.id },
      }
      const newScene = {
        id: 'new-scene-id',
        scene_number: 1,
        scene_heading: 'INT. OFFICE - DAY',
        location: 'OFFICE',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify episode ownership
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: get existing scenes for auto-increment
        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [], // No existing scenes
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Third call: insert scene
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newScene,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/scenes', {
        method: 'POST',
        body: {
          episodeId,
          sceneData: {
            interior_exterior: 'INT',
            location: 'OFFICE',
            time_of_day: 'DAY',
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scene.id).toBe('new-scene-id')
    })

    it('creates scene with auto-increment scene number', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series: { id: 'series-123', user_id: mockUser.id },
      }
      const newScene = {
        id: 'new-scene-id',
        scene_number: 4,
        scene_heading: 'EXT. STREET - NIGHT',
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
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
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
                    data: [{ scene_number: 3 }], // Existing scenes up to 3
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
                data: newScene,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/scenes', {
        method: 'POST',
        body: {
          episodeId,
          sceneData: {
            interior_exterior: 'EXT',
            location: 'STREET',
            time_of_day: 'NIGHT',
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scene.scene_number).toBe(4)
    })

    it('returns 500 on insert error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series: { id: 'series-123', user_id: mockUser.id },
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
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
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

      const request = createMockRequest('http://localhost:3000/api/screenplay/scenes', {
        method: 'POST',
        body: { episodeId, sceneData: { location: 'Office' } },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
