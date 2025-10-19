import { POST, GET } from '@/app/api/videos/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server')

describe('/api/videos', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/videos', () => {
    it('creates a video successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: 'video-123',
        title: 'Test Video',
        project_id: 'project-123',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockResolvedValue({
        data: mockVideo,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: jest.fn().mockResolvedValue({
          data: mockVideo,
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-123',
          title: 'Test Video',
          userBrief: 'Test brief',
          agentDiscussion: { round1: [], round2: [] },
          detailedBreakdown: {
            scene_structure: 'Test',
            visual_specs: 'Test',
            audio: 'Test',
            platform_optimization: 'Test',
            hashtags: [],
          },
          optimizedPrompt: 'Test prompt',
          characterCount: 11,
          platform: 'tiktok',
          hashtags: ['test', 'video'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('video-123')
    })

    it('inserts hashtags into separate table', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = { id: 'video-123' }

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
        if (table === 'videos') {
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

      const request = new NextRequest('http://localhost:3000/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-123',
          title: 'Test Video',
          userBrief: 'Test brief',
          agentDiscussion: { round1: [], round2: [] },
          detailedBreakdown: {
            scene_structure: 'Test',
            visual_specs: 'Test',
            audio: 'Test',
            platform_optimization: 'Test',
            hashtags: [],
          },
          optimizedPrompt: 'Test prompt',
          characterCount: 11,
          platform: 'tiktok',
          hashtags: ['test', 'video', 'ai'],
        }),
      })

      await POST(request)

      expect(mockHashtagInsert).toHaveBeenCalledWith([
        { video_id: 'video-123', tag: 'test', suggested_by: 'platform_expert' },
        { video_id: 'video-123', tag: 'video', suggested_by: 'platform_expert' },
        { video_id: 'video-123', tag: 'ai', suggested_by: 'platform_expert' },
      ])
    })

    it('stores user_edits for Advanced Mode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = { id: 'video-123' }

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

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      })

      const userEdits = {
        mode: 'advanced' as const,
        iterations: 2,
        additional_guidance: 'Focus on colors',
        edits: [],
        final_version: {
          prompt: 'Final prompt',
          character_count: 12,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-123',
          title: 'Test Video',
          userBrief: 'Test brief',
          agentDiscussion: { round1: [], round2: [] },
          detailedBreakdown: {
            scene_structure: 'Test',
            visual_specs: 'Test',
            audio: 'Test',
            platform_optimization: 'Test',
            hashtags: [],
          },
          optimizedPrompt: 'Test prompt',
          characterCount: 11,
          platform: 'tiktok',
          hashtags: [],
          user_edits: userEdits,
        }),
      })

      await POST(request)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_edits: userEdits,
        })
      )
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = new NextRequest('http://localhost:3000/api/videos', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 for missing required fields', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/videos', () => {
    it('returns videos for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideos = [
        { id: 'video-1', title: 'Video 1' },
        { id: 'video-2', title: 'Video 2' },
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

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      })

      const request = new NextRequest('http://localhost:3000/api/videos')

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

      const request = new NextRequest('http://localhost:3000/api/videos')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})
