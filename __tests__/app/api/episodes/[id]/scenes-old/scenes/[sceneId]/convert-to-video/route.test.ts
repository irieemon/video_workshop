jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/screenplay-enrichment')

import { createClient } from '@/lib/supabase/server'
import { screenplayEnrichment } from '@/lib/services/screenplay-enrichment'
import { POST } from '@/app/api/episodes/[id]/scenes-old/scenes/[sceneId]/convert-to-video/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/episodes/[id]/scenes-old/scenes/[sceneId]/convert-to-video', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = 'episode-123'
  const sceneId = 'scene-456'
  const mockParams = Promise.resolve({ id: episodeId, sceneId })

  const mockScene = {
    scene_id: sceneId,
    scene_number: 1,
    location: 'INT. OFFICE',
    time_of_day: 'DAY',
    time_period: 'PRESENT',
    description: 'A detective investigates a crime scene',
    characters: ['Detective Smith'],
    dialogue: [{ character: 'Detective Smith', lines: ['What happened here?'] }],
    action: ['Detective examines the evidence'],
    duration_estimate: 30,
  }

  const mockSeriesContext = {
    series: {
      id: 'series-123',
      name: 'Mystery Series',
    },
    characters: [
      { id: 'char-1', name: 'Detective Smith', role: 'lead', description: 'A veteran detective' },
    ],
    settings: [
      { id: 'setting-1', name: 'Office', description: 'A cluttered detective office' },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(screenplayEnrichment.extractScene as jest.Mock).mockResolvedValue(mockScene)
    ;(screenplayEnrichment.getSeriesContext as jest.Mock).mockResolvedValue(mockSeriesContext)
    ;(screenplayEnrichment.generateEnrichedPrompt as jest.Mock).mockResolvedValue(
      'A detailed prompt for video generation'
    )
    ;(screenplayEnrichment.createEnrichmentData as jest.Mock).mockReturnValue({
      enrichmentType: 'screenplay',
      characters: ['Detective Smith'],
    })
  })

  describe('POST /api/episodes/[id]/scenes-old/scenes/[sceneId]/convert-to-video', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when scene not found in screenplay', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(screenplayEnrichment.extractScene as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Scene not found')
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

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Episode not found')
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        series_id: 'series-123',
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: 'different-user-id',
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

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('returns 500 when series context fails to load', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        series_id: 'series-123',
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
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

      ;(screenplayEnrichment.getSeriesContext as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('series context')
    })

    it('converts scene to video successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        series_id: 'series-123',
        title: 'Mystery Episode',
        season_number: 1,
        episode_number: 5,
        user_id: mockUser.id,
      }
      const mockCreatedVideo = {
        id: 'video-789',
        title: 'Mystery Episode - Scene 1',
        optimized_prompt: 'A detailed prompt for video generation',
        scene_id: sceneId,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: get episode
        if (callCount === 1) {
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

        // Second call: insert video
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCreatedVideo,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.video.id).toBe('video-789')
      expect(data.video.scene_id).toBe(sceneId)
      expect(data.enrichmentContext).toBeDefined()
      expect(data.enrichmentContext.charactersIncluded).toHaveLength(1)
      expect(data.enrichmentContext.settingsUsed).toHaveLength(1)
    })

    it('appends custom instructions to prompt when provided', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        series_id: 'series-123',
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
      }
      const mockCreatedVideo = {
        id: 'video-789',
        title: 'Test Episode - Scene 1',
        optimized_prompt: 'A detailed prompt for video generation\n\n**Additional Instructions**: Make it dramatic',
        scene_id: sceneId,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
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

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCreatedVideo,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        {
          method: 'POST',
          body: { customInstructions: 'Make it dramatic' },
        }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.video.optimized_prompt).toContain('Additional Instructions')
    })

    it('uses technical overrides when provided', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        series_id: 'series-123',
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
      }
      const mockCreatedVideo = {
        id: 'video-789',
        title: 'Test Episode - Scene 1',
        optimized_prompt: 'Generated prompt',
        scene_id: sceneId,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
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

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCreatedVideo,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        {
          method: 'POST',
          body: {
            duration: 45,
            technicalOverrides: {
              aspectRatio: '16:9',
              resolution: '720p',
              cameraStyle: 'cinematic',
              lightingMood: 'moody',
            },
          },
        }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(200)
      // Verify generateEnrichedPrompt was called with technical specs
      expect(screenplayEnrichment.generateEnrichedPrompt).toHaveBeenCalledWith(
        mockScene,
        mockSeriesContext,
        expect.objectContaining({
          duration: 45,
          aspectRatio: '16:9',
          resolution: '720p',
          cameraStyle: 'cinematic',
          lightingMood: 'moody',
        })
      )
    })

    it('returns 500 when video creation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        series_id: 'series-123',
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
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

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest(
        `http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes/${sceneId}/convert-to-video`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
