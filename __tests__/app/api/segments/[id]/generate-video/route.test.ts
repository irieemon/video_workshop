jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/agent-orchestrator', () => ({
  runAgentRoundtable: jest.fn(),
}))
jest.mock('@/lib/services/series-context', () => ({
  fetchCompleteSeriesContext: jest.fn(),
  formatSeriesContextForAgents: jest.fn(),
}))
jest.mock('@/lib/types/character-consistency', () => ({
  generateCharacterPromptBlock: jest.fn(),
}))
jest.mock('@/lib/ai/visual-state-extractor', () => ({
  extractVisualState: jest.fn(),
}))
jest.mock('@/lib/ai/continuity-validator', () => ({
  validateContinuity: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { fetchCompleteSeriesContext, formatSeriesContextForAgents } from '@/lib/services/series-context'
import { extractVisualState } from '@/lib/ai/visual-state-extractor'
import { POST } from '@/app/api/segments/[id]/generate-video/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/segments/[id]/generate-video', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const segmentId = 'segment-123'
  const mockParams = Promise.resolve({ id: segmentId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/segments/[id]/generate-video', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segments/${segmentId}/generate-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when segment not found', async () => {
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
        `http://localhost:3000/api/segments/${segmentId}/generate-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'Opening scene',
        episode: {
          id: 'episode-123',
          user_id: 'different-user', // Different user owns this
          title: 'Episode 1',
          series_id: 'series-123',
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
              data: mockSegment,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segments/${segmentId}/generate-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('generates video successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'Opening scene',
        estimated_duration: 30,
        preceding_segment_id: null,
        episode: {
          id: 'episode-123',
          user_id: mockUser.id,
          title: 'Episode 1',
          series_id: 'series-123',
          episode_number: 1,
          season_number: 1,
        },
      }
      const mockVideo = {
        id: 'video-123',
        title: 'Episode 1 - Segment 1',
        status: 'generated',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Complex mock for multiple from() calls
      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegment,
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
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVideo,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'segment_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // No segment group
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      ;(fetchCompleteSeriesContext as jest.Mock).mockResolvedValue({
        series: {
          visual_template: null,
          sora_camera_style: 'cinematic',
          sora_lighting_mood: 'dramatic',
          sora_color_palette: 'warm',
          sora_overall_tone: 'epic',
          sora_narrative_prefix: null,
        },
        characters: [],
        settings: [],
        visualAssets: [],
        relationships: [],
      })

      ;(formatSeriesContextForAgents as jest.Mock).mockReturnValue('Series context')

      ;(runAgentRoundtable as jest.Mock).mockResolvedValue({
        optimizedPrompt: 'A dramatic opening scene at sunset.',
        discussion: [{ agent: 'director', content: 'Great scene setup' }],
        detailedBreakdown: { shots: [] },
        characterCount: 150,
        hashtags: ['drama', 'cinematic'],
      })

      ;(extractVisualState as jest.Mock).mockResolvedValue({
        cameraPosition: 'wide shot',
        lighting: 'sunset',
        mood: 'dramatic',
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segments/${segmentId}/generate-video`,
        { method: 'POST', body: { platform: 'youtube' } }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.video).toBeDefined()
      expect(data.video.id).toBe('video-123')
      expect(data.segment).toBeDefined()
      expect(runAgentRoundtable).toHaveBeenCalled()
    })

    it('returns 500 on video creation failure', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'Opening scene',
        estimated_duration: 30,
        episode: {
          id: 'episode-123',
          user_id: mockUser.id,
          title: 'Episode 1',
          series_id: 'series-123',
        },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_segments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegment,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      ;(fetchCompleteSeriesContext as jest.Mock).mockResolvedValue({
        series: {},
        characters: [],
        settings: [],
        visualAssets: [],
        relationships: [],
      })

      ;(formatSeriesContextForAgents as jest.Mock).mockReturnValue('')

      ;(runAgentRoundtable as jest.Mock).mockResolvedValue({
        optimizedPrompt: 'A scene',
        discussion: [],
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segments/${segmentId}/generate-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
