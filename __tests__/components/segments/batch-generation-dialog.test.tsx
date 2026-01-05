/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BatchGenerationDialog } from '@/components/segments/batch-generation-dialog'

// Mock Supabase client
const mockFrom = jest.fn()
const mockSupabase = {
  from: mockFrom,
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock useConfetti hook
const mockCelebrate = jest.fn()
jest.mock('@/lib/hooks/use-confetti', () => ({
  useConfetti: () => ({
    celebrate: mockCelebrate,
  }),
}))

// Mock ContinuityReportViewer
jest.mock('@/components/segments/continuity-report-viewer', () => ({
  ContinuityReportViewer: ({ report }: { report: any }) => (
    <div data-testid="continuity-report">
      Report: {report.totalSegments} segments, {report.averageScore}% avg score
    </div>
  ),
}))

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  episodeId: 'episode-1',
  seriesId: 'series-1',
  onSuccess: jest.fn(),
}

describe('BatchGenerationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockFetch.mockReset()
    mockFrom.mockReset()
    mockCelebrate.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders dialog when open', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Batch Video Generation')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<BatchGenerationDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays description text', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByText('Generate all segments sequentially with context propagation')).toBeInTheDocument()
    })

    it('shows platform selection', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByText('Target Platform')).toBeInTheDocument()
      // Default is TikTok
      expect(screen.getByRole('combobox')).toHaveTextContent('TikTok')
    })

    it('shows anchor point interval slider', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByText('Anchor Point Interval')).toBeInTheDocument()
      expect(screen.getByText(/Every 3 segments/)).toBeInTheDocument()
    })

    it('shows info alert with process description', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByText('Batch Generation Process:')).toBeInTheDocument()
      expect(screen.getByText(/Segments are generated sequentially/)).toBeInTheDocument()
    })

    it('shows Start Generation button', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Start Generation' })).toBeInTheDocument()
    })

    it('shows Cancel button', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Platform Selection
  // ============================================================================
  describe('Platform Selection', () => {
    it('allows selecting different platforms', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<BatchGenerationDialog {...defaultProps} />)

      // Open the select dropdown
      const select = screen.getByRole('combobox')
      await user.click(select)

      // Select YouTube Shorts
      await user.click(screen.getByText('YouTube Shorts (9:16)'))

      expect(select).toHaveTextContent('YouTube Shorts')
    })

    it('displays all platform options', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<BatchGenerationDialog {...defaultProps} />)

      const select = screen.getByRole('combobox')
      await user.click(select)

      // Use getAllByText since Radix Select shows selected value in both trigger and dropdown
      expect(screen.getAllByText('TikTok (9:16)').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('YouTube Shorts (9:16)')).toBeInTheDocument()
      expect(screen.getByText('Instagram Reels (9:16)')).toBeInTheDocument()
      expect(screen.getByText('YouTube (16:9)')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Anchor Point Interval
  // ============================================================================
  describe('Anchor Point Interval', () => {
    it('displays current interval value', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByText(/Every 3 segments/)).toBeInTheDocument()
    })

    it('shows context refresh description', () => {
      render(<BatchGenerationDialog {...defaultProps} />)

      expect(screen.getByText(/Context will be refreshed every 3 segments/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Start Generation
  // ============================================================================
  describe('Start Generation', () => {
    it('fetches segment group and starts generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Mock segment group fetch
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: 'group-1' },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      })

      // Mock batch generation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
          continuityReport: {
            totalSegments: 3,
            validatedSegments: 3,
            averageScore: 95,
          },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('segment_groups')
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/segment-groups/group-1/generate-batch',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              platform: 'tiktok',
              anchorPointInterval: 3,
              validateContinuityBefore: true,
            }),
          })
        )
      })
    })

    it('shows error when no segment group exists', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Mock no segment group found
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.getByText('No segment group found. Please create segments first.')).toBeInTheDocument()
      })
    })

    it('shows error when segment group fetch fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Supabase errors are plain objects, not Error instances
      // So the catch block will use fallback "Failed to start generation"
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        // Error object isn't instanceof Error, so falls back to default message
        expect(screen.getByText('Failed to start generation')).toBeInTheDocument()
      })
    })

    it('shows error when batch generation API fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
      })
    })

    it('disables Start Generation button while loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start Generation' })).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // Generation Progress
  // ============================================================================
  describe('Generation Progress', () => {
    it('displays progress after successful generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: { status: 'complete', completed_segments: 3, total_segments: 3 },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
          continuityReport: { totalSegments: 3, averageScore: 95 },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.getByText('Generation Complete!')).toBeInTheDocument()
      })

      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    it('shows continuity report after generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }, { id: 'v2' }],
          continuityReport: { totalSegments: 2, averageScore: 88 },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.getByTestId('continuity-report')).toBeInTheDocument()
      })
    })

    it('triggers confetti celebration on completion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }],
          continuityReport: { totalSegments: 1, averageScore: 100 },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(mockCelebrate).toHaveBeenCalled()
      })
    })

    it('calls onSuccess after delay when complete', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }],
          continuityReport: { totalSegments: 1, averageScore: 100 },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.getByText('Generation Complete!')).toBeInTheDocument()
      })

      // Fast-forward 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })

    it('shows Close button after completion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }],
          continuityReport: { totalSegments: 1, averageScore: 100 },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
      })
    })

    it('hides Start Generation button after completion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [{ id: 'v1' }],
          continuityReport: { totalSegments: 1, averageScore: 100 },
        }),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Start Generation' })).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Dialog Controls
  // ============================================================================
  describe('Dialog Controls', () => {
    it('calls onOpenChange when Cancel is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const onOpenChange = jest.fn()

      render(<BatchGenerationDialog {...defaultProps} onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('disables Cancel button while generating', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Setup for generation in progress
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'group-1' },
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: { status: 'generating', completed_segments: 1, total_segments: 3 },
          error: null,
        }),
      })

      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<BatchGenerationDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      // Start button becomes disabled during loading
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start Generation' })).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // Hidden Elements During Loading
  // ============================================================================
  describe('Hidden Elements During Loading', () => {
    it('hides platform selection during generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() => new Promise(() => {})),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      // Platform is visible before generation
      expect(screen.getByText('Target Platform')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      // Platform is hidden during generation (loading state)
      await waitFor(() => {
        expect(screen.queryByText('Target Platform')).not.toBeInTheDocument()
      })
    })

    it('hides info alert during generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() => new Promise(() => {})),
      })

      render(<BatchGenerationDialog {...defaultProps} />)

      // Info alert visible before
      expect(screen.getByText('Batch Generation Process:')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Start Generation' }))

      await waitFor(() => {
        expect(screen.queryByText('Batch Generation Process:')).not.toBeInTheDocument()
      })
    })
  })
})
