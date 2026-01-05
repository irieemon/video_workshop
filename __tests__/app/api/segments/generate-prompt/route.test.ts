jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/agent-orchestrator', () => ({
  runAgentRoundtable: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { POST } from '@/app/api/segments/generate-prompt/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/segments/generate-prompt', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const segmentId = 'segment-123'
  const episodeId = 'episode-123'
  const seriesId = 'series-123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/segments/generate-prompt', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, episodeId, seriesId },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when segmentId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { episodeId, seriesId },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('segmentId')
    })

    it('returns 400 when episodeId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, seriesId },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('episodeId')
    })

    it('returns 400 when seriesId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, episodeId },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('seriesId')
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
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId: 'non-existent', episodeId, seriesId },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'A dramatic scene',
        estimated_duration: 30,
      }
      const mockEpisode = {
        user_id: 'different-user', // Different user owns this
        title: 'Episode 1',
        structured_screenplay: null,
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
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, episodeId, seriesId },
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'A dramatic scene',
        estimated_duration: 30,
      }
      const mockEpisode = {
        user_id: mockUser.id,
        title: 'Episode 1',
        structured_screenplay: null,
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
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, episodeId, seriesId },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('generates prompt for segment successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'A dramatic opening scene',
        estimated_duration: 30,
        visual_continuity_notes: 'Consistent lighting',
        characters_in_segment: ['Hero'],
        settings_in_segment: ['Castle'],
      }
      const mockEpisode = {
        user_id: mockUser.id,
        title: 'Episode 1',
        structured_screenplay: null,
      }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        description: 'A test series',
        visual_template: {},
        sora_camera_style: 'cinematic',
        sora_lighting_mood: 'dramatic',
        sora_color_palette: 'warm',
        sora_overall_tone: 'epic',
        sora_narrative_prefix: null,
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
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSeries,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [{ id: 'char-1', name: 'Hero', description: 'The main character' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'setting-1', name: 'Castle', description: 'A medieval castle' }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      ;(runAgentRoundtable as jest.Mock).mockResolvedValue({
        optimizedPrompt: 'A dramatic opening shot of a medieval castle at sunset.',
        discussion: [{ agent: 'director', content: 'Great scene setup' }],
      })

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, episodeId, seriesId },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.prompt).toBe('A dramatic opening shot of a medieval castle at sunset.')
      expect(data.discussion).toBeDefined()
      expect(runAgentRoundtable).toHaveBeenCalled()
    })

    it('returns 500 on agent roundtable error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSegment = {
        id: segmentId,
        segment_number: 1,
        narrative_beat: 'A scene',
        estimated_duration: 30,
      }
      const mockEpisode = {
        user_id: mockUser.id,
        title: 'Episode 1',
      }
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
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
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSeries,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      ;(runAgentRoundtable as jest.Mock).mockRejectedValue(new Error('AI service unavailable'))

      const request = createMockRequest('http://localhost:3000/api/segments/generate-prompt', {
        method: 'POST',
        body: { segmentId, episodeId, seriesId },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
