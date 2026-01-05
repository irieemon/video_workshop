jest.mock('@/lib/supabase/server')
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-token-12'),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST, DELETE } from '@/app/api/videos/[id]/share/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/share', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440010'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  describe('GET /api/videos/[id]/share', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`)
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns share status for owned video', async () => {
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
                  share_token: 'existing-token',
                  is_public: true,
                  shared_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isPublic).toBe(true)
      expect(data.shareToken).toBe('existing-token')
      expect(data.shareUrl).toContain('existing-token')
    })

    it('returns null shareUrl when not shared', async () => {
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
                  share_token: null,
                  is_public: false,
                  shared_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isPublic).toBe(false)
      expect(data.shareUrl).toBeNull()
    })
  })

  describe('POST /api/videos/[id]/share', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
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

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when video has no optimized prompt', async () => {
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
                  share_token: null,
                  is_public: false,
                  optimized_prompt: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('without an optimized prompt')
    })

    it('returns existing share token if already shared', async () => {
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
                  share_token: 'existing-token',
                  is_public: true,
                  optimized_prompt: 'A beautiful sunset...',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.shareToken).toBe('existing-token')
      expect(data.isNew).toBe(false)
    })

    it('generates new share token successfully', async () => {
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
                    data: {
                      id: videoId,
                      share_token: null,
                      is_public: false,
                      optimized_prompt: 'A beautiful sunset...',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.shareToken).toBe('test-token-12')
      expect(data.isNew).toBe(true)
      expect(data.shareUrl).toContain('test-token-12')
    })

    it('returns 500 on update error', async () => {
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
                    data: {
                      id: videoId,
                      share_token: null,
                      is_public: false,
                      optimized_prompt: 'A beautiful sunset...',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Update failed' },
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/videos/[id]/share', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('removes share link successfully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on update error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Update failed' },
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}/share`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
