jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/screenplay-context', () => ({
  buildEnhancedContextPrompt: jest.fn(() => 'Mock enhanced context prompt'),
  buildEpisodeContextPrompt: jest.fn(() => 'Mock episode context prompt'),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/screenplay/session/start/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/screenplay/session/start', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = 'series-123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/screenplay/session/start', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/session/start?seriesId=${seriesId}`)
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when seriesId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/start')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('seriesId')
    })

    it('returns active sessions for a series', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    { id: 'session-1', target_type: 'episode', current_step: 'episode_planning' },
                    { id: 'session-2', target_type: 'series', current_step: 'series_setup' },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/session/start?seriesId=${seriesId}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toHaveLength(2)
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/session/start?seriesId=${seriesId}`)
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/screenplay/session/start', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/start', {
        method: 'POST',
        body: { seriesId, targetType: 'series' },
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
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/start', {
        method: 'POST',
        body: { seriesId, targetType: 'series' },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('creates session for series target type', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        description: 'A test series',
        genre: 'drama',
        characters: [],
        settings: [],
        visual_assets: [],
        relationships: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: fetch series
        if (callCount === 1) {
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

        // Second call: insert session
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'new-session-id',
                  current_step: 'series_setup',
                },
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/start', {
        method: 'POST',
        body: { seriesId, targetType: 'series' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('new-session-id')
      expect(data.currentStep).toBe('series_setup')
      expect(data.initialMessage).toContain('Test Series')
    })

    it('creates episode when targetType is episode with initialConcept', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        characters: [{ name: 'Hero' }],
        settings: [],
        visual_assets: [],
        relationships: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: fetch series
        if (callCount === 1) {
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

        // Second call: insert episode
        if (callCount === 2) {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'new-episode-id' },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Third call: insert session
        if (callCount === 3) {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'new-session-id',
                    current_step: 'episode_planning',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Fourth call: update episode with session ID
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/start', {
        method: 'POST',
        body: {
          seriesId,
          targetType: 'episode',
          initialConcept: {
            episode_number: 1,
            season_number: 1,
            title: 'Pilot',
            logline: 'The journey begins',
            plot_summary: 'Our hero sets out',
            character_focus: ['Hero'],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('new-session-id')
      expect(data.episodeId).toBe('new-episode-id')
      expect(data.currentStep).toBe('episode_planning')
    })

    it('returns 500 when session creation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        characters: [],
        settings: [],
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
                    data: mockSeries,
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
                error: { message: 'Insert failed', code: 'DB_ERROR' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/start', {
        method: 'POST',
        body: { seriesId, targetType: 'series' },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
