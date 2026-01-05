jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { PATCH } from '@/app/api/series/[seriesId]/sora-settings/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/[seriesId]/sora-settings', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440001'
  const mockParams = Promise.resolve({ seriesId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('PATCH /api/series/[seriesId]/sora-settings', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/sora-settings`, {
        method: 'PATCH',
        body: { sora_camera_style: 'Cinematic' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/sora-settings`, {
        method: 'PATCH',
        body: { sora_camera_style: 'Cinematic' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the series project', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                project_id: 'project-123',
                projects: { user_id: 'different-user-id' },
              },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/sora-settings`, {
        method: 'PATCH',
        body: { sora_camera_style: 'Cinematic' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('updates sora settings successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const updatedSettings = {
        sora_camera_style: 'ARRI ALEXA',
        sora_lighting_mood: 'Dramatic',
        sora_color_palette: 'Cool tones',
        sora_overall_tone: 'Tense',
        sora_narrative_prefix: 'In a world...',
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
                  data: {
                    project_id: 'project-123',
                    projects: { user_id: mockUser.id },
                  },
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
                  data: updatedSettings,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/sora-settings`, {
        method: 'PATCH',
        body: updatedSettings,
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sora_camera_style).toBe('ARRI ALEXA')
      expect(data.sora_lighting_mood).toBe('Dramatic')
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
                single: jest.fn().mockResolvedValue({
                  data: {
                    project_id: 'project-123',
                    projects: { user_id: mockUser.id },
                  },
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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/sora-settings`, {
        method: 'PATCH',
        body: { sora_camera_style: 'Cinematic' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
