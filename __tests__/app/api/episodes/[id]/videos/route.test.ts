jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/episodes/[id]/videos/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/episodes/[id]/videos', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = '550e8400-e29b-41d4-a716-446655440000'
  const mockParams = Promise.resolve({ id: episodeId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/episodes/[id]/videos', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/videos`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(401)
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/videos`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series_id: 'series-123',
        series: {
          id: 'series-123',
          user_id: 'different-user-id',
        },
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/videos`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('returns videos for the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series_id: 'series-123',
        series: {
          id: 'series-123',
          user_id: mockUser.id,
        },
      }
      const mockVideos = [
        {
          id: 'video-1',
          title: 'Test Video 1',
          optimized_prompt: 'A prompt',
          status: 'completed',
          sora_video_url: 'data:video/mp4;base64,test',
          platform: 'youtube',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'video-2',
          title: 'Test Video 2',
          optimized_prompt: 'Another prompt',
          status: 'draft',
          sora_video_url: null,
          platform: 'tiktok',
          created_at: '2025-01-02T00:00:00Z',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockVideos,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/videos`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.videos).toHaveLength(2)
      expect(data.videos[0].title).toBe('Test Video 1')
      expect(data.videos[1].title).toBe('Test Video 2')
    })

    it('returns empty array when no videos exist', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series_id: 'series-123',
        series: {
          id: 'series-123',
          user_id: mockUser.id,
        },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/videos`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.videos).toHaveLength(0)
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/videos`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
