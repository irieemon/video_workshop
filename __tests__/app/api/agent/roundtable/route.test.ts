import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/agent/roundtable/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { checkRateLimit, createRateLimitKey, createRateLimitResponse, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'
import { enforceQuota, incrementUsage } from '@/lib/stripe/usage'
import { fetchCompleteSeriesContext, formatSeriesContextForAgents } from '@/lib/services/series-context'
import { validateCharacterConsistency, getQualityAssessment } from '@/lib/validation/character-consistency'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/agent-orchestrator')
jest.mock('@/lib/rate-limit')
jest.mock('@/lib/stripe/usage')
jest.mock('@/lib/services/series-context')
jest.mock('@/lib/validation/character-consistency')

describe('/api/agent/roundtable', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)

    // Default mock implementations
    ;(checkRateLimit as jest.Mock).mockReturnValue({
      allowed: true,
      remaining: 10,
      retryAfter: 0,
    })
    ;(createRateLimitKey as jest.Mock).mockReturnValue('ai:roundtable:test-user-id')
    ;(getRateLimitHeaders as jest.Mock).mockReturnValue({})

    ;(enforceQuota as jest.Mock).mockResolvedValue({ allowed: true })
    ;(incrementUsage as jest.Mock).mockResolvedValue(undefined)

    ;(runAgentRoundtable as jest.Mock).mockResolvedValue({
      optimizedPrompt: 'A professional video prompt',
      shotList: [],
      hashtags: ['#video', '#ai'],
    })

    ;(validateCharacterConsistency as jest.Mock).mockReturnValue({
      qualityScore: 95,
      valid: true,
      violations: [],
      details: {},
    })
    ;(getQualityAssessment as jest.Mock).mockReturnValue('Excellent quality')
  })

  describe('Authentication', () => {
    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video about nature',
          platform: 'tiktok',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(checkRateLimit as jest.Mock).mockReturnValue({
        allowed: false,
        remaining: 0,
        retryAfter: 60,
      })

      ;(createRateLimitResponse as jest.Mock).mockReturnValue({
        error: 'Rate limit exceeded',
        retryAfter: 60,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'tiktok',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
    })
  })

  describe('Quota Enforcement', () => {
    it('returns quota error when consultations exceeded', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(enforceQuota as jest.Mock).mockResolvedValue({
        allowed: false,
        response: new Response(
          JSON.stringify({ error: 'Consultation quota exceeded' }),
          { status: 402 }
        ),
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'tiktok',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(402)
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for missing brief', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          platform: 'tiktok',
          // Missing brief
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('brief')
    })

    it('returns 400 for missing platform', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          // Missing platform
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('platform')
    })

    it('returns 400 for invalid platform', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'invalid_platform',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Successful Roundtable', () => {
    it('runs roundtable without series context', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video about ocean waves',
          platform: 'tiktok',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.optimizedPrompt).toBe('A professional video prompt')
      expect(runAgentRoundtable).toHaveBeenCalledWith(
        expect.objectContaining({
          brief: 'Create a video about ocean waves',
          platform: 'tiktok',
          userId: 'test-user-id',
        })
      )
      expect(incrementUsage).toHaveBeenCalledWith(
        mockSupabaseClient,
        'test-user-id',
        'consultations'
      )
    })

    it('runs roundtable with series context', async () => {
      const mockUser = { id: 'test-user-id' }
      const seriesId = '550e8400-e29b-41d4-a716-446655440000'
      const mockSeries = {
        visual_template: 'cinematic',
        sora_camera_style: 'handheld',
        sora_lighting_mood: 'dramatic',
        sora_color_palette: 'warm',
        sora_overall_tone: 'epic',
        sora_narrative_prefix: 'In a world where...',
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

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video about the hero',
          platform: 'youtube',
          seriesId,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(runAgentRoundtable).toHaveBeenCalledWith(
        expect.objectContaining({
          visualTemplate: 'cinematic',
          seriesSoraSettings: expect.objectContaining({
            sora_camera_style: 'handheld',
          }),
        })
      )
    })

    it('runs roundtable with episode context', async () => {
      const mockUser = { id: 'test-user-id' }
      const episodeId = '550e8400-e29b-41d4-a716-446655440001'
      const mockCompleteContext = {
        series: {
          id: 'series-id',
          visual_template: 'documentary',
          sora_camera_style: 'steady',
        },
        characters: [
          { id: 'char-1', name: 'Hero', sora_prompt_template: 'A brave hero...' },
        ],
        settings: [
          { id: 'setting-1', name: 'Forest' },
        ],
        visualAssets: [],
        soraSettings: true,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(fetchCompleteSeriesContext as jest.Mock).mockResolvedValue(mockCompleteContext)
      ;(formatSeriesContextForAgents as jest.Mock).mockReturnValue('Formatted context string')

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'tiktok',
          episodeId,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(fetchCompleteSeriesContext).toHaveBeenCalledWith(episodeId)
    })

    it('includes character consistency validation', async () => {
      const mockUser = { id: 'test-user-id' }
      const seriesId = '550e8400-e29b-41d4-a716-446655440000'
      const characterId = '550e8400-e29b-41d4-a716-446655440001'
      const mockSeries = { visual_template: 'cinematic' }
      const mockCharacters = [
        { id: characterId, name: 'Hero', sora_prompt_template: 'A brave hero...' },
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
              in: jest.fn().mockResolvedValue({
                data: mockCharacters,
                error: null,
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

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video about the hero',
          platform: 'youtube',
          seriesId,
          selectedCharacters: [characterId],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.characterConsistency).toBeDefined()
      expect(data.characterConsistency.qualityScore).toBe(95)
      expect(data.characterConsistency.qualityTier).toBe('excellent')
    })

    it('returns quality tiers based on score', async () => {
      const mockUser = { id: 'test-user-id' }
      const seriesId = '550e8400-e29b-41d4-a716-446655440000'
      const characterId = '550e8400-e29b-41d4-a716-446655440001'
      const mockCharacters = [{ id: characterId, name: 'Hero' }]

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
                  data: { visual_template: 'cinematic' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockCharacters,
                error: null,
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

      // Test "good" tier (75-89)
      ;(validateCharacterConsistency as jest.Mock).mockReturnValue({
        qualityScore: 80,
        valid: true,
        violations: [],
        details: {},
      })

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'youtube',
          seriesId,
          selectedCharacters: [characterId],
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.characterConsistency.qualityTier).toBe('good')
    })
  })

  describe('Error Handling', () => {
    it('returns 500 on orchestrator error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(runAgentRoundtable as jest.Mock).mockRejectedValue(new Error('AI service unavailable'))

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'tiktok',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('falls back to manual context when episode fetch fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const episodeId = '550e8400-e29b-41d4-a716-446655440001'

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      ;(fetchCompleteSeriesContext as jest.Mock).mockRejectedValue(new Error('Episode not found'))

      const request = createMockRequest('http://localhost:3000/api/agent/roundtable', {
        method: 'POST',
        body: {
          brief: 'Create a video',
          platform: 'tiktok',
          episodeId,
        },
      })

      const response = await POST(request)

      // Should still succeed without episode context
      expect(response.status).toBe(200)
    })
  })
})
