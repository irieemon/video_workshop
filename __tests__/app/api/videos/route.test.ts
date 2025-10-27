import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/videos/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/videos', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/videos', () => {
    it('creates a video successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Test Video',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockVideo,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{
                    id: 'test-user-id',
                    is_admin: false,
                    subscription_tier: 'premium',
                    usage_current: { videos_this_month: 0 },
                    usage_quota: { videos_per_month: 100 }
                  }],
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

      const request = createMockRequest('http://localhost:3000/api/videos', { method: "POST", body: {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Video',
          userBrief: 'Test brief',
          agentDiscussion: JSON.stringify({ round1: [], round2: [] }),
          detailedBreakdown: JSON.stringify({
            scene_structure: 'Test',
            visual_specs: 'Test',
            audio: 'Test',
            platform_optimization: 'Test',
            hashtags: [],
          }),
          optimizedPrompt: 'Test prompt',
          characterCount: 11,
          platform: 'tiktok',
          hashtags: ['test', 'video'],
        } })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('550e8400-e29b-41d4-a716-446655440003')
    })

    it('inserts hashtags into separate table', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = { id: '550e8400-e29b-41d4-a716-446655440003' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockHashtagInsert = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'test-user-id', is_admin: false }],
                  error: null,
                }),
              }),
            }),
          }
        } else if (table === 'videos') {
          callCount++
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockVideo,
              error: null,
            }),
          }
        } else if (table === 'hashtags') {
          return {
            insert: mockHashtagInsert,
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/videos', { method: "POST", body: {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Video',
          userBrief: 'Test brief',
          agentDiscussion: JSON.stringify({ round1: [], round2: [] }),
          detailedBreakdown: JSON.stringify({
            scene_structure: 'Test',
            visual_specs: 'Test',
            audio: 'Test',
            platform_optimization: 'Test',
            hashtags: [],
          }),
          optimizedPrompt: 'Test prompt',
          characterCount: 11,
          platform: 'tiktok',
          hashtags: ['test', 'video', 'ai'],
        } })

      await POST(request)

      expect(mockHashtagInsert).toHaveBeenCalledWith([
        { video_id: '550e8400-e29b-41d4-a716-446655440003', tag: 'test', suggested_by: 'platform_expert' },
        { video_id: '550e8400-e29b-41d4-a716-446655440003', tag: 'video', suggested_by: 'platform_expert' },
        { video_id: '550e8400-e29b-41d4-a716-446655440003', tag: 'ai', suggested_by: 'platform_expert' },
      ])
    })

    it('stores generation source and metadata', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = { id: '550e8400-e29b-41d4-a716-446655440003' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockVideo,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{
                    id: 'test-user-id',
                    is_admin: false,
                    subscription_tier: 'premium',
                    usage_current: { videos_this_month: 0 },
                    usage_quota: { videos_per_month: 100 }
                  }],
                  error: null,
                }),
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

      const sourceMetadata = {
        episode_id: '550e8400-e29b-41d4-a716-446655440005',
        scene_number: 1
      }

      const request = createMockRequest('http://localhost:3000/api/videos', { method: "POST", body: {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Video',
          userBrief: 'Test brief',
          agentDiscussion: JSON.stringify({ round1: [], round2: [] }),
          detailedBreakdown: JSON.stringify({
            scene_structure: 'Test',
            visual_specs: 'Test',
            audio: 'Test',
            platform_optimization: 'Test',
            hashtags: [],
          }),
          optimizedPrompt: 'Test prompt',
          characterCount: 11,
          platform: 'tiktok',
          hashtags: [],
          generation_source: 'episode',
          source_metadata: sourceMetadata,
        } })

      await POST(request)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          generation_source: 'episode',
          source_metadata: sourceMetadata,
        })
      )
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/videos', { method: "POST", body: {} })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 for missing required fields', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/videos', { method: "POST", body: {
          // Missing required fields
        } })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/videos', () => {
    it('returns videos for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideos = [
        { id: '550e8400-e29b-41d4-a716-446655440001', title: 'Video 1' },
        { id: '550e8400-e29b-41d4-a716-446655440002', title: 'Video 2' },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockVideos,
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'test-user-id', is_admin: false }],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
        select: mockSelect,
        order: mockOrder,
      }
      })

      const request = createMockRequest('http://localhost:3000/api/videos')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockVideos)
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/videos')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})
