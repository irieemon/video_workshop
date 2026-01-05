jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, PATCH, DELETE } from '@/app/api/segment-groups/[id]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/segment-groups/[id]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const groupId = '550e8400-e29b-41d4-a716-446655440000'
  const mockParams = Promise.resolve({ id: groupId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/segment-groups/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`
      )
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when segment group not found', async () => {
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

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`
      )
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns segment group with progress', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockGroup = {
        id: groupId,
        episode_id: 'episode-123',
        total_segments: 5,
        completed_segments: 2,
      }
      const mockEpisode = {
        id: 'episode-123',
        title: 'Episode 1',
        series_id: 'series-123',
      }
      const mockSegments = [
        { id: 'seg-1', segment_number: 1 },
        { id: 'seg-2', segment_number: 2 },
      ]
      const mockVideos = [
        { id: 'vid-1', segment_id: 'seg-1', sora_generation_status: 'completed' },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'segment_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockGroup,
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
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockSegments,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockVideos,
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`
      )
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.segmentGroup).toBeDefined()
      expect(data.episode).toBeDefined()
      expect(data.segments).toHaveLength(2)
      expect(data.progress).toBeDefined()
      expect(data.progress.total).toBe(5)
    })
  })

  describe('PATCH /api/segment-groups/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`,
        {
          method: 'PATCH',
          body: { status: 'complete' },
        }
      )
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('updates segment group successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const updatedGroup = {
        id: groupId,
        status: 'complete',
        completed_segments: 5,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedGroup,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`,
        {
          method: 'PATCH',
          body: { status: 'complete', completedSegments: 5 },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.segmentGroup.status).toBe('complete')
    })

    it('returns 500 on update failure', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`,
        {
          method: 'PATCH',
          body: { status: 'error' },
        }
      )
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/segment-groups/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when segment group not found', async () => {
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
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('deletes segment group successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockGroup = {
        episode_id: 'episode-123',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'segment_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockGroup,
                    error: null,
                  }),
                }),
              }),
            }),
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

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deletedGroupId).toBe(groupId)
    })

    it('deletes with deleteVideos and deleteSegments options', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockGroup = {
        episode_id: 'episode-123',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const deleteMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'segment_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockGroup,
                    error: null,
                  }),
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'videos' || table === 'video_segments') {
          return {
            delete: deleteMock,
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}?deleteVideos=true&deleteSegments=true`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
