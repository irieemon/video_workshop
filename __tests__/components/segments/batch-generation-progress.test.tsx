/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  BatchGenerationProgress,
  BatchGenerationProgressSkeleton,
  useBatchGenerationProgress,
  type GenerationProgress,
  type GenerationStatus,
} from '@/components/segments/batch-generation-progress'
import { renderHook } from '@testing-library/react'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  RotateCcw: () => <div data-testid="retry-icon" />,
  PartyPopper: () => <div data-testid="party-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

// Mock Supabase client for hook tests
const mockSupabaseSelect = jest.fn()
const mockSupabaseEq = jest.fn()
const mockSupabaseSingle = jest.fn()
const mockSupabaseFrom = jest.fn(() => ({
  select: mockSupabaseSelect.mockReturnValue({
    eq: mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
    }),
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

describe('BatchGenerationProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering - Standard Mode
  // ============================================================================
  describe('Standard Mode Rendering', () => {
    it('renders idle state', () => {
      const progress: GenerationProgress = {
        current: 0,
        total: 5,
        status: 'idle',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Idle')).toBeInTheDocument()
      expect(screen.getByText('0 / 5')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('renders pending state', () => {
      const progress: GenerationProgress = {
        current: 0,
        total: 5,
        status: 'pending',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('renders generating state', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Generating Segments...')).toBeInTheDocument()
      expect(screen.getByText('2 / 5')).toBeInTheDocument()
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('renders complete state with party icon', () => {
      const progress: GenerationProgress = {
        current: 5,
        total: 5,
        status: 'complete',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Generation Complete!')).toBeInTheDocument()
      expect(screen.getByText('Successfully generated 5 video segments')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByTestId('party-icon')).toBeInTheDocument()
    })

    it('renders error state with error message', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
        errorMessage: 'API rate limit exceeded',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument()
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    })

    it('renders error state with default message when no errorMessage provided', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Failed at segment 3')).toBeInTheDocument()
    })

    it('renders paused state', () => {
      const progress: GenerationProgress = {
        current: 3,
        total: 5,
        status: 'paused',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Paused')).toBeInTheDocument()
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Current Segment Name Display
  // ============================================================================
  describe('Current Segment Name', () => {
    it('displays current segment name when provided', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
        currentSegmentName: 'Chapter 1: Opening Scene',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Processing:')).toBeInTheDocument()
      expect(screen.getByText('Chapter 1: Opening Scene')).toBeInTheDocument()
    })

    it('shows default processing message when no segment name', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('Processing segment 3 of 5...')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Estimated Time Remaining
  // ============================================================================
  describe('Estimated Time Remaining', () => {
    it('shows time remaining in seconds when under 60', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
        estimatedTimeRemaining: 45,
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('~45s remaining')).toBeInTheDocument()
    })

    it('shows time remaining in minutes when under 3600', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
        estimatedTimeRemaining: 180,
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('~3m remaining')).toBeInTheDocument()
    })

    it('shows time remaining in hours and minutes when over 3600', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 50,
        status: 'generating',
        estimatedTimeRemaining: 5400, // 1.5 hours
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.getByText('~2h 30m remaining')).toBeInTheDocument()
    })

    it('hides time remaining when showEstimatedTime is false', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
        estimatedTimeRemaining: 45,
      }

      render(<BatchGenerationProgress progress={progress} showEstimatedTime={false} />)

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
    })

    it('hides time remaining for non-generating states', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'paused',
        estimatedTimeRemaining: 45,
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
    })

    it('hides time remaining when estimatedTimeRemaining is 0', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
        estimatedTimeRemaining: 0,
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Action Buttons
  // ============================================================================
  describe('Action Buttons', () => {
    it('shows retry button in error state when onRetry provided', () => {
      const onRetry = jest.fn()
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
      }

      render(<BatchGenerationProgress progress={progress} onRetry={onRetry} />)

      expect(screen.getByRole('button', { name: /retry failed/i })).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const onRetry = jest.fn()
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
      }

      render(<BatchGenerationProgress progress={progress} onRetry={onRetry} />)

      await user.click(screen.getByRole('button', { name: /retry failed/i }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('shows cancel button in generating state when onCancel provided', () => {
      const onCancel = jest.fn()
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      render(<BatchGenerationProgress progress={progress} onCancel={onCancel} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const onCancel = jest.fn()
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      render(<BatchGenerationProgress progress={progress} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('hides retry button when onRetry not provided', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('hides cancel button when onCancel not provided', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      render(<BatchGenerationProgress progress={progress} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('hides action buttons in complete state', () => {
      const onRetry = jest.fn()
      const onCancel = jest.fn()
      const progress: GenerationProgress = {
        current: 5,
        total: 5,
        status: 'complete',
      }

      render(<BatchGenerationProgress progress={progress} onRetry={onRetry} onCancel={onCancel} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Compact Mode
  // ============================================================================
  describe('Compact Mode', () => {
    it('renders compact layout', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      render(<BatchGenerationProgress progress={progress} compact />)

      // Should show icon and badge but not detailed text
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.getByText('2/5')).toBeInTheDocument()
    })

    it('hides detailed text in compact mode', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
        currentSegmentName: 'Test Segment',
      }

      render(<BatchGenerationProgress progress={progress} compact />)

      expect(screen.queryByText('Processing:')).not.toBeInTheDocument()
      expect(screen.queryByText('Test Segment')).not.toBeInTheDocument()
    })

    it('hides action buttons in compact mode', () => {
      const onRetry = jest.fn()
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
      }

      render(<BatchGenerationProgress progress={progress} compact onRetry={onRetry} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Progress Animation
  // ============================================================================
  describe('Progress Animation', () => {
    it('animates progress smoothly', () => {
      const progress: GenerationProgress = {
        current: 0,
        total: 10,
        status: 'generating',
      }

      const { rerender } = render(<BatchGenerationProgress progress={progress} />)

      // Update progress
      rerender(
        <BatchGenerationProgress
          progress={{ ...progress, current: 5 }}
        />
      )

      // Advance timers to allow animation
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Progress bar should exist (animation handled internally)
      const progressBar = document.querySelector('[role="progressbar"]')
      expect(progressBar).toBeInTheDocument()
    })

    it('handles zero total gracefully', () => {
      const progress: GenerationProgress = {
        current: 0,
        total: 0,
        status: 'idle',
      }

      render(<BatchGenerationProgress progress={progress} />)

      // Should not crash with division by zero
      expect(screen.getByText('0 / 0')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Custom className
  // ============================================================================
  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'generating',
      }

      const { container } = render(
        <BatchGenerationProgress progress={progress} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('applies error styling in error state', () => {
      const progress: GenerationProgress = {
        current: 2,
        total: 5,
        status: 'error',
      }

      const { container } = render(<BatchGenerationProgress progress={progress} />)

      expect(container.firstChild).toHaveClass('border-red-200')
    })

    it('applies success styling in complete state', () => {
      const progress: GenerationProgress = {
        current: 5,
        total: 5,
        status: 'complete',
      }

      const { container } = render(<BatchGenerationProgress progress={progress} />)

      expect(container.firstChild).toHaveClass('border-green-200')
    })
  })
})

// ============================================================================
// BatchGenerationProgressSkeleton Tests
// ============================================================================
describe('BatchGenerationProgressSkeleton', () => {
  it('renders standard skeleton', () => {
    const { container } = render(<BatchGenerationProgressSkeleton />)

    // Should have skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders compact skeleton', () => {
    render(<BatchGenerationProgressSkeleton compact />)

    // Compact skeleton should have flex layout
    const container = document.querySelector('.flex.items-center.gap-3')
    expect(container).toBeInTheDocument()
  })
})

// ============================================================================
// useBatchGenerationProgress Hook Tests
// ============================================================================
describe('useBatchGenerationProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Reset all mocks to ensure clean state
    mockSupabaseFrom.mockClear()
    mockSupabaseSelect.mockClear()
    mockSupabaseEq.mockClear()
    mockSupabaseSingle.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns idle progress when no segmentGroupId', () => {
    const { result } = renderHook(() => useBatchGenerationProgress(null, true))

    expect(result.current.progress).toEqual({
      current: 0,
      total: 0,
      status: 'idle',
    })
  })

  it('returns idle progress when isActive is false', () => {
    const { result } = renderHook(() => useBatchGenerationProgress('segment-123', false))

    expect(result.current.progress).toEqual({
      current: 0,
      total: 0,
      status: 'idle',
    })
  })

  it('fetches progress when active with segmentGroupId', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        status: 'generating',
        completed_segments: 3,
        total_segments: 10,
      },
      error: null,
    })

    const { result } = renderHook(() => useBatchGenerationProgress('segment-123', true))

    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    await waitFor(() => {
      expect(result.current.progress.current).toBe(3)
      expect(result.current.progress.total).toBe(10)
      expect(result.current.progress.status).toBe('generating')
    })
  })

  it('calculates estimated time remaining', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        status: 'generating',
        completed_segments: 5,
        total_segments: 10,
      },
      error: null,
    })

    const { result } = renderHook(() => useBatchGenerationProgress('segment-123', true))

    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    await waitFor(() => {
      // (10 - 5) * 45 = 225 seconds
      expect(result.current.progress.estimatedTimeRemaining).toBe(225)
    })
  })

  it('polls for updates at specified interval', async () => {
    // Use mockResolvedValue to handle multiple calls
    mockSupabaseSingle.mockResolvedValue({
      data: {
        status: 'generating',
        completed_segments: 3,
        total_segments: 10,
      },
      error: null,
    })

    renderHook(() => useBatchGenerationProgress('segment-123', true, 1000))

    // Initial fetch
    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    const initialCallCount = mockSupabaseFrom.mock.calls.length

    // Advance by poll interval
    await act(async () => {
      jest.advanceTimersByTime(1000)
      await jest.runOnlyPendingTimersAsync()
    })

    // Should have made at least one additional call
    expect(mockSupabaseFrom.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock to throw error
    mockSupabaseSingle.mockRejectedValueOnce(new Error('Database error'))

    const { result } = renderHook(() => useBatchGenerationProgress('segment-123', true))

    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    // Should remain at initial state on error
    expect(result.current.progress.status).toBe('idle')
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('provides refetch function', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: {
        status: 'generating',
        completed_segments: 3,
        total_segments: 10,
      },
      error: null,
    })

    const { result } = renderHook(() => useBatchGenerationProgress('segment-123', true))

    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    const callCountBefore = mockSupabaseFrom.mock.calls.length

    // Call refetch manually
    await act(async () => {
      await result.current.refetch()
    })

    expect(mockSupabaseFrom.mock.calls.length).toBeGreaterThan(callCountBefore)
  })

  it('cleans up interval on unmount', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: {
        status: 'generating',
        completed_segments: 3,
        total_segments: 10,
      },
      error: null,
    })

    const { unmount } = renderHook(() => useBatchGenerationProgress('segment-123', true, 1000))

    // Allow initial fetch
    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    unmount()

    // Record call count after unmount
    const callCountAfterUnmount = mockSupabaseFrom.mock.calls.length

    // Advance time - should not make additional calls
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    // Call count should not increase after unmount
    expect(mockSupabaseFrom.mock.calls.length).toBe(callCountAfterUnmount)
  })

  it('handles null data fields gracefully', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        status: 'pending',
        completed_segments: null,
        total_segments: null,
      },
      error: null,
    })

    const { result } = renderHook(() => useBatchGenerationProgress('segment-123', true))

    await act(async () => {
      await jest.runOnlyPendingTimersAsync()
    })

    await waitFor(() => {
      expect(result.current.progress.current).toBe(0)
      expect(result.current.progress.total).toBe(0)
      expect(result.current.progress.status).toBe('pending')
    })
  })
})
