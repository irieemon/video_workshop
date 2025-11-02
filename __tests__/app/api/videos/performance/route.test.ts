import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/videos/[id]/performance/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/videos/[id]/performance', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const userId = 'test-user-id'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/videos/[id]/performance', () => {
    it('creates performance metrics successfully', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }
      const mockMetric = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        video_id: videoId,
        platform: 'tiktok',
        views: 10000,
        likes: 500,
        comments: 50,
        shares: 25,
        saves: 100,
        watch_time_seconds: null,
        completion_rate: null,
        traffic_source: 'fyp',
        recorded_at: '2025-10-29T12:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: userId, is_admin: false }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockVideo,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'video_performance') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lt: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMetric,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 10000,
          likes: 500,
          comments: 50,
          shares: 25,
          saves: 100,
          traffic_source: 'fyp',
          recorded_at: '2025-10-29T12:00:00Z',
        },
      })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.platform).toBe('tiktok')
      expect(data.views).toBe(10000)
    })

    it('validates required fields', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockVideo,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          // Missing required fields
          platform: 'tiktok',
        },
      })

      const response = await POST(request, { params })

      expect(response.status).toBe(400)
    })

    it('prevents duplicate entries within same hour', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockVideo,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'video_performance') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lt: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({
                        data: [{ id: 'existing-metric' }], // Existing metric found
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 10000,
          likes: 500,
          comments: 50,
          shares: 25,
          saves: 100,
          recorded_at: '2025-10-29T12:30:00Z',
        },
      })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Duplicate entry detected')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {},
      })

      const response = await POST(request, { params })

      expect(response.status).toBe(401)
    })

    it('returns 404 for video not found', async () => {
      const mockUser = { id: userId }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Not found'),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 10000,
          likes: 500,
          comments: 50,
          shares: 25,
          saves: 100,
        },
      })

      const response = await POST(request, { params })

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/videos/[id]/performance', () => {
    it('returns metrics with aggregates', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }
      const mockMetrics = [
        {
          id: '1',
          platform: 'tiktok',
          views: 10000,
          likes: 500,
          comments: 50,
          shares: 25,
          saves: 100,
          completion_rate: 85,
          recorded_at: '2025-10-29T12:00:00Z',
        },
        {
          id: '2',
          platform: 'instagram',
          views: 5000,
          likes: 250,
          comments: 25,
          shares: 10,
          saves: 150,
          completion_rate: 90,
          recorded_at: '2025-10-28T12:00:00Z',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockVideo,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'video_performance') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockMetrics,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toHaveLength(2)
      expect(data.aggregates.total_views).toBe(15000)
      expect(data.aggregates.total_likes).toBe(750)
      expect(data.aggregates.best_platform).toBe('tiktok')
      expect(data.count).toBe(2)
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)

      const response = await GET(request, { params })

      expect(response.status).toBe(401)
    })

    it('returns 404 for video not found', async () => {
      const mockUser = { id: userId }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Not found'),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId })
      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)

      const response = await GET(request, { params })

      expect(response.status).toBe(404)
    })
  })
})
