import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/series/[seriesId]/settings/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series/[seriesId]/settings', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'

  // Next.js 15 uses Promise<params> pattern
  const createParams = (id: string) => Promise.resolve({ seriesId: id })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/settings', () => {
    it('returns settings for a series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockSettings = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          series_id: seriesId,
          name: 'Main Office',
          description: 'The primary workspace setting',
          environment_type: 'interior',
          is_primary: true,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          series_id: seriesId,
          name: 'City Street',
          description: 'Urban exterior setting',
          environment_type: 'exterior',
          is_primary: false,
        },
      ]

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
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: mockSettings,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`)

      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Main Office')
      expect(data[0].is_primary).toBe(true)
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`)

      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`)

      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('POST /api/series/[seriesId]/settings', () => {
    it('creates a setting successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockSetting = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: seriesId,
        name: 'New Location',
        description: 'A brand new setting',
        environment_type: 'interior',
        is_primary: false,
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
                    data: null,  // No duplicate
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSetting,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'New Location',
          description: 'A brand new setting',
          environment_type: 'interior',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Location')
    })

    it('creates a setting with all optional fields', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockSetting = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: seriesId,
        name: 'Detailed Location',
        description: 'A setting with all details',
        environment_type: 'exterior',
        time_of_day: 'sunset',
        atmosphere: 'romantic',
        details: { weather: 'clear' },
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
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSetting,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'Detailed Location',
          description: 'A setting with all details',
          environment_type: 'exterior',
          time_of_day: 'sunset',
          atmosphere: 'romantic',
          details: { weather: 'clear' },
          is_primary: true,
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.time_of_day).toBe('sunset')
      expect(data.is_primary).toBe(true)
    })

    it('returns 400 for missing name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

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
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          description: 'A setting without a name',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('name is required')
    })

    it('returns 400 for missing description', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

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
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'Setting Without Description',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('description is required')
    })

    it('returns 400 for invalid environment_type', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

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
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'Setting',
          description: 'A setting',
          environment_type: 'invalid_type',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid environment_type')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'New Setting',
          description: 'A setting',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

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

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'New Setting',
          description: 'A setting',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 409 for duplicate setting name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const existingSetting = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'Existing Location',
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
                    data: existingSetting,  // Duplicate found
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/settings`, {
        method: 'POST',
        body: {
          name: 'Existing Location',
          description: 'A setting with duplicate name',
        },
      })

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })
  })
})
