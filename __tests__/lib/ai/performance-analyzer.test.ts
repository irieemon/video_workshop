/**
 * Tests for Performance Analyzer
 *
 * Tests the AI-powered video performance analysis functionality.
 */

// Use a shared mock reference that can be set after import
let mockCreate: jest.Mock

// Mock OpenAI - use a getter to access mockCreate lazily
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          get create() {
            return mockCreate
          },
        },
      },
    })),
  }
})

import {
  analyzePerformance,
  getInsightsCacheKey,
  shouldRegenerateInsights,
  PerformanceInsights,
} from '@/lib/ai/performance-analyzer'

describe('Performance Analyzer', () => {
  // Helper to create mock performance metric
  function createMockMetric(overrides: Partial<{
    id: string
    platform: 'tiktok' | 'instagram'
    views: number
    likes: number
    comments: number
    shares: number
    saves: number
    watch_time_seconds: number | null
    completion_rate: number | null
    traffic_source: 'fyp' | 'profile' | 'hashtag' | 'share' | 'other' | null
    recorded_at: string
  }> = {}) {
    return {
      id: 'metric-1',
      platform: 'tiktok' as const,
      views: 1000,
      likes: 100,
      comments: 10,
      shares: 5,
      saves: 20,
      watch_time_seconds: 45,
      completion_rate: 75.5,
      traffic_source: 'fyp' as const,
      recorded_at: new Date().toISOString(),
      ...overrides,
    }
  }

  // Helper to create mock video data
  function createMockVideoData(overrides: Partial<{
    title: string
    optimized_prompt: string
    sora_duration: number
    hashtags: string[]
  }> = {}) {
    return {
      title: 'My Video',
      optimized_prompt: 'A beautiful sunset over the ocean',
      sora_duration: 10,
      hashtags: ['viral', 'fyp'],
      ...overrides,
    }
  }

  // Helper to create mock AI response
  function createMockInsightsResponse(): PerformanceInsights {
    return {
      strengths: ['High engagement rate', 'Strong FYP performance'],
      weaknesses: ['Lower completion rate than average'],
      traffic_insights: 'Most traffic comes from FYP',
      patterns: 'Views growing steadily over time',
      recommendations: ['Post during peak hours', 'Use trending sounds'],
      next_video_suggestions: ['Create more sunset content', 'Try shorter format'],
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Initialize mock for each test
    mockCreate = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(createMockInsightsResponse()),
          },
        },
      ],
    })
  })

  describe('analyzePerformance', () => {
    describe('Basic Analysis', () => {
      it('returns insights with generated_at timestamp', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        const result = await analyzePerformance(videoData, metrics)

        expect(result.insights).toBeDefined()
        expect(result.generated_at).toBeDefined()
        expect(new Date(result.generated_at).getTime()).toBeLessThanOrEqual(Date.now())
      })

      it('returns all required insight fields', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        const result = await analyzePerformance(videoData, metrics)

        expect(result.insights.strengths).toBeDefined()
        expect(result.insights.weaknesses).toBeDefined()
        expect(result.insights.traffic_insights).toBeDefined()
        expect(result.insights.patterns).toBeDefined()
        expect(result.insights.recommendations).toBeDefined()
        expect(result.insights.next_video_suggestions).toBeDefined()
      })

      it('calls OpenAI with correct model', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4-turbo-preview',
            response_format: { type: 'json_object' },
          })
        )
      })

      it('includes video title in prompt', async () => {
        const videoData = createMockVideoData({ title: 'Sunset Adventure' })
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Sunset Adventure')
      })

      it('includes optimized prompt in analysis', async () => {
        const videoData = createMockVideoData({ optimized_prompt: 'Golden hour beach scene' })
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Golden hour beach scene')
      })
    })

    describe('Metrics Processing', () => {
      it('calculates total views across metrics', async () => {
        const videoData = createMockVideoData()
        const metrics = [
          createMockMetric({ views: 500 }),
          createMockMetric({ id: 'metric-2', views: 700 }),
        ]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('1,200') // 500 + 700
      })

      it('calculates engagement rate correctly', async () => {
        const videoData = createMockVideoData()
        const metrics = [
          createMockMetric({ views: 1000, likes: 100, comments: 50, shares: 50 }),
        ]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        // (100 + 50 + 50) / 1000 * 100 = 20%
        expect(callArgs.messages[1].content).toContain('20.00%')
      })

      it('sorts metrics by date', async () => {
        const videoData = createMockVideoData()
        const metrics = [
          createMockMetric({ id: 'late', recorded_at: '2024-01-15T00:00:00Z' }),
          createMockMetric({ id: 'early', recorded_at: '2024-01-10T00:00:00Z' }),
        ]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        const content = callArgs.messages[1].content

        // Use more flexible date matching since toLocaleDateString varies by environment
        // Look for the dates in different formats (could be 1/10/2024 or 2024-01-10 etc)
        const earlyDate = new Date('2024-01-10T00:00:00Z').toLocaleDateString()
        const lateDate = new Date('2024-01-15T00:00:00Z').toLocaleDateString()

        const earlyIndex = content.indexOf(earlyDate)
        const lateIndex = content.indexOf(lateDate)

        expect(earlyIndex).toBeGreaterThan(-1)
        expect(lateIndex).toBeGreaterThan(-1)
        expect(earlyIndex).toBeLessThan(lateIndex)
      })

      it('includes completion rate when available', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ completion_rate: 85.5 })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Completion Rate: 85.5%')
      })

      it('excludes completion rate when null', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ completion_rate: null })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).not.toContain('Completion Rate:')
      })

      it('includes traffic source when available', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ traffic_source: 'fyp' })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Traffic Source: fyp')
      })

      it('excludes traffic source when null', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ traffic_source: null })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).not.toContain('Traffic Source:')
      })
    })

    describe('Video Data Handling', () => {
      it('includes duration when provided', async () => {
        const videoData = createMockVideoData({ sora_duration: 15 })
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Duration: 15s')
      })

      it('excludes duration when not provided', async () => {
        const videoData = createMockVideoData({ sora_duration: undefined })
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).not.toContain('Duration:')
      })

      it('includes hashtags when provided', async () => {
        const videoData = createMockVideoData({ hashtags: ['fyp', 'viral', 'trending'] })
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('fyp, viral, trending')
      })

      it('excludes hashtags when empty', async () => {
        const videoData = createMockVideoData({ hashtags: [] })
        const metrics = [createMockMetric()]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).not.toContain('Hashtags:')
      })
    })

    describe('Platform Handling', () => {
      it('formats TikTok platform name correctly', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ platform: 'tiktok' })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Platform: TikTok')
      })

      it('formats Instagram platform name correctly', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ platform: 'instagram' })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('Platform: Instagram')
      })
    })

    describe('Error Handling', () => {
      it('throws error for empty metrics array', async () => {
        const videoData = createMockVideoData()

        await expect(analyzePerformance(videoData, [])).rejects.toThrow(
          'No performance metrics to analyze'
        )
      })

      it('throws error when AI returns no content', async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: null } }],
        })

        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        await expect(analyzePerformance(videoData, metrics)).rejects.toThrow(
          'No response from AI'
        )
      })

      it('throws error for invalid insights structure', async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ invalid: 'structure' }) } }],
        })

        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        await expect(analyzePerformance(videoData, metrics)).rejects.toThrow(
          'Invalid insights structure returned from AI'
        )
      })

      it('throws user-friendly error for API errors', async () => {
        mockCreate.mockRejectedValue(new Error('OpenAI API error'))

        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        await expect(analyzePerformance(videoData, metrics)).rejects.toThrow(
          'AI service temporarily unavailable'
        )
      })

      it('handles invalid JSON response', async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: 'invalid json' } }],
        })

        const videoData = createMockVideoData()
        const metrics = [createMockMetric()]

        await expect(analyzePerformance(videoData, metrics)).rejects.toThrow()
      })
    })

    describe('Edge Cases', () => {
      it('handles zero views correctly', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ views: 0, likes: 0, comments: 0, shares: 0 })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        // Should show 0.00% engagement rate, not NaN
        expect(callArgs.messages[1].content).toContain('0.00%')
      })

      it('handles large numbers correctly', async () => {
        const videoData = createMockVideoData()
        const metrics = [createMockMetric({ views: 1000000, likes: 50000 })]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('1,000,000')
      })

      it('handles multiple metrics across platforms', async () => {
        const videoData = createMockVideoData()
        const metrics = [
          createMockMetric({ id: 'm1', platform: 'tiktok', views: 1000 }),
          createMockMetric({ id: 'm2', platform: 'instagram', views: 500 }),
        ]

        await analyzePerformance(videoData, metrics)

        const callArgs = mockCreate.mock.calls[0][0]
        expect(callArgs.messages[1].content).toContain('TikTok')
        expect(callArgs.messages[1].content).toContain('Instagram')
      })
    })
  })

  describe('getInsightsCacheKey', () => {
    it('generates cache key with video ID', () => {
      const key = getInsightsCacheKey('video-123')

      expect(key).toBe('performance-insights:video-123')
    })

    it('handles special characters in video ID', () => {
      const key = getInsightsCacheKey('video-with-dashes-123')

      expect(key).toBe('performance-insights:video-with-dashes-123')
    })

    it('handles empty video ID', () => {
      const key = getInsightsCacheKey('')

      expect(key).toBe('performance-insights:')
    })
  })

  describe('shouldRegenerateInsights', () => {
    it('returns false for recently generated insights', () => {
      const now = new Date()
      const result = shouldRegenerateInsights(now.toISOString())

      expect(result).toBe(false)
    })

    it('returns true for insights older than 24 hours', () => {
      const old = new Date()
      old.setHours(old.getHours() - 25)
      const result = shouldRegenerateInsights(old.toISOString())

      expect(result).toBe(true)
    })

    it('returns false for insights exactly 23 hours old', () => {
      const old = new Date()
      old.setHours(old.getHours() - 23)
      const result = shouldRegenerateInsights(old.toISOString())

      expect(result).toBe(false)
    })

    it('returns true for insights exactly 24 hours old', () => {
      const old = new Date()
      old.setHours(old.getHours() - 24)
      const result = shouldRegenerateInsights(old.toISOString())

      expect(result).toBe(true)
    })

    it('returns true for very old insights', () => {
      const veryOld = new Date('2020-01-01T00:00:00Z')
      const result = shouldRegenerateInsights(veryOld.toISOString())

      expect(result).toBe(true)
    })
  })
})
