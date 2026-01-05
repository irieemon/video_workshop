jest.mock('@/lib/supabase/server')
jest.mock('openai')
jest.mock('@/lib/stripe/usage', () => ({
  enforceQuota: jest.fn(),
  incrementUsage: jest.fn(),
  createQuotaExceededResponse: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { enforceQuota, incrementUsage } from '@/lib/stripe/usage'
import { POST } from '@/app/api/segments/generate-video/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/segments/generate-video', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(enforceQuota as jest.Mock).mockResolvedValue({ allowed: true })
    ;(incrementUsage as jest.Mock).mockResolvedValue(undefined)
  })

  describe('POST /api/segments/generate-video', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'test' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 403 for non-premium users', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'free' },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'test' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Premium subscription required')
    })

    it('returns 403 when quota exceeded', async () => {
      const mockUser = { id: 'test-user-id' }
      const quotaResponse = { json: async () => ({ error: 'Quota exceeded' }), status: 403 }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'premium' },
              error: null,
            }),
          }),
        }),
      })

      ;(enforceQuota as jest.Mock).mockResolvedValue({
        allowed: false,
        response: quotaResponse,
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'test' },
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('returns 400 for missing required fields', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'premium' },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1' }, // Missing episodeId, seriesId, prompt
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('returns 404 when segment not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { subscription_tier: 'premium' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'nonexistent', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'test' },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = { id: 'seg-1', segment_number: 1 }
      const mockEpisode = { user_id: 'different-user', title: 'Episode 1' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { subscription_tier: 'premium' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegment,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'episodes') {
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
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'A dramatic scene' },
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('generates video successfully for premium user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = { id: 'seg-1', segment_number: 1, estimated_duration: 30, narrative_beat: 'Opening' }
      const mockEpisode = { user_id: mockUser.id, title: 'Episode 1' }
      const mockVideo = { id: 'vid-1', title: 'Episode 1 - Segment #1' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { subscription_tier: 'premium' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegment,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'episodes') {
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
        if (table === 'videos') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVideo,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'A dramatic opening scene' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.videoId).toBe('vid-1')
      expect(incrementUsage).toHaveBeenCalledWith(mockSupabaseClient, mockUser.id, 'videos')
    })

    it('returns 500 when video creation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = { id: 'seg-1', segment_number: 1 }
      const mockEpisode = { user_id: mockUser.id, title: 'Episode 1' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { subscription_tier: 'premium' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegment,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'episodes') {
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
        if (table === 'videos') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-video', {
        method: 'POST',
        body: { segmentId: 'seg-1', episodeId: 'ep-1', seriesId: 'ser-1', prompt: 'test' },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
