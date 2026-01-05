jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/performance-analyzer', () => ({
  analyzePerformance: jest.fn(),
  getInsightsCacheKey: jest.fn((videoId: string) => `insights-${videoId}`),
  shouldRegenerateInsights: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, DELETE } from '@/app/api/videos/[id]/performance/insights/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'
import { analyzePerformance, shouldRegenerateInsights } from '@/lib/ai/performance-analyzer'

describe('/api/videos/[id]/performance/insights', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/videos/[id]/performance/insights', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`)
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when no performance data exists', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        title: 'Test Video',
        optimized_prompt: 'A test prompt',
        hashtags: [],
        sora_generation_settings: {},
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: fetch video
        if (callCount === 1) {
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

        // Second call: fetch metrics (empty)
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain('Add performance metrics')
    })

    it('returns cached insights when fresh', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        title: 'Test Video',
        optimized_prompt: 'A test prompt',
        hashtags: [],
        sora_generation_settings: {},
      }
      const mockMetrics = [
        { id: 'metric-1', views: 1000, likes: 100 },
      ]
      const cachedInsights = {
        insights: { strengths: ['Great engagement'], recommendations: [] },
        generated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(shouldRegenerateInsights as jest.Mock).mockReturnValue(false)

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: fetch video
        if (callCount === 1) {
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

        // Second call: fetch metrics
        if (callCount === 2) {
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

        // Third call: fetch cached insights
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: cachedInsights,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cached).toBe(true)
      expect(data.insights.strengths).toContain('Great engagement')
    })

    it('generates new insights when cache is stale', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        title: 'Test Video',
        optimized_prompt: 'A test prompt',
        hashtags: [{ tag: 'viral' }],
        sora_generation_settings: { duration: 30 },
      }
      const mockMetrics = [
        { id: 'metric-1', views: 1000, likes: 100 },
      ]
      const newInsights = {
        insights: { strengths: ['New analysis'], recommendations: ['Post more'] },
        generated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(shouldRegenerateInsights as jest.Mock).mockReturnValue(true)
      ;(analyzePerformance as jest.Mock).mockResolvedValue(newInsights)

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: fetch video
        if (callCount === 1) {
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

        // Second call: fetch metrics
        if (callCount === 2) {
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

        // Third call: fetch cached insights (stale)
        if (callCount === 3) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { insights: {}, generated_at: '2024-01-01T00:00:00Z' },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Fourth call: upsert cache
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cached).toBe(false)
      expect(data.insights.strengths).toContain('New analysis')
      expect(analyzePerformance).toHaveBeenCalled()
    })

    it('returns 500 on AI analysis error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        title: 'Test Video',
        optimized_prompt: 'A test prompt',
        hashtags: [],
        sora_generation_settings: {},
      }
      const mockMetrics = [
        { id: 'metric-1', views: 1000, likes: 100 },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(shouldRegenerateInsights as jest.Mock).mockReturnValue(true)
      ;(analyzePerformance as jest.Mock).mockRejectedValue(new Error('AI service unavailable'))

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
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

        if (callCount === 2) {
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

        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate insights')
    })
  })

  describe('DELETE /api/videos/[id]/performance/insights', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`, {
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('clears insights cache successfully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify video ownership
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

        // Second call: delete cache
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on delete error', async () => {
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
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance/insights`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
