jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/screenplay-to-prompt', () => ({
  convertScreenplayToPrompt: jest.fn(),
  convertEpisodeToPrompts: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/episodes/[id]/convert-to-prompt/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'
import { convertScreenplayToPrompt, convertEpisodeToPrompts } from '@/lib/ai/screenplay-to-prompt'

describe('/api/episodes/[id]/convert-to-prompt', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = 'episode-123'
  const mockParams = Promise.resolve({ id: episodeId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/episodes/[id]/convert-to-prompt', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        body: {},
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when episode not found', async () => {
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        body: {},
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when episode has no screenplay', async () => {
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
                id: episodeId,
                title: 'Test Episode',
                screenplay_text: null,
              },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        body: {},
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('no screenplay content')
    })

    it('converts single screenplay to prompt successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        season_number: 1,
        episode_number: 3,
        screenplay_text: 'INT. OFFICE - DAY\n\nJohn enters the room.',
        structured_screenplay: null,
        series: { name: 'Test Series', visual_template: null, characters: [], settings: [] },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      ;(convertScreenplayToPrompt as jest.Mock).mockResolvedValue({
        prompt: 'A professional office scene...',
        style: 'cinematic',
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        body: {},
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.id).toBe(episodeId)
      expect(data.prompt).toBeDefined()
      expect(convertScreenplayToPrompt).toHaveBeenCalled()
    })

    it('converts all scenes when convert_all_scenes is true', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        season_number: 1,
        episode_number: 3,
        screenplay_text: 'Multiple scenes...',
        structured_screenplay: null,
        series: null,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      ;(convertEpisodeToPrompts as jest.Mock).mockResolvedValue([
        { scene_id: 'scene-1', prompt: 'Scene 1 prompt' },
        { scene_id: 'scene-2', prompt: 'Scene 2 prompt' },
      ])

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        body: { convert_all_scenes: true },
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.prompts).toHaveLength(2)
      expect(data.total_scenes).toBe(2)
      expect(convertEpisodeToPrompts).toHaveBeenCalled()
    })

    it('returns 500 on conversion error', async () => {
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
                id: episodeId,
                title: 'Test Episode',
                screenplay_text: 'Some screenplay...',
                series: null,
              },
              error: null,
            }),
          }),
        }),
      })

      ;(convertScreenplayToPrompt as jest.Mock).mockRejectedValue(new Error('AI conversion failed'))

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        body: {},
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
