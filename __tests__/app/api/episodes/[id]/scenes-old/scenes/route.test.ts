jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/episodes/[id]/scenes-old/scenes/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/episodes/[id]/scenes-old/scenes', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = 'episode-123'
  const mockParams = Promise.resolve({ id: episodeId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/episodes/[id]/scenes-old/scenes', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })

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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        user_id: 'different-user-id',
        structured_screenplay: null,
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('another user')
    })

    it('returns empty scenes array when no structured screenplay', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
        structured_screenplay: null,
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenes).toEqual([])
      expect(data.message).toContain('structured screenplay')
    })

    it('returns empty scenes array when structured screenplay has no scenes', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
        structured_screenplay: { title: 'Test', scenes: null },
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenes).toEqual([])
    })

    it('returns transformed scenes from structured screenplay', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScenes = [
        {
          scene_id: 'scene-1',
          scene_number: 1,
          location: 'INT. OFFICE',
          time_of_day: 'DAY',
          time_period: 'PRESENT',
          description: 'A busy office scene',
          characters: ['John', 'Jane'],
          dialogue: [
            { character: 'John', lines: ['Hello!', 'How are you?'] },
            { character: 'Jane', lines: ['Fine, thanks!'] },
          ],
          action: ['John enters', 'Jane looks up'],
          duration_estimate: 45,
        },
        {
          scene_id: 'scene-2',
          scene_number: 2,
          location: 'EXT. STREET',
          time_of_day: 'NIGHT',
          time_period: 'PRESENT',
          description: 'A dark street corner',
          characters: ['Detective'],
          dialogue: null,
          action: null,
          duration_estimate: 30,
        },
      ]

      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        season_number: 1,
        episode_number: 5,
        user_id: mockUser.id,
        structured_screenplay: { scenes: mockScenes },
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalScenes).toBe(2)
      expect(data.scenes).toHaveLength(2)

      // Check first scene transformation
      expect(data.scenes[0].scene_id).toBe('scene-1')
      expect(data.scenes[0].location).toBe('INT. OFFICE')
      expect(data.scenes[0].hasDialogue).toBe(true)
      expect(data.scenes[0].hasActions).toBe(true)
      expect(data.scenes[0].characters).toEqual(['John', 'Jane'])
      expect(data.scenes[0].dialoguePreview).toHaveLength(2)
      expect(data.scenes[0].dialoguePreview[0].character).toBe('John')
      expect(data.scenes[0].dialoguePreview[0].firstLine).toBe('Hello!')

      // Check second scene (no dialogue/actions)
      expect(data.scenes[1].scene_id).toBe('scene-2')
      expect(data.scenes[1].hasDialogue).toBe(false)
      expect(data.scenes[1].hasActions).toBe(false)
      expect(data.scenes[1].dialoguePreview).toEqual([])

      // Check episode info
      expect(data.episode.id).toBe(episodeId)
      expect(data.episode.title).toBe('Test Episode')
      expect(data.episode.season_number).toBe(1)
      expect(data.episode.episode_number).toBe(5)
    })

    it('limits dialogue preview to first 2 entries', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockScenes = [
        {
          scene_id: 'scene-1',
          scene_number: 1,
          location: 'INT. CONFERENCE ROOM',
          time_of_day: 'DAY',
          description: 'Meeting scene',
          characters: ['A', 'B', 'C', 'D'],
          dialogue: [
            { character: 'A', lines: ['First line'] },
            { character: 'B', lines: ['Second line'] },
            { character: 'C', lines: ['Third line'] },
            { character: 'D', lines: ['Fourth line'] },
          ],
          action: [],
        },
      ]

      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        season_number: 1,
        episode_number: 1,
        user_id: mockUser.id,
        structured_screenplay: { scenes: mockScenes },
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenes[0].dialoguePreview).toHaveLength(2)
      expect(data.scenes[0].dialoguePreview[0].character).toBe('A')
      expect(data.scenes[0].dialoguePreview[1].character).toBe('B')
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/scenes-old/scenes`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
