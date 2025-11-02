import { createClient } from '@/lib/supabase/server'
import { GET, PUT, DELETE } from '@/app/api/videos/[id]/performance/[metricId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/videos/[id]/performance/[metricId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const metricId = '550e8400-e29b-41d4-a716-446655440020'
  const userId = 'test-user-id'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/videos/[id]/performance/[metricId]', () => {
    it('returns a single metric successfully', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }
      const mockMetric = {
        id: metricId,
        video_id: videoId,
        platform: 'tiktok',
        views: 10000,
        likes: 500,
        comments: 50,
        shares: 25,
        saves: 100,
        recorded_at: '2025-10-29T12:00:00Z',
      }

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
                  single: jest.fn().mockResolvedValue({
                    data: mockMetric,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`
      )

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(metricId)
      expect(data.views).toBe(10000)
    })

    it('returns 404 for metric not found', async () => {
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

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`
      )

      const response = await GET(request, { params })

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/videos/[id]/performance/[metricId]', () => {
    it('updates a metric successfully', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }
      const mockExistingMetric = {
        id: metricId,
        video_id: videoId,
        views: 10000,
      }
      const mockUpdatedMetric = {
        id: metricId,
        video_id: videoId,
        views: 15000,
        likes: 750,
      }

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
                  single: jest.fn().mockResolvedValue({
                    data: mockExistingMetric,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockUpdatedMetric,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`,
        {
          method: 'PUT',
          body: {
            views: 15000,
            likes: 750,
          },
        }
      )

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.views).toBe(15000)
      expect(data.likes).toBe(750)
    })

    it('validates update data', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }
      const mockExistingMetric = { id: metricId, video_id: videoId }

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
                  single: jest.fn().mockResolvedValue({
                    data: mockExistingMetric,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`,
        {
          method: 'PUT',
          body: {
            views: -100, // Invalid: negative number
          },
        }
      )

      const response = await PUT(request, { params })

      expect(response.status).toBe(400)
    })

    it('returns 404 for metric not found', async () => {
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

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`,
        {
          method: 'PUT',
          body: { views: 15000 },
        }
      )

      const response = await PUT(request, { params })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/videos/[id]/performance/[metricId]', () => {
    it('deletes a metric successfully', async () => {
      const mockUser = { id: userId }
      const mockVideo = { id: videoId, user_id: userId }
      const mockExistingMetric = { id: metricId, video_id: videoId }

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
                  single: jest.fn().mockResolvedValue({
                    data: mockExistingMetric,
                    error: null,
                  }),
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 404 for metric not found', async () => {
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

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, { params })

      expect(response.status).toBe(404)
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const params = Promise.resolve({ id: videoId, metricId })
      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/performance/${metricId}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, { params })

      expect(response.status).toBe(401)
    })
  })
})
