jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/episodes/[id]/full-data/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/episodes/[id]/full-data', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = '550e8400-e29b-41d4-a716-446655440000'
  const mockParams = Promise.resolve({ id: episodeId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/episodes/[id]/full-data', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when episode has no series', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Test Episode',
        series: null, // No series
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns complete episode data with characters and settings', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Pilot Episode',
        logline: 'An exciting beginning',
        screenplay_text: null,
        structured_screenplay: null,
        season_number: 1,
        episode_number: 1,
        status: 'draft',
        series: {
          id: 'series-123',
          name: 'Test Series',
          characters: [
            { id: 'char-1', name: 'Alice', description: 'Protagonist', role: 'lead', performance_style: 'dramatic' },
            { id: 'char-2', name: 'Bob', description: 'Sidekick', role: 'supporting', performance_style: 'comedic' },
          ],
          settings: [
            { id: 'set-1', name: 'City', description: 'Urban setting', environment_type: 'urban', time_of_day: 'day', atmosphere: 'busy' },
          ],
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
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.id).toBe(episodeId)
      expect(data.episode.title).toBe('Pilot Episode')
      expect(data.series.id).toBe('series-123')
      expect(data.series.name).toBe('Test Series')
      expect(data.characters).toHaveLength(2)
      expect(data.settings).toHaveLength(1)
      expect(data.suggestedCharacters).toEqual([])
      expect(data.suggestedSettings).toEqual([])
    })

    it('suggests characters and settings mentioned in screenplay', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Pilot Episode',
        logline: 'An exciting beginning',
        screenplay_text: 'ALICE enters the CITY. She looks around for BOB.',
        structured_screenplay: null,
        season_number: 1,
        episode_number: 1,
        status: 'draft',
        series: {
          id: 'series-123',
          name: 'Test Series',
          characters: [
            { id: 'char-1', name: 'Alice', description: 'Protagonist', role: 'lead', performance_style: 'dramatic' },
            { id: 'char-2', name: 'Bob', description: 'Sidekick', role: 'supporting', performance_style: 'comedic' },
            { id: 'char-3', name: 'Charlie', description: 'Villain', role: 'antagonist', performance_style: 'menacing' },
          ],
          settings: [
            { id: 'set-1', name: 'City', description: 'Urban setting', environment_type: 'urban', time_of_day: 'day', atmosphere: 'busy' },
            { id: 'set-2', name: 'Beach', description: 'Coastal setting', environment_type: 'coastal', time_of_day: 'sunset', atmosphere: 'relaxed' },
          ],
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
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      // Alice and Bob are mentioned in screenplay, Charlie is not
      expect(data.suggestedCharacters).toContain('char-1') // Alice
      expect(data.suggestedCharacters).toContain('char-2') // Bob
      expect(data.suggestedCharacters).not.toContain('char-3') // Charlie not mentioned
      // City is mentioned, Beach is not
      expect(data.suggestedSettings).toContain('set-1') // City
      expect(data.suggestedSettings).not.toContain('set-2') // Beach not mentioned
    })

    it('handles episode with no characters or settings', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        title: 'Empty Episode',
        logline: 'A lonely episode',
        screenplay_text: 'A blank page.',
        structured_screenplay: null,
        season_number: 1,
        episode_number: 1,
        status: 'draft',
        series: {
          id: 'series-123',
          name: 'Test Series',
          characters: null, // No characters
          settings: null, // No settings
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
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.characters).toEqual([])
      expect(data.settings).toEqual([])
      expect(data.suggestedCharacters).toEqual([])
      expect(data.suggestedSettings).toEqual([])
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

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}/full-data`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
