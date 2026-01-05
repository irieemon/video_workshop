import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/episodes/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/episodes', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/episodes', () => {
    it('returns episodes for a series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisodes = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          season_number: 1,
          episode_number: 2,
          title: 'Episode 2',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Chain: .select().eq().order().order()
      const mockOrder2 = jest.fn().mockResolvedValue({
        data: mockEpisodes,
        error: null,
      })
      const mockOrder1 = jest.fn().mockReturnValue({
        order: mockOrder2,
      })
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder1,
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelect,
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/episodes?seriesId=550e8400-e29b-41d4-a716-446655440000'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episodes).toHaveLength(2)
      expect(data.episodes[0].title).toBe('Pilot')
    })

    it('returns 400 when seriesId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/episodes')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('seriesId required')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        'http://localhost:3000/api/episodes?seriesId=550e8400-e29b-41d4-a716-446655440000'
      )

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock database error
      const mockOrder2 = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      const mockOrder1 = jest.fn().mockReturnValue({
        order: mockOrder2,
      })
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder1,
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelect,
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/episodes?seriesId=550e8400-e29b-41d4-a716-446655440000'
      )

      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/episodes', () => {
    it('creates an episode successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: '550e8400-e29b-41d4-a716-446655440000', user_id: 'test-user-id' }
      const mockEpisode = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: '550e8400-e29b-41d4-a716-446655440000',
        season_number: 1,
        episode_number: 1,
        title: 'Pilot',
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
        if (table === 'episodes') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockEpisode,
              error: null,
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/episodes', {
        method: 'POST',
        body: {
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.title).toBe('Pilot')
    })

    it('creates an episode with optional fields', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: '550e8400-e29b-41d4-a716-446655440000', user_id: 'test-user-id' }
      const mockEpisode = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: '550e8400-e29b-41d4-a716-446655440000',
        season_number: 1,
        episode_number: 1,
        title: 'Pilot',
        logline: 'The beginning of an adventure',
        screenplay_text: 'FADE IN: ...',
        status: 'in_progress',
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
        if (table === 'episodes') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockEpisode,
              error: null,
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/episodes', {
        method: 'POST',
        body: {
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
          logline: 'The beginning of an adventure',
          screenplay_text: 'FADE IN: ...',
          status: 'in_progress',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.logline).toBe('The beginning of an adventure')
      expect(data.episode.status).toBe('in_progress')
    })

    it('returns 400 for missing required fields', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/episodes', {
        method: 'POST',
        body: {
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          // Missing season_number, episode_number, title
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/episodes', {
        method: 'POST',
        body: {
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
        },
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

      const request = createMockRequest('http://localhost:3000/api/episodes', {
        method: 'POST',
        body: {
          series_id: '550e8400-e29b-41d4-a716-446655440099',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Series not found')
    })

    it('returns 500 on episode insert error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: '550e8400-e29b-41d4-a716-446655440000', user_id: 'test-user-id' }

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
        if (table === 'episodes') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/episodes', {
        method: 'POST',
        body: {
          series_id: '550e8400-e29b-41d4-a716-446655440000',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
