jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, PUT, DELETE } from '@/app/api/videos/[id]/performance/[metricId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/performance/[metricId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const metricId = '660e8400-e29b-41d4-a716-446655440020'
  const mockParams = Promise.resolve({ id: videoId, metricId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/videos/[id]/performance/[metricId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when video not found', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when metric not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: video exists
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: videoId, user_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Second call: metric not found
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
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns metric successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = {
        id: metricId,
        video_id: videoId,
        platform: 'tiktok',
        views: 5000,
        likes: 500,
        comments: 50,
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
                    data: { id: videoId, user_id: mockUser.id },
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
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMetric,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(metricId)
      expect(data.platform).toBe('tiktok')
      expect(data.views).toBe(5000)
    })
  })

  describe('PUT /api/videos/[id]/performance/[metricId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'PUT',
        body: { views: 10000 },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when video not found', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'PUT',
        body: { views: 10000 },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 for invalid data (negative views)', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = { id: metricId, video_id: videoId }

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
                    data: { id: videoId, user_id: mockUser.id },
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
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMetric,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'PUT',
        body: { views: -100 }, // Invalid: negative
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation')
    })

    it('returns 400 for invalid traffic source', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = { id: metricId, video_id: videoId }

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
                    data: { id: videoId, user_id: mockUser.id },
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
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMetric,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'PUT',
        body: { traffic_source: 'invalid_source' }, // Invalid enum value
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation')
    })

    it('updates metric successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = { id: metricId, video_id: videoId, views: 5000 }
      const updatedMetric = { ...mockMetric, views: 10000, likes: 1000 }

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
                    data: { id: videoId, user_id: mockUser.id },
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

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedMetric,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'PUT',
        body: { views: 10000, likes: 1000 },
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.views).toBe(10000)
      expect(data.likes).toBe(1000)
    })

    it('returns 500 on update error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = { id: metricId, video_id: videoId }

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
                    data: { id: videoId, user_id: mockUser.id },
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

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Update failed' },
                  }),
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'PUT',
        body: { views: 10000 },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/videos/[id]/performance/[metricId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when video not found', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when metric not found', async () => {
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
                    data: { id: videoId, user_id: mockUser.id },
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
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('deletes metric successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = { id: metricId }

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
                    data: { id: videoId, user_id: mockUser.id },
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

        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on delete error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockMetric = { id: metricId }

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
                    data: { id: videoId, user_id: mockUser.id },
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

        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Delete failed' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/${metricId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
