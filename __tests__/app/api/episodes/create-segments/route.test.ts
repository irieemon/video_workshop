jest.mock('@/lib/supabase/server')
jest.mock('@/lib/utils/screenplay-extraction', () => ({
  validateStructuredScreenplay: jest.fn(),
  formatValidationErrors: jest.fn(),
}))
jest.mock('@/lib/ai/episode-segmenter', () => ({
  segmentEpisode: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { validateStructuredScreenplay, formatValidationErrors } from '@/lib/utils/screenplay-extraction'
import { segmentEpisode } from '@/lib/ai/episode-segmenter'
import { POST } from '@/app/api/episodes/create-segments/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/episodes/create-segments', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/episodes/create-segments', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when episodeId is missing', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('episodeId required')
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

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'nonexistent-ep' },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own the episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: 'different-user',
        title: 'Episode 1',
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

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })

    it('returns 400 when episode has no structured screenplay', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
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

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('structured screenplay')
      expect(data.hint).toBeDefined()
      expect(data.instructions).toBeDefined()
    })

    it('returns 400 when screenplay validation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
        structured_screenplay: { scenes: [] },
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

      ;(validateStructuredScreenplay as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Missing scenes', 'No characters defined'],
      })
      ;(formatValidationErrors as jest.Mock).mockReturnValue('Missing scenes, No characters defined')

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('invalid')
    })

    it('returns 400 when segmentation produces zero segments', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
        series_id: 'series-123',
        structured_screenplay: { scenes: [{ id: 's1', content: 'Short' }] },
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

      ;(validateStructuredScreenplay as jest.Mock).mockReturnValue({
        valid: true,
        warnings: [],
      })

      ;(segmentEpisode as jest.Mock).mockReturnValue({
        episode_id: 'ep-123',
        segment_count: 0,
        segments: [],
        total_duration: 0,
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('0 segments')
    })

    it('returns 500 when segment group creation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
        series_id: 'series-123',
        structured_screenplay: { scenes: [{ id: 's1' }] },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
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
        if (table === 'segment_groups') {
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

      ;(validateStructuredScreenplay as jest.Mock).mockReturnValue({
        valid: true,
        warnings: [],
      })

      ;(segmentEpisode as jest.Mock).mockReturnValue({
        episode_id: 'ep-123',
        segment_count: 3,
        total_duration: 30,
        segments: [
          { segment_number: 1, estimated_duration: 10, narrative_beat: 'Opening' },
          { segment_number: 2, estimated_duration: 10, narrative_beat: 'Rising action' },
          { segment_number: 3, estimated_duration: 10, narrative_beat: 'Climax' },
        ],
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('creates segments successfully with segment group', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
        series_id: 'series-123',
        structured_screenplay: {
          scenes: [{ id: 's1', dialogue: [], action_beats: [] }],
        },
      }
      const mockSegmentGroup = {
        id: 'group-123',
        episode_id: 'ep-123',
        total_segments: 3,
      }
      const mockInsertedSegments = [
        { id: 'seg-1', segment_number: 1 },
        { id: 'seg-2', segment_number: 2 },
        { id: 'seg-3', segment_number: 3 },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
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
        if (table === 'segment_groups') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegmentGroup,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'video_segments') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: mockInsertedSegments,
                error: null,
              }),
            }),
            update: updateMock,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockInsertedSegments,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      ;(validateStructuredScreenplay as jest.Mock).mockReturnValue({
        valid: true,
        warnings: [],
      })

      ;(segmentEpisode as jest.Mock).mockReturnValue({
        episode_id: 'ep-123',
        segment_count: 3,
        total_duration: 30,
        segments: [
          {
            segment_number: 1,
            scene_ids: ['s1'],
            start_timestamp: '00:00:00',
            end_timestamp: '00:00:10',
            estimated_duration: 10,
            narrative_beat: 'Opening scene',
            dialogue_lines: [],
            action_beats: [],
            characters_in_segment: [],
            settings_in_segment: [],
          },
          {
            segment_number: 2,
            scene_ids: ['s1'],
            start_timestamp: '00:00:10',
            end_timestamp: '00:00:20',
            estimated_duration: 10,
            narrative_beat: 'Rising action',
            dialogue_lines: [],
            action_beats: [],
            characters_in_segment: [],
            settings_in_segment: [],
          },
          {
            segment_number: 3,
            scene_ids: ['s1'],
            start_timestamp: '00:00:20',
            end_timestamp: '00:00:30',
            estimated_duration: 10,
            narrative_beat: 'Climax',
            dialogue_lines: [],
            action_beats: [],
            characters_in_segment: [],
            settings_in_segment: [],
          },
        ],
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode).toBeDefined()
      expect(data.episode.id).toBe('ep-123')
      expect(data.segmentGroup).toBeDefined()
      expect(data.segmentGroup.id).toBe('group-123')
      expect(data.segments).toHaveLength(3)
      expect(data.segmentCount).toBe(3)
      expect(data.totalDuration).toBe(30)
      expect(data.estimatedCost).toBeCloseTo(0.60, 2) // 3 segments * $0.20
    })

    it('creates segments without segment group when createSegmentGroup=false', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
        series_id: 'series-123',
        structured_screenplay: { scenes: [{ id: 's1' }] },
      }
      const mockInsertedSegments = [
        { id: 'seg-1', segment_number: 1 },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
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
        if (table === 'video_segments') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: mockInsertedSegments,
                error: null,
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockInsertedSegments,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      ;(validateStructuredScreenplay as jest.Mock).mockReturnValue({
        valid: true,
        warnings: [],
      })

      ;(segmentEpisode as jest.Mock).mockReturnValue({
        episode_id: 'ep-123',
        segment_count: 1,
        total_duration: 10,
        segments: [
          {
            segment_number: 1,
            scene_ids: ['s1'],
            start_timestamp: '00:00:00',
            end_timestamp: '00:00:10',
            estimated_duration: 10,
            narrative_beat: 'Opening',
            dialogue_lines: [],
            action_beats: [],
            characters_in_segment: [],
            settings_in_segment: [],
          },
        ],
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123', createSegmentGroup: false },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.segmentGroup).toBeNull()
      expect(data.segments).toHaveLength(1)
    })

    it('returns 500 when segment insertion fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: 'ep-123',
        user_id: mockUser.id,
        title: 'Episode 1',
        series_id: 'series-123',
        structured_screenplay: { scenes: [{ id: 's1' }] },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
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
        if (table === 'video_segments') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
              }),
            }),
          }
        }
        return {}
      })

      ;(validateStructuredScreenplay as jest.Mock).mockReturnValue({
        valid: true,
        warnings: [],
      })

      ;(segmentEpisode as jest.Mock).mockReturnValue({
        episode_id: 'ep-123',
        segment_count: 1,
        total_duration: 10,
        segments: [
          {
            segment_number: 1,
            scene_ids: ['s1'],
            start_timestamp: '00:00:00',
            end_timestamp: '00:00:10',
            estimated_duration: 10,
            narrative_beat: 'Opening',
            dialogue_lines: [],
            action_beats: [],
            characters_in_segment: [],
            settings_in_segment: [],
          },
        ],
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123', createSegmentGroup: false },
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('returns 500 on unexpected error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('http://localhost:3000/api/episodes/create-segments', {
        method: 'POST',
        body: { episodeId: 'ep-123' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
