jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/agent-orchestrator')
jest.mock('@/lib/services/series-context')
jest.mock('@/lib/types/character-consistency')
jest.mock('@/lib/ai/visual-state-extractor')
jest.mock('@/lib/ai/continuity-validator')

import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { fetchCompleteSeriesContext, formatSeriesContextForAgents } from '@/lib/services/series-context'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
import { extractVisualState, mergeVisualStates } from '@/lib/ai/visual-state-extractor'
import { validateContinuity } from '@/lib/ai/continuity-validator'
import { POST } from '@/app/api/segment-groups/[id]/generate-batch/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/segment-groups/[id]/generate-batch', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const groupId = 'group-123'
  const mockParams = Promise.resolve({ id: groupId })

  const mockEpisode = {
    id: 'episode-123',
    title: 'Test Episode',
    series_id: 'series-123',
    episode_number: 1,
    season_number: 1,
  }

  const mockSegmentGroup = {
    id: groupId,
    user_id: 'test-user-id',
    episode_id: 'episode-123',
    status: 'pending',
    episode: mockEpisode,
  }

  const mockSegments = [
    {
      id: 'segment-1',
      segment_number: 1,
      narrative_beat: 'Opening',
      estimated_duration: 10,
      dialogue_lines: [{ character: 'John', lines: ['Hello'] }],
      action_beats: ['John enters'],
    },
    {
      id: 'segment-2',
      segment_number: 2,
      narrative_beat: 'Rising Action',
      estimated_duration: 15,
      narrative_transition: 'cuts to',
    },
  ]

  const mockCompleteContext = {
    series: {
      visual_template: null,
      sora_camera_style: 'cinematic',
      sora_lighting_mood: 'dramatic',
      sora_color_palette: 'warm',
      sora_overall_tone: 'suspenseful',
      sora_narrative_prefix: 'In a world...',
    },
    characters: [
      { id: 'char-1', name: 'John', sora_prompt_template: 'John is a detective' },
    ],
    settings: [],
    visualAssets: [],
    relationships: [],
  }

  const mockRoundtableResult = {
    discussion: { messages: [] },
    optimizedPrompt: 'A beautifully composed scene',
    detailedBreakdown: { shots: [] },
    characterCount: 500,
    hashtags: ['#drama', '#thriller'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(fetchCompleteSeriesContext as jest.Mock).mockResolvedValue(mockCompleteContext)
    ;(formatSeriesContextForAgents as jest.Mock).mockReturnValue('Series context string')
    ;(generateCharacterPromptBlock as jest.Mock).mockReturnValue('Character block')
    ;(runAgentRoundtable as jest.Mock).mockResolvedValue(mockRoundtableResult)
    ;(extractVisualState as jest.Mock).mockResolvedValue({ characters: [], environment: {} })
    ;(mergeVisualStates as jest.Mock).mockReturnValue({ characters: [], environment: {} })
    ;(validateContinuity as jest.Mock).mockResolvedValue({
      isValid: true,
      overallScore: 95,
      issues: [],
    })
  })

  describe('POST /api/segment-groups/[id]/generate-batch', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when segment group not found', async () => {
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
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 403 when user does not own segment group', async () => {
      const mockUser = { id: 'different-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSegmentGroup,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(403)
    })

    it('returns 400 when segment group already complete', async () => {
      const mockUser = { id: 'test-user-id' }
      const completedGroup = { ...mockSegmentGroup, status: 'complete' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: completedGroup,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('already complete')
    })

    it('returns 404 when no segments found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        // First call: fetch segment group
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegmentGroup,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: fetch segments - return empty
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
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('segments')
    })

    it('generates all segments successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockCreatedVideo = {
        id: 'video-123',
        title: 'Test Episode - Segment 1',
        optimized_prompt: 'A beautifully composed scene',
      }
      const mockUpdatedGroup = { ...mockSegmentGroup, status: 'complete' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        // First call: fetch segment group
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegmentGroup,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: fetch segments
        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockSegments,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Subsequent calls: updates and inserts
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUpdatedGroup,
                  error: null,
                }),
              }),
            }),
          }),
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
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: { platform: 'youtube' } }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.videos).toBeDefined()
      expect(data.segmentGroup).toBeDefined()
      expect(data.continuityReport).toBeDefined()
      expect(runAgentRoundtable).toHaveBeenCalled()
    })

    it('handles video creation failure and returns partial results', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegmentGroup,
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockSegments,
                  error: null,
                }),
              }),
            }),
          }
        }

        // Update group status to generating
        if (callCount === 3) {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }

        // Video insert fails
        if (table === 'videos') {
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
        }

        // Update segment group to error status
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate')
      expect(data.failedSegment).toBeDefined()
      expect(data.partialResults).toBeDefined()
    })

    it('uses default platform when not specified', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockCreatedVideo = { id: 'video-123', platform: 'tiktok' }
      const mockUpdatedGroup = { ...mockSegmentGroup, status: 'complete' }

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
                  data: mockSegmentGroup,
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [mockSegments[0]], // Just one segment for simpler test
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUpdatedGroup,
                  error: null,
                }),
              }),
            }),
          }),
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
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} } // No platform specified
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(200)
      // Verify runAgentRoundtable was called with default tiktok platform
      expect(runAgentRoundtable).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'tiktok',
        })
      )
    })

    it('validates continuity when requested', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockCreatedVideo = { id: 'video-123' }
      const mockUpdatedGroup = { ...mockSegmentGroup, status: 'complete' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock continuity issues
      ;(validateContinuity as jest.Mock).mockResolvedValue({
        isValid: false,
        overallScore: 70,
        issues: [
          { type: 'lighting', severity: 'warning', description: 'Lighting inconsistency' },
        ],
        autoCorrection: 'Apply warmer tones',
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSegmentGroup,
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockSegments,
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUpdatedGroup,
                  error: null,
                }),
              }),
            }),
          }),
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
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: { validateContinuityBefore: true } }
      )
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.continuityReport).toBeDefined()
      expect(data.continuityReport.segmentsWithIssues).toBeGreaterThanOrEqual(0)
    })

    it('handles exception during batch generation', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected database error')
      })

      const request = createMockRequest(
        `http://localhost:3000/api/segment-groups/${groupId}/generate-batch`,
        { method: 'POST', body: {} }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})
