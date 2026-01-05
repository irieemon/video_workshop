import { createClient } from '@/lib/supabase/server'
import { GET, PUT, PATCH, DELETE } from '@/app/api/videos/[id]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/videos/[id]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = '550e8400-e29b-41d4-a716-446655440000'

  // Next.js 15 uses Promise<params> pattern
  const createParams = (id: string) => Promise.resolve({ id })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/videos/[id]', () => {
    it('returns video with full context', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: 'test-user-id',
        title: 'Test Video',
        final_prompt: 'A beautiful sunset over the ocean',
        project: { id: 'project-1', name: 'Test Project' },
        series: { id: 'series-1', title: 'Test Series' },
        hashtags: [{ tag: '#sunset' }, { tag: '#ocean' }, { tag: '#nature' }],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockVideo,
              error: null,
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`)
      const response = await GET(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Test Video')
      // Hashtags should be transformed to array of strings
      expect(data.hashtags).toEqual(['#sunset', '#ocean', '#nature'])
    })

    it('returns empty hashtags array when no hashtags', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: 'test-user-id',
        title: 'Test Video',
        project: null,
        series: null,
        hashtags: null,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockVideo,
              error: null,
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`)
      const response = await GET(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hashtags).toEqual([])
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`)
      const response = await GET(request, { params: createParams(videoId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when video not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`)
      const response = await GET(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('PUT /api/videos/[id]', () => {
    it('updates video title successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: 'test-user-id',
        title: 'Updated Title',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVideo,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PUT',
        body: { title: 'Updated Title' },
      })

      const response = await PUT(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated Title')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PUT',
        body: { title: 'Updated Title' },
      })

      const response = await PUT(request, { params: createParams(videoId) })

      expect(response.status).toBe(401)
    })

    it('returns 500 when update fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
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
      }))

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PUT',
        body: { title: 'Updated Title' },
      })

      const response = await PUT(request, { params: createParams(videoId) })

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/videos/[id]', () => {
    it('updates video fields successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: 'test-user-id',
        title: 'Updated Video',
        final_prompt: 'Updated prompt',
        status: 'completed',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVideo,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }))

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PATCH',
        body: {
          title: 'Updated Video',
          final_prompt: 'Updated prompt',
          status: 'completed',
        },
      })

      const response = await PATCH(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated Video')
      expect(data.status).toBe('completed')
    })

    it('updates video with hashtags', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: 'test-user-id',
        title: 'Video with Hashtags',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
      const mockInsert = jest.fn().mockResolvedValue({ error: null })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockVideo,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'hashtags') {
          return {
            delete: mockDelete,
            insert: mockInsert,
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PATCH',
        body: {
          title: 'Video with Hashtags',
          hashtags: ['sunset', '#ocean', 'beach'],
        },
      })

      const response = await PATCH(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Video with Hashtags')
    })

    it('handles hashtag insert error gracefully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        user_id: 'test-user-id',
        title: 'Video',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockVideo,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'hashtags') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            insert: jest.fn().mockResolvedValue({
              error: { message: 'Hashtag insert failed' },
            }),
          }
        }
        return {}
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PATCH',
        body: {
          title: 'Video',
          hashtags: ['#test'],
        },
      })

      const response = await PATCH(request, { params: createParams(videoId) })

      // Should still succeed - hashtag errors don't fail the request
      expect(response.status).toBe(200)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Hashtag insert error:',
        expect.any(Object)
      )

      consoleErrorSpy.mockRestore()
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PATCH',
        body: { title: 'Updated' },
      })

      const response = await PATCH(request, { params: createParams(videoId) })

      expect(response.status).toBe(401)
    })

    it('returns 500 when update fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => ({
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
      }))

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'PATCH',
        body: { title: 'Updated' },
      })

      const response = await PATCH(request, { params: createParams(videoId) })

      expect(response.status).toBe(500)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('DELETE /api/videos/[id]', () => {
    it('deletes video and decrements usage counter', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProfile = {
        id: 'test-user-id',
        usage_current: { videos_this_month: 5 },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockUpdateProfile = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
            update: mockUpdateProfile,
          }
        }
        if (table === 'videos') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('deletes video without decrementing when no profile', async () => {
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
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(videoId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('handles zero videos correctly during decrement', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProfile = {
        id: 'test-user-id',
        usage_current: { videos_this_month: 0 },
      }

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
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(videoId) })
      const data = await response.json()

      // Should succeed - Math.max ensures counter doesn't go negative
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(videoId) })

      expect(response.status).toBe(401)
    })

    it('returns 500 when delete fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProfile = {
        id: 'test-user-id',
        usage_current: { videos_this_month: 5 },
      }

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
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: { message: 'Delete failed' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/videos/${videoId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: createParams(videoId) })

      expect(response.status).toBe(500)
    })
  })
})
