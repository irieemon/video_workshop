/**
 * Video Roundtable Client Tests
 *
 * Tests for components/videos/video-roundtable-client.tsx
 * This component handles AI generation, streaming responses, and video state management.
 *
 * Key features tested:
 * - Rendering states (initial, loading, error, success)
 * - Auto-trigger AI generation on mount
 * - Streaming response parsing
 * - Video update API calls
 * - User interactions (retry, continue)
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { VideoRoundtableClient } from '@/components/videos/video-roundtable-client'

// Mock next/navigation
const mockRefresh = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: mockPush,
  }),
}))

// Mock child components to simplify testing
jest.mock('@/components/agents/agent-roundtable', () => ({
  AgentRoundtable: ({ discussion }: { discussion: any }) => (
    <div data-testid="agent-roundtable">{JSON.stringify(discussion)}</div>
  ),
}))

jest.mock('@/components/videos/prompt-output', () => ({
  PromptOutput: () => <div data-testid="prompt-output">Prompt Output</div>,
}))

jest.mock('@/components/videos/sora-generation-button', () => ({
  SoraGenerationButton: () => <div data-testid="sora-generation-button">Generate</div>,
}))

jest.mock('@/components/performance/performance-metrics-section', () => ({
  PerformanceMetricsSection: () => <div data-testid="performance-metrics">Metrics</div>,
}))

jest.mock('@/components/ui/step-indicator', () => ({
  StepIndicator: () => <div data-testid="step-indicator">Steps</div>,
}))

// ============================================================================
// Test Helpers
// ============================================================================

function createMockVideo(overrides: Partial<any> = {}) {
  return {
    id: 'video-123',
    title: 'Test Video',
    platform: 'TikTok',
    user_brief: 'A beautiful sunset scene',
    created_at: new Date().toISOString(),
    series_id: 'series-456',
    series: { name: 'Test Series', is_system: false },
    ...overrides,
  }
}

function createMockAgentDiscussion() {
  return {
    round1: [
      { agent: 'director', response: 'Director thoughts' },
      { agent: 'cinematographer', response: 'Cinematographer insights' },
    ],
    round2: [
      { agent: 'director', response: 'Challenge', isChallenge: true },
    ],
  }
}

function createStreamingResponse(events: Array<{ type: string; data: any }>) {
  const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  const encoder = new TextEncoder()
  const data = encoder.encode(lines)

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })

  return {
    ok: true,
    body: stream,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('VideoRoundtableClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Prevent auto-trigger from causing issues by default
    global.fetch = jest.fn()
  })

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('Rendering', () => {
    it('renders video title and platform', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('Test Video')).toBeInTheDocument()
      expect(screen.getByText('TikTok')).toBeInTheDocument()
    })

    it('renders user brief', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('A beautiful sunset scene')).toBeInTheDocument()
    })

    it('renders series badge when video has non-system series', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('Series: Test Series')).toBeInTheDocument()
    })

    it('hides series badge for system series', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        series: { name: 'System', is_system: true },
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.queryByText('Series: System')).not.toBeInTheDocument()
    })

    it('renders back button with correct link', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      const backLink = screen.getByRole('link', { name: /back/i })
      expect(backLink).toHaveAttribute('href', '/dashboard/videos')
    })

    it('renders step indicator', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Agent Discussion Tests
  // ==========================================================================
  describe('Agent Discussion', () => {
    it('renders agent roundtable when discussion exists', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByTestId('agent-roundtable')).toBeInTheDocument()
    })

    it('does not render agent roundtable when discussion is null', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      // Mock fetch to prevent auto-trigger
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Error'),
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      // It will be generating, but no roundtable
      expect(screen.queryByTestId('agent-roundtable')).not.toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Success State Tests
  // ==========================================================================
  describe('Success State', () => {
    it('renders continue button when optimized_prompt exists', () => {
      const video = createMockVideo({ optimized_prompt: 'Optimized test prompt' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      const continueLink = screen.getAllByRole('link', { name: /continue/i })[0]
      expect(continueLink).toHaveAttribute('href', '/dashboard/videos/video-123/ready')
    })

    it('renders AI complete message when discussion and prompt exist', () => {
      const video = createMockVideo({ optimized_prompt: 'Optimized test prompt' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('AI Analysis Complete!')).toBeInTheDocument()
    })

    it('renders prompt output when optimized_prompt and detailed_breakdown exist', () => {
      const video = createMockVideo({
        optimized_prompt: 'Test prompt',
        detailed_breakdown: { format: '4K' },
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={['#test']}
        />
      )

      expect(screen.getByTestId('prompt-output')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Generated Video Tests
  // ==========================================================================
  describe('Generated Video Display', () => {
    it('renders video player when sora_video_url exists and status is completed', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        sora_video_url: 'https://example.com/video.mp4',
        sora_generation_status: 'completed',
        sora_completed_at: new Date().toISOString(),
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('Generated Video')).toBeInTheDocument()
      const videoElement = document.querySelector('video')
      expect(videoElement).toHaveAttribute('src', 'https://example.com/video.mp4')
    })

    it('renders generation cost when available', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        sora_video_url: 'https://example.com/video.mp4',
        sora_generation_status: 'completed',
        sora_completed_at: new Date().toISOString(),
        sora_generation_cost: 0.15,
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('Cost: $0.15')).toBeInTheDocument()
    })

    it('renders performance metrics when video is completed', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        sora_video_url: 'https://example.com/video.mp4',
        sora_generation_status: 'completed',
        sora_completed_at: new Date().toISOString(),
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Generation Status Tests
  // ==========================================================================
  describe('Generation Status', () => {
    it('shows queued status badge', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        sora_generation_status: 'queued',
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('queued')).toBeInTheDocument()
      expect(screen.getByText(/being generated/i)).toBeInTheDocument()
    })

    it('shows in_progress status badge', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        sora_generation_status: 'in_progress',
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('in_progress')).toBeInTheDocument()
    })

    it('shows failed status with error message', () => {
      const video = createMockVideo({
        optimized_prompt: 'test',
        sora_generation_status: 'failed',
        sora_error_message: 'Insufficient credits',
      })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(screen.getByText('failed')).toBeInTheDocument()
      expect(screen.getByText('Insufficient credits')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Auto-Trigger Tests
  // ==========================================================================
  describe('Auto-Trigger AI Generation', () => {
    it('automatically triggers AI generation when no discussion exists', async () => {
      const video = createMockVideo()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Error'),
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/agent/roundtable/stream',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })

    it('does not auto-trigger when discussion already exists', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={discussion}
          hashtagsArray={[]}
        />
      )

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================
  describe('Loading State', () => {
    it('shows loading indicator during AI generation', async () => {
      const video = createMockVideo()
      // Never resolve the fetch to keep loading state
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('AI Film Crew Collaborating')).toBeInTheDocument()
      })
    })

    it('shows analyzing message during loading', async () => {
      const video = createMockVideo()
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/AI agents are analyzing/i)).toBeInTheDocument()
      })
    })
  })

  // ==========================================================================
  // Error State Tests
  // ==========================================================================
  describe('Error State', () => {
    it('shows error message when generation fails', async () => {
      const video = createMockVideo()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API Error'),
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      const video = createMockVideo()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API Error'),
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('retries generation when retry button clicked', async () => {
      const video = createMockVideo()
      let fetchCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        fetchCount++
        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve('API Error'),
        })
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      // Wait for initial auto-trigger error
      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })

      // Reset count to track retry
      fetchCount = 0

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(fetchCount).toBe(1) // Retry was called
      })
    })

    it('shows error message from response', async () => {
      const video = createMockVideo()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Custom error message'),
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument()
      })
    })
  })

  // ==========================================================================
  // Streaming Response Tests
  // ==========================================================================
  describe('Streaming Response Processing', () => {
    it('processes message_complete events', async () => {
      const video = createMockVideo()
      const streamResponse = createStreamingResponse([
        {
          type: 'message_complete',
          data: {
            agent: 'director',
            conversationalResponse: 'Director insight',
            isRound2: false,
          },
        },
        {
          type: 'synthesis_complete',
          data: {
            optimizedPrompt: 'Final prompt',
            characterCount: 100,
          },
        },
      ])

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(streamResponse)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        // Should have called update API
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/videos/${video.id}`,
          expect.objectContaining({
            method: 'PATCH',
          })
        )
      })
    })

    it('handles no response body gracefully', async () => {
      const video = createMockVideo()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: null,
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })
    })

    it('calls router.refresh after successful generation', async () => {
      const video = createMockVideo()
      const streamResponse = createStreamingResponse([
        {
          type: 'synthesis_complete',
          data: { optimizedPrompt: 'Test', characterCount: 4 },
        },
      ])

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(streamResponse)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // API Call Tests
  // ==========================================================================
  describe('API Calls', () => {
    it('sends correct data to streaming API', async () => {
      const video = createMockVideo({
        series_characters_used: ['char-1'],
        series_settings_used: ['setting-1'],
      })
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Error'),
      })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/agent/roundtable/stream',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brief: 'A beautiful sunset scene',
              platform: 'TikTok',
              seriesId: 'series-456',
              selectedCharacters: ['char-1'],
              selectedSettings: ['setting-1'],
            }),
          })
        )
      })
    })

    it('updates video with generated content', async () => {
      const video = createMockVideo()
      const streamResponse = createStreamingResponse([
        {
          type: 'synthesis_complete',
          data: { optimizedPrompt: 'Optimized', characterCount: 9 },
        },
        {
          type: 'breakdown_complete',
          data: { breakdown: { hashtags: ['#test'] } },
        },
      ])

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(streamResponse)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/videos/${video.id}`,
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"optimized_prompt":"Optimized"'),
          })
        )
      })
    })

    it('handles update API failure', async () => {
      const video = createMockVideo()
      const streamResponse = createStreamingResponse([
        {
          type: 'synthesis_complete',
          data: { optimizedPrompt: 'Test', characterCount: 4 },
        },
      ])

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(streamResponse)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        })

      render(
        <VideoRoundtableClient
          video={video}
          agentDiscussion={null}
          hashtagsArray={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })
    })
  })

  // ==========================================================================
  // Subscription Tier Tests
  // ==========================================================================
  describe('Subscription Tier', () => {
    it('accepts free subscription tier', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      expect(() => {
        render(
          <VideoRoundtableClient
            video={video}
            agentDiscussion={discussion}
            hashtagsArray={[]}
            subscriptionTier="free"
          />
        )
      }).not.toThrow()
    })

    it('accepts premium subscription tier', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      expect(() => {
        render(
          <VideoRoundtableClient
            video={video}
            agentDiscussion={discussion}
            hashtagsArray={[]}
            subscriptionTier="premium"
          />
        )
      }).not.toThrow()
    })

    it('accepts enterprise subscription tier', () => {
      const video = createMockVideo({ optimized_prompt: 'test' })
      const discussion = createMockAgentDiscussion()

      expect(() => {
        render(
          <VideoRoundtableClient
            video={video}
            agentDiscussion={discussion}
            hashtagsArray={[]}
            subscriptionTier="enterprise"
          />
        )
      }).not.toThrow()
    })
  })
})
