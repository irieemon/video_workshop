jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/videos/[id]/duplicate/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/duplicate', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/videos/[id]/duplicate', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/duplicate`, {
        method: 'POST',
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/duplicate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('duplicates video successfully with reset generated content', async () => {
      const mockUser = { id: 'test-user-id' }
      const originalVideo = {
        id: videoId,
        user_id: mockUser.id,
        series_id: 'series-123',
        project_id: 'project-123',
        title: 'Original Video',
        user_brief: 'A video about nature',
        platform: 'youtube-shorts',
        status: 'completed',
        agent_discussion: 'Previous discussion...',
        optimized_prompt: 'Previous optimized prompt...',
        sora_video_url: 'https://example.com/video.mp4',
        sora_generation_status: 'completed',
        series_characters_used: ['char-1', 'char-2'],
        series_settings_used: ['set-1'],
      }

      const duplicatedVideo = {
        id: 'new-video-id',
        user_id: mockUser.id,
        title: '(Copy) Original Video',
        status: 'draft',
        optimized_prompt: null,
        sora_video_url: null,
        series_characters_used: originalVideo.series_characters_used,
        series_settings_used: originalVideo.series_settings_used,
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
                    data: originalVideo,
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
                data: duplicatedVideo,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/duplicate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('(Copy) Original Video')
      expect(data.status).toBe('draft')
      expect(data.optimized_prompt).toBeNull()
    })

    it('returns 500 on insert error', async () => {
      const mockUser = { id: 'test-user-id' }
      const originalVideo = {
        id: videoId,
        user_id: mockUser.id,
        title: 'Original Video',
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
                    data: originalVideo,
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/duplicate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
