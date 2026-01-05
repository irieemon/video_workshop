jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/agent-orchestrator-stream')
jest.mock('@/lib/types/character-consistency')

import { createClient } from '@/lib/supabase/server'
import { streamAgentRoundtable } from '@/lib/ai/agent-orchestrator-stream'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
import { POST } from '@/app/api/agent/roundtable/stream/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/agent/roundtable/stream', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(generateCharacterPromptBlock as jest.Mock).mockReturnValue('Character prompt block')
    ;(streamAgentRoundtable as jest.Mock).mockResolvedValue({
      finalPrompt: 'Generated video prompt',
      suggestedShots: ['Shot 1', 'Shot 2'],
    })
  })

  describe('POST /api/agent/roundtable/stream', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: { brief: 'Test', platform: 'YouTube' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('returns 401 when auth returns error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: { brief: 'Test', platform: 'YouTube' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when brief is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: { platform: 'YouTube' }, // Missing brief
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('returns 400 when platform is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: { brief: 'Test brief' }, // Missing platform
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns streaming response with correct headers when valid request', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: { brief: 'Create a cinematic video', platform: 'YouTube' },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(response.headers.get('X-Accel-Buffering')).toBe('no')
    })

    it('fetches series context when seriesId is provided', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = {
        id: 'series-123',
        visual_template: 'cinematic',
        sora_camera_style: 'tracking',
        sora_lighting_mood: 'dramatic',
        sora_color_palette: 'warm',
        sora_overall_tone: 'epic',
        sora_narrative_prefix: 'In a world...',
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
                single: jest.fn().mockResolvedValue({
                  data: mockSeries,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters' || table === 'series_settings') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'YouTube',
          seriesId: 'series-123',
        },
      })

      await POST(request)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('series')
    })

    it('fetches selected characters and generates prompt blocks', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockCharacters = [
        { id: 'char-1', name: 'Hero', sora_prompt_template: null },
        { id: 'char-2', name: 'Villain', sora_prompt_template: 'Custom villain template' },
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
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockCharacters, error: null }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                or: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'YouTube',
          seriesId: 'series-123',
          selectedCharacters: ['char-1', 'char-2'],
        },
      })

      await POST(request)

      expect(generateCharacterPromptBlock).toHaveBeenCalledWith(mockCharacters[0])
    })

    it('includes episode screenplay context when provided', async () => {
      const mockUser = { id: 'test-user-id' }
      const episodeData = {
        episode: {
          title: 'Pilot Episode',
          season_number: 1,
          episode_number: 1,
          logline: 'A hero begins their journey',
          synopsis: 'Full synopsis here',
          structured_screenplay: {
            scenes: [
              {
                scene_number: 1,
                location: 'EXT. FOREST',
                time_of_day: 'DAY',
                time_period: 'PRESENT',
                description: 'A hero walks through the forest',
                characters: ['Hero'],
                dialogue: [{ character: 'Hero', lines: 'I must continue...' }],
                action: ['Hero steps forward'],
              },
            ],
          },
        },
        series: {
          name: 'Epic Series',
        },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: {
          brief: 'Create scene 1 video',
          platform: 'YouTube',
          episodeData,
        },
      })

      await POST(request)

      // Verify streamAgentRoundtable was called with screenplay context
      expect(streamAgentRoundtable).toHaveBeenCalledWith(
        expect.objectContaining({
          screenplayContext: expect.stringContaining('EPISODE SCREENPLAY CONTEXT'),
        }),
        expect.any(Function)
      )
    })

    it('calls streamAgentRoundtable with correct parameters', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: {
          brief: 'A cinematic sunset scene',
          platform: 'TikTok',
        },
      })

      await POST(request)

      expect(streamAgentRoundtable).toHaveBeenCalledWith(
        expect.objectContaining({
          brief: 'A cinematic sunset scene',
          platform: 'TikTok',
          userId: mockUser.id,
        }),
        expect.any(Function)
      )
    })

    it('returns 500 when stream initialization fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock request.json() to throw an error
      const request = {
        json: jest.fn().mockRejectedValue(new Error('JSON parse error')),
      } as any

      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('handles streamAgentRoundtable errors gracefully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock streamAgentRoundtable to throw an error
      ;(streamAgentRoundtable as jest.Mock).mockRejectedValue(
        new Error('Agent orchestration failed')
      )

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: { brief: 'Test', platform: 'YouTube' },
      })

      const response = await POST(request)

      // The response should still be 200 because error is sent via SSE
      expect(response.status).toBe(200)
    })

    it('fetches visual assets when seriesId is provided', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockAssets = [
        { id: 'asset-1', type: 'reference', url: 'https://example.com/image1.jpg' },
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
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockAssets, error: null }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              or: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable/stream', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'YouTube',
          seriesId: 'series-123',
        },
      })

      await POST(request)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('series_visual_assets')
    })
  })
})
