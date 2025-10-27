import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/series/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/series', () => {
    it('creates a standalone series successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Test Series',
        user_id: 'test-user-id',
        description: 'A test series',
        genre: 'narrative',
        visual_template: {},
        enforce_continuity: true,
        allow_continuity_breaks: true,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSeries,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        }
      })

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: {
          name: 'Test Series',
          description: 'A test series',
          genre: 'narrative',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('550e8400-e29b-41d4-a716-446655440020')
      expect(data.name).toBe('Test Series')
    })

    it('creates a series with project association', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProject = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        user_id: 'test-user-id',
      }
      const mockSeries = {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Project Series',
        user_id: 'test-user-id',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockProject,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'project_series') {
          // First call for checking duplicates, second for creating association
          const selectMock = jest.fn()
          selectMock.mockReturnValueOnce({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })
          return {
            select: selectMock,
            insert: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }
        }
        // series table
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockSeries,
            error: null,
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: {
          name: 'Project Series',
          project_id: '550e8400-e29b-41d4-a716-446655440010',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Project Series')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: { name: 'Test' },
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 for missing series name', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for invalid genre', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: {
          name: 'Test Series',
          genre: 'invalid-genre',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid genre')
    })

    it('returns 404 when project not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
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

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: {
          name: 'Test Series',
          project_id: '550e8400-e29b-41d4-a716-446655440099',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('returns 409 for duplicate series name in project', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProject = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        user_id: 'test-user-id',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockProject,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'project_series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    series: {
                      id: '550e8400-e29b-41d4-a716-446655440021',
                      name: 'Duplicate Series',
                    },
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/series', {
        method: 'POST',
        body: {
          name: 'Duplicate Series',
          project_id: '550e8400-e29b-41d4-a716-446655440010',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toContain('already exists')
    })
  })

  describe('GET /api/series', () => {
    it('returns series for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = [
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          name: 'Series 1',
          user_id: 'test-user-id',
          description: 'Test series 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          episodes: [{ count: 5 }],
          characters: [{ count: 3 }],
          settings: [{ count: 2 }],
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          name: 'Series 2',
          user_id: 'test-user-id',
          description: 'Test series 2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          episodes: [{ count: 3 }],
          characters: [{ count: 2 }],
          settings: [{ count: 1 }],
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockSeries,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        return {
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        }
      })

      const request = createMockRequest('http://localhost:3000/api/series')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Series 1',
        episode_count: 5,
        character_count: 3,
        setting_count: 2,
      })
      expect(data[1]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Series 2',
        episode_count: 3,
        character_count: 2,
        setting_count: 1,
      })
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/series')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})
