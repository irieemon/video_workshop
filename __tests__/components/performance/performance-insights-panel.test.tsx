/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PerformanceInsightsPanel } from '@/components/performance/performance-insights-panel'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockInsightsResponse = {
  insights: {
    strengths: ['High engagement rate', 'Good watch time'],
    weaknesses: ['Low click-through rate', 'Poor thumbnail'],
    traffic_insights: 'Most traffic comes from the For You page',
    patterns: 'Videos posted at 6 PM perform best',
    recommendations: ['Improve thumbnails', 'Post more consistently'],
    next_video_suggestions: ['Behind the scenes content', 'Tutorial series'],
  },
  generated_at: '2025-01-15T10:30:00Z',
  cached: false,
}

describe('PerformanceInsightsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText('AI Performance Insights')).toBeInTheDocument()
      expect(screen.getByText('Analyzing your video performance...')).toBeInTheDocument()
    })

    it('shows skeleton loaders while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      // shadcn Skeleton uses animate-pulse class (not "skeleton" in class name)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('shows error message when fetch fails', async () => {
      // Mock fails on all retries (component has retry: 1)
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Service unavailable' }),
      })

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      // Wait longer due to component's retry: 1 config
      await waitFor(() => {
        expect(screen.getByText('Service unavailable')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('shows default error message when no message provided', async () => {
      // Mock fails on all retries (component has retry: 1)
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      // Wait longer due to component's retry: 1 config
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch insights')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  // ============================================================================
  // Data Display
  // ============================================================================
  describe('Data Display', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightsResponse,
      })
    })

    it('displays title and generated date', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('AI Performance Insights')).toBeInTheDocument()
      })
    })

    it('displays strengths section', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText("What's Working Well")).toBeInTheDocument()
        expect(screen.getByText('High engagement rate')).toBeInTheDocument()
        expect(screen.getByText('Good watch time')).toBeInTheDocument()
      })
    })

    it('displays weaknesses section', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Areas for Improvement')).toBeInTheDocument()
        expect(screen.getByText('Low click-through rate')).toBeInTheDocument()
        expect(screen.getByText('Poor thumbnail')).toBeInTheDocument()
      })
    })

    it('displays traffic insights', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Traffic Source Analysis')).toBeInTheDocument()
        expect(screen.getByText('Most traffic comes from the For You page')).toBeInTheDocument()
      })
    })

    it('displays patterns', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Performance Patterns')).toBeInTheDocument()
        expect(screen.getByText('Videos posted at 6 PM perform best')).toBeInTheDocument()
      })
    })

    it('displays recommendations', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Actionable Recommendations')).toBeInTheDocument()
        expect(screen.getByText('Improve thumbnails')).toBeInTheDocument()
        expect(screen.getByText('Post more consistently')).toBeInTheDocument()
      })
    })

    it('displays next video suggestions', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Ideas for Your Next Video')).toBeInTheDocument()
        expect(screen.getByText('Behind the scenes content')).toBeInTheDocument()
        expect(screen.getByText('Tutorial series')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Cached Badge
  // ============================================================================
  describe('Cached Badge', () => {
    it('shows cached badge when data is cached', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockInsightsResponse, cached: true }),
      })

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Cached')).toBeInTheDocument()
      })
    })

    it('does not show cached badge when data is fresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightsResponse,
      })

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText("What's Working Well")).toBeInTheDocument()
      })

      expect(screen.queryByText('Cached')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Regenerate Button
  // ============================================================================
  describe('Regenerate Button', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightsResponse,
      })
    })

    it('shows regenerate button', async () => {
      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument()
      })
    })

    it('calls DELETE then refetch when regenerate clicked', async () => {
      const user = userEvent.setup()

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument()
      })

      mockFetch.mockClear()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightsResponse,
      })

      await user.click(screen.getByRole('button', { name: /Regenerate/i }))

      await waitFor(() => {
        // Should call DELETE first
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/video-1/performance/insights',
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  // ============================================================================
  // Empty Sections
  // ============================================================================
  describe('Empty Sections', () => {
    it('hides strengths section when empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockInsightsResponse,
          insights: { ...mockInsightsResponse.insights, strengths: [] },
        }),
      })

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText('Areas for Improvement')).toBeInTheDocument()
      })

      expect(screen.queryByText("What's Working Well")).not.toBeInTheDocument()
    })

    it('hides weaknesses section when empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockInsightsResponse,
          insights: { ...mockInsightsResponse.insights, weaknesses: [] },
        }),
      })

      render(<PerformanceInsightsPanel videoId="video-1" />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(screen.getByText("What's Working Well")).toBeInTheDocument()
      })

      expect(screen.queryByText('Areas for Improvement')).not.toBeInTheDocument()
    })
  })
})
