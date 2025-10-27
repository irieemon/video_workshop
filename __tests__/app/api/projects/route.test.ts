import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/projects/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/projects', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/projects', () => {
    it('creates a project successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProject = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Test Project',
        user_id: 'test-user-id',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProject,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'test-user-id',
                    is_admin: false,
                    subscription_tier: 'premium',
                    usage_current: { projects: 0 },
                    usage_quota: { projects: 50 }
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }
        }
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        }
      })

      const request = createMockRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: {
          name: 'Test Project',
          description: 'A test project for our tests',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('550e8400-e29b-41d4-a716-446655440010')
      expect(data.name).toBe('Test Project')
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: { name: 'Test' },
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 for missing project name', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/projects', () => {
    it('returns projects for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockProjects = [
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          name: 'Project 1',
          user_id: 'test-user-id',
          description: 'Test project 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          videos: [{ count: 5 }],
          series: [{ count: 2 }]
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440012',
          name: 'Project 2',
          user_id: 'test-user-id',
          description: 'Test project 2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          videos: [{ count: 3 }],
          series: [{ count: 1 }]
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        return {
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        }
      })

      const request = createMockRequest('http://localhost:3000/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Project 1',
        video_count: 5,
        series_count: 2
      })
      expect(data[1]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'Project 2',
        video_count: 3,
        series_count: 1
      })
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/projects')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})
