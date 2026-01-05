jest.mock('@/lib/supabase/server')
jest.mock('@/lib/encryption/api-key-encryption', () => ({
  decryptApiKey: jest.fn(),
}))

// Use a shared mock function via global - reference at call time, not capture time
const mockVideosCreate = jest.fn()
;(global as any).__mockVideosCreate = mockVideosCreate

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    videos: {
      // Reference global at call time so mock setup in tests works
      create: (...args: any[]) => (global as any).__mockVideosCreate(...args),
    },
  }))
})

import { createClient } from '@/lib/supabase/server'
import { decryptApiKey } from '@/lib/encryption/api-key-encryption'
import { POST } from '@/app/api/videos/[id]/generate-sora/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/generate-sora', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440000'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    mockVideosCreate.mockReset()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(decryptApiKey as jest.Mock).mockReturnValue('sk-test-key')
  })

  describe('POST /api/videos/[id]/generate-sora', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
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

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when video has no optimized prompt', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: null,
        sora_generation_status: null,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
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
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('must have a final prompt')
    })

    it('returns 409 when generation already in progress', async () => {
      const mockUser = { id: 'test-user-id' }
      const recentTime = new Date()
      recentTime.setMinutes(recentTime.getMinutes() - 5) // 5 minutes ago
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A cinematic scene',
        sora_generation_status: 'in_progress',
        sora_started_at: recentTime.toISOString(),
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
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
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already in progress')
    })

    it('allows retry when generation stuck for over 15 minutes', async () => {
      const mockUser = { id: 'test-user-id' }
      const stuckTime = new Date()
      stuckTime.setMinutes(stuckTime.getMinutes() - 20) // 20 minutes ago
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A cinematic scene',
        sora_generation_status: 'in_progress',
        sora_started_at: stuckTime.toISOString(),
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      })

      mockVideosCreate.mockResolvedValue({
        id: 'sora-job-123',
        status: 'queued',
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('generates video with platform key successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A dramatic sunset over mountains',
        sora_generation_status: null,
        title: 'Test Video',
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      })

      mockVideosCreate.mockResolvedValue({
        id: 'sora-job-456',
        status: 'queued',
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        {
          method: 'POST',
          body: {
            settings: {
              duration: 8,
              aspect_ratio: '16:9',
              resolution: '1080p',
            },
          },
        }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toBe('sora-job-456')
      expect(data.usedUserKey).toBe(false)
      expect(mockVideosCreate).toHaveBeenCalled()
    })

    it('generates video with user BYOK key', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A space exploration scene',
        sora_generation_status: null,
      }
      const mockApiKey = {
        encrypted_key: 'encrypted-key-data',
        is_valid: true,
        provider: 'openai',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Add rpc mock for usage_count increment
      mockSupabaseClient.rpc = jest.fn().mockReturnValue(1)

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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'user_api_keys') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockApiKey,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      })

      mockVideosCreate.mockResolvedValue({
        id: 'sora-job-789',
        status: 'queued',
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        {
          method: 'POST',
          body: {
            userApiKeyId: 'user-key-123',
            settings: { duration: 4 },
          },
        }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.usedUserKey).toBe(true)
      expect(data.estimatedCost).toBe(0) // BYOK has no platform cost
      expect(decryptApiKey).toHaveBeenCalledWith('encrypted-key-data')
    })

    it('returns 400 when user API key not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A cinematic scene',
        sora_generation_status: null,
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
        if (table === 'user_api_keys') {
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

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        {
          method: 'POST',
          body: { userApiKeyId: 'nonexistent-key' },
        }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('API key not found')
    })

    it('returns 400 when API key is marked as invalid', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A scene',
        sora_generation_status: null,
      }
      const mockApiKey = {
        encrypted_key: 'encrypted-key-data',
        is_valid: false,
        provider: 'openai',
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
        if (table === 'user_api_keys') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockApiKey,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        {
          method: 'POST',
          body: { userApiKeyId: 'invalid-key' },
        }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('marked as invalid')
    })

    it('returns 500 on Sora API error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A cinematic scene',
        sora_generation_status: null,
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
        return {}
      })

      mockVideosCreate.mockRejectedValue(new Error('Sora API unavailable'))

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to initiate video generation')
    })

    it('returns 500 when database update fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: mockUser.id,
        optimized_prompt: 'A cinematic scene',
        sora_generation_status: null,
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Database error' },
              }),
            }),
          }
        }
        return {}
      })

      mockVideosCreate.mockResolvedValue({
        id: 'sora-job-999',
        status: 'queued',
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/generate-sora`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
