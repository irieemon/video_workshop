jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/videos/[id]/performance/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/performance', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/videos/[id]/performance', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns metrics with aggregates for video', async () => {
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

        // Second call: fetch performance metrics
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'metric-1',
                    platform: 'tiktok',
                    views: 1000,
                    likes: 100,
                    comments: 20,
                    shares: 15,
                    saves: 10,
                    completion_rate: 75.5,
                    recorded_at: '2024-01-02T00:00:00Z',
                  },
                  {
                    id: 'metric-2',
                    platform: 'instagram',
                    views: 500,
                    likes: 50,
                    comments: 10,
                    shares: 5,
                    saves: 8,
                    completion_rate: 80.0,
                    recorded_at: '2024-01-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toHaveLength(2)
      expect(data.count).toBe(2)
      expect(data.aggregates.total_views).toBe(1500)
      expect(data.aggregates.total_likes).toBe(150)
      expect(data.aggregates.best_platform).toBe('tiktok')
      expect(data.aggregates.avg_completion_rate).toBeCloseTo(77.75, 1)
    })

    it('returns empty aggregates when no metrics exist', async () => {
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
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toHaveLength(0)
      expect(data.aggregates.total_views).toBe(0)
      expect(data.aggregates.best_platform).toBeNull()
    })

    it('returns 500 on metrics fetch error', async () => {
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
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/videos/[id]/performance', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 1000,
          likes: 100,
          comments: 20,
          shares: 10,
        },
      })
      const response = await POST(request, { params: mockParams })

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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 1000,
          likes: 100,
          comments: 20,
          shares: 10,
        },
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 for invalid platform', async () => {
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
                data: { id: videoId, user_id: mockUser.id },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'youtube', // invalid - only tiktok and instagram allowed
          views: 1000,
          likes: 100,
          comments: 20,
          shares: 10,
        },
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation')
    })

    it('returns 400 for negative values', async () => {
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
                data: { id: videoId, user_id: mockUser.id },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: -100, // negative
          likes: 100,
          comments: 20,
          shares: 10,
        },
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation')
    })

    it('returns 409 for duplicate entry within same hour', async () => {
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

        // Second call: check for duplicates - return existing entry
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [{ id: 'existing-metric' }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 1000,
          likes: 100,
          comments: 20,
          shares: 10,
          recorded_at: '2024-01-01T12:30:00Z',
        },
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('Duplicate')
    })

    it('creates performance metrics successfully', async () => {
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

        // Second call: insert metrics (no recorded_at means skip duplicate check)
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'new-metric-id',
                  video_id: videoId,
                  platform: 'tiktok',
                  views: 1000,
                  likes: 100,
                  comments: 20,
                  shares: 10,
                  saves: 0,
                },
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 1000,
          likes: 100,
          comments: 20,
          shares: 10,
        },
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-metric-id')
      expect(data.platform).toBe('tiktok')
      expect(data.views).toBe(1000)
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
                    data: { id: videoId, user_id: mockUser.id },
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/performance`, {
        method: 'POST',
        body: {
          platform: 'tiktok',
          views: 1000,
          likes: 100,
          comments: 20,
          shares: 10,
        },
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
