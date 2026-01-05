jest.mock('@/lib/supabase/server')

// Mock OpenAI with videos API
const mockVideosRetrieve = jest.fn()
const mockVideosDownloadContent = jest.fn()

jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    videos: {
      retrieve: (...args: unknown[]) => mockVideosRetrieve(...args),
      downloadContent: (...args: unknown[]) => mockVideosDownloadContent(...args),
    },
  }))
  return MockOpenAI
})

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/videos/[id]/sora-status/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/sora-status', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/videos/[id]/sora-status', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/sora-status`)
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/sora-status`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when video has no sora job', async () => {
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
                data: {
                  id: videoId,
                  user_id: mockUser.id,
                  sora_job_id: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/sora-status`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No Sora generation job')
    })

    it('returns completed status from database without API call', async () => {
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
                data: {
                  id: videoId,
                  user_id: mockUser.id,
                  sora_job_id: 'job-123',
                  sora_generation_status: 'completed',
                  sora_video_url: 'https://example.com/video.mp4',
                  sora_generation_cost: 0.05,
                  sora_completed_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/sora-status`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('completed')
      expect(data.videoUrl).toBe('https://example.com/video.mp4')
      expect(data.cost).toBe(0.05)
    })

    it('returns failed status from database without API call', async () => {
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
                data: {
                  id: videoId,
                  user_id: mockUser.id,
                  sora_job_id: 'job-123',
                  sora_generation_status: 'failed',
                  sora_error_message: 'Content policy violation',
                  sora_completed_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/sora-status`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('failed')
      expect(data.error).toBe('Content policy violation')
    })
  })
})
