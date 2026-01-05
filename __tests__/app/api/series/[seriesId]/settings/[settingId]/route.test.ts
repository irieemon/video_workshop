import { createClient } from '@/lib/supabase/server'
import { GET, PATCH, DELETE } from '@/app/api/series/[seriesId]/settings/[settingId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series/[seriesId]/settings/[settingId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'
  const settingId = '550e8400-e29b-41d4-a716-446655440002'
  const mockParams = Promise.resolve({ seriesId, settingId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/settings/[settingId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`
      )
      const response = await GET(request, { params: mockParams })

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
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`
      )
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when setting not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'Not found' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`
      )
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns setting when found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockSetting = {
        id: settingId,
        name: 'Castle Interior',
        description: 'Medieval castle with stone walls',
        environment_type: 'interior',
        time_of_day: 'evening',
        atmosphere: 'mysterious',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSetting,
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
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`
      )
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Castle Interior')
      expect(data.environment_type).toBe('interior')
    })
  })

  describe('PATCH /api/series/[seriesId]/settings/[settingId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        {
          method: 'PATCH',
          body: { name: 'Updated Setting' },
        }
      )
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 400 for invalid environment_type', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSeries,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        {
          method: 'PATCH',
          body: { environment_type: 'invalid_type' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid environment_type')
    })

    it('returns 400 for empty name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSeries,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        {
          method: 'PATCH',
          body: { name: '' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('name cannot be empty')
    })

    it('returns 400 for empty description', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSeries,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        {
          method: 'PATCH',
          body: { description: '   ' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('description cannot be empty')
    })

    it('updates setting successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const updatedSetting = {
        id: settingId,
        name: 'Updated Castle',
        description: 'A grand medieval castle',
        environment_type: 'interior',
        time_of_day: 'night',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedSetting,
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
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        {
          method: 'PATCH',
          body: { name: 'Updated Castle', description: 'A grand medieval castle', time_of_day: 'night' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Castle')
      expect(data.time_of_day).toBe('night')
    })

    it('updates is_primary flag', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const updatedSetting = {
        id: settingId,
        name: 'Main Location',
        is_primary: true,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedSetting,
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
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        {
          method: 'PATCH',
          body: { is_primary: true },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.is_primary).toBe(true)
    })
  })

  describe('DELETE /api/series/[seriesId]/settings/[settingId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

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
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('deletes setting successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSeries,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/series/${seriesId}/settings/${settingId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
