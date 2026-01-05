jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET, PUT, DELETE } from '@/app/api/screenplay/scenes/[sceneId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/screenplay/scenes/[sceneId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const sceneId = 'scene-123'
  const mockParams = Promise.resolve({ sceneId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/screenplay/scenes/[sceneId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when scene not found', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the scene', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        scene_heading: 'INT. OFFICE - DAY',
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: 'different-user-id' },
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
              data: mockScene,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('returns scene with ownership verified via double join', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        scene_number: 1,
        scene_heading: 'INT. OFFICE - DAY',
        location: 'OFFICE',
        action_description: 'The detective enters.',
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: mockUser.id },
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
              data: mockScene,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scene.id).toBe(sceneId)
      expect(data.scene.scene_heading).toBe('INT. OFFICE - DAY')
    })
  })

  describe('PUT /api/screenplay/scenes/[sceneId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'PUT',
        body: { action_description: 'Updated action' },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when scene not found or not owned', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'PUT',
        body: { action_description: 'Updated action' },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('updates scene and regenerates scene heading when location components change', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        scene_heading: 'INT. OFFICE - DAY',
        interior_exterior: 'INT',
        location: 'OFFICE',
        time_of_day: 'DAY',
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: mockUser.id },
        },
      }
      const updatedScene = {
        id: sceneId,
        scene_heading: 'EXT. STREET - NIGHT',
        interior_exterior: 'EXT',
        location: 'STREET',
        time_of_day: 'NIGHT',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify ownership
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockScene,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: update scene
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedScene,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'PUT',
        body: {
          interior_exterior: 'EXT',
          location: 'STREET',
          time_of_day: 'NIGHT',
        },
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scene.scene_heading).toBe('EXT. STREET - NIGHT')
    })

    it('updates scene with action description and dialogue', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: mockUser.id },
        },
      }
      const updatedScene = {
        id: sceneId,
        action_description: 'The door opens slowly.',
        dialogue: { character: 'Detective', line: 'Hello?' },
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
                single: jest.fn().mockResolvedValue({
                  data: mockScene,
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedScene,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'PUT',
        body: {
          action_description: 'The door opens slowly.',
          dialogue: { character: 'Detective', line: 'Hello?' },
        },
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scene.action_description).toBe('The door opens slowly.')
    })

    it('returns 500 on update error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: mockUser.id },
        },
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
                single: jest.fn().mockResolvedValue({
                  data: mockScene,
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'PUT',
        body: { action_description: 'Updated' },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/screenplay/scenes/[sceneId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when scene not found or not owned', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('deletes scene successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: mockUser.id },
        },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: verify ownership
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockScene,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: delete scene
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on delete error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScene = {
        id: sceneId,
        episode: {
          id: 'episode-123',
          series: { id: 'series-123', user_id: mockUser.id },
        },
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
                single: jest.fn().mockResolvedValue({
                  data: mockScene,
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Delete failed' },
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/screenplay/scenes/${sceneId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
