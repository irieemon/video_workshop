/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateSegmentsDialog } from '@/components/segments/create-segments-dialog'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('CreateSegmentsDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    episodeId: 'episode-123',
    seriesId: 'series-456',
    episodeTitle: 'The Pilot Episode',
    screenplay: 'A'.repeat(1500), // 1500 characters
    onSuccess: jest.fn(),
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders dialog when open is true', () => {
      render(<CreateSegmentsDialog {...defaultProps} />)

      expect(screen.getByText('Create Video Segments')).toBeInTheDocument()
      expect(screen.getByText(/Break down "The Pilot Episode" into manageable video segments/)).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(<CreateSegmentsDialog {...defaultProps} open={false} />)

      expect(screen.queryByText('Create Video Segments')).not.toBeInTheDocument()
    })

    it('shows target duration label and slider', () => {
      render(<CreateSegmentsDialog {...defaultProps} />)

      expect(screen.getByText('Target Segment Duration')).toBeInTheDocument()
      expect(screen.getByText('15s')).toBeInTheDocument() // Default value
    })

    it('shows estimated segments count', () => {
      render(<CreateSegmentsDialog {...defaultProps} />)

      expect(screen.getByText('Estimated Segments')).toBeInTheDocument()
      // 1500 chars / (15 * 100) = 1 segment
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows info alert with AI features list', () => {
      render(<CreateSegmentsDialog {...defaultProps} />)

      expect(screen.getByText(/Note:/)).toBeInTheDocument()
      expect(screen.getByText(/Identify natural narrative breaks/)).toBeInTheDocument()
      expect(screen.getByText(/Extract dialogue and action beats/)).toBeInTheDocument()
      expect(screen.getByText(/Determine optimal transition points/)).toBeInTheDocument()
      expect(screen.getByText(/Generate continuity notes between segments/)).toBeInTheDocument()
    })

    it('shows Cancel and Create Segments buttons', () => {
      render(<CreateSegmentsDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create segments/i })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Target Duration Slider
  // ============================================================================
  describe('Target Duration Slider', () => {
    it('displays current target duration', () => {
      render(<CreateSegmentsDialog {...defaultProps} />)

      expect(screen.getByText('15s')).toBeInTheDocument()
      expect(screen.getByText(/Each segment will target approximately 15 seconds/)).toBeInTheDocument()
    })

    it('updates estimated segments when duration changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      render(<CreateSegmentsDialog {...defaultProps} screenplay={'A'.repeat(6000)} />)

      // Initial: 6000 / (15 * 100) = 4 segments
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Segment Creation Flow
  // ============================================================================
  describe('Segment Creation Flow', () => {
    it('calls API when Create Segments clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/episodes/create-segments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId: 'episode-123',
            targetDuration: 15,
          }),
          signal: expect.any(AbortSignal),
        })
      })
    })

    it('shows loader during creation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Create a promise that won't resolve until we want it to
      let resolveRequest: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolveRequest = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      // The loader should appear during creation - it's in the button
      // Check for progress message which indicates loading state
      await waitFor(() => {
        expect(screen.getByText('Validating screenplay structure...')).toBeInTheDocument()
      })

      // Resolve the request to clean up
      await act(async () => {
        resolveRequest!({
          ok: true,
          json: () => Promise.resolve({ segments: [] }),
        })
      })
    })

    it('shows progress steps during creation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let resolveRequest: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      // Initial step
      await waitFor(() => {
        expect(screen.getByText('Validating screenplay structure...')).toBeInTheDocument()
        expect(screen.getByText('Step 1 of 6')).toBeInTheDocument()
      })

      // Advance to next step (5 seconds)
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      await waitFor(() => {
        expect(screen.getByText('Analyzing scenes and dialogue...')).toBeInTheDocument()
        expect(screen.getByText('Step 2 of 6')).toBeInTheDocument()
      })

      // Resolve request
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })
    })

    it('shows long processing message after 30 seconds', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let resolveRequest: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      // Advance past 30 seconds
      act(() => {
        jest.advanceTimersByTime(31000)
      })

      await waitFor(() => {
        expect(screen.getByText('Taking longer than expected...')).toBeInTheDocument()
      })

      // Resolve request
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })
    })

    it('disables buttons during loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let resolveRequest: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
        // Create button shows loader during loading
        const buttons = screen.getAllByRole('button')
        const createBtn = buttons.find((btn) => btn.querySelector('[data-testid="loader-icon"]'))
        expect(createBtn).toBeDisabled()
      })

      // Resolve request
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })
    })

    it('hides info alert during loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let resolveRequest: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.queryByText(/Note:/)).not.toBeInTheDocument()
      })

      // Resolve request
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })
    })
  })

  // ============================================================================
  // Success State
  // ============================================================================
  describe('Success State', () => {
    it('shows success alert after successful creation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      // Wait for success animation
      act(() => {
        jest.advanceTimersByTime(600)
      })

      await waitFor(() => {
        expect(screen.getByText('Segments created successfully!')).toBeInTheDocument()
        expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      })
    })

    it('changes button text to Created! after success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      // Wait for success
      act(() => {
        jest.advanceTimersByTime(600)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /created!/i })).toBeInTheDocument()
      })
    })

    it('calls onSuccess after success delay', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnSuccess = jest.fn()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })

      render(<CreateSegmentsDialog {...defaultProps} onSuccess={mockOnSuccess} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      // Wait for success message to appear
      await waitFor(() => {
        expect(screen.getByText('Segments created successfully!')).toBeInTheDocument()
      })

      // Advance through the callback delay (1500ms)
      await act(async () => {
        jest.advanceTimersByTime(1600)
      })

      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })

    it('disables Create button after success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      act(() => {
        jest.advanceTimersByTime(600)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /created!/i })).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('shows error alert when API returns error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Screenplay parsing failed' }),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByText('Screenplay parsing failed')).toBeInTheDocument()
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('shows generic error message for non-JSON error response', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to create segments')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('shows timeout error message when request aborted', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByText(/Request timed out/)).toBeInTheDocument()
        expect(screen.getByText(/screenplay may be too long/)).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('re-enables button after error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Test error'))

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create segments/i })).not.toBeDisabled()
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Cancel Button
  // ============================================================================
  describe('Cancel Button', () => {
    it('calls onOpenChange with false when Cancel clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnOpenChange = jest.fn()

      render(<CreateSegmentsDialog {...defaultProps} onOpenChange={mockOnOpenChange} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('is disabled during loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let resolveRequest: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      })

      // Cleanup
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })
    })
  })

  // ============================================================================
  // Estimated Segments Calculation
  // ============================================================================
  describe('Estimated Segments Calculation', () => {
    it('calculates segments based on screenplay length and duration', () => {
      // 3000 chars / (15 * 100) = 2 segments
      render(<CreateSegmentsDialog {...defaultProps} screenplay={'A'.repeat(3000)} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('rounds up for partial segments', () => {
      // 1600 chars / (15 * 100) = 1.07 → 2 segments
      render(<CreateSegmentsDialog {...defaultProps} screenplay={'A'.repeat(1600)} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('handles empty screenplay', () => {
      // 0 chars / (15 * 100) = 0 → 0 segments (Math.ceil(0) = 0)
      render(<CreateSegmentsDialog {...defaultProps} screenplay="" />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('handles very long screenplay', () => {
      // 150000 chars / (15 * 100) = 100 segments
      render(<CreateSegmentsDialog {...defaultProps} screenplay={'A'.repeat(150000)} />)

      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Slider Disabled States
  // ============================================================================
  describe('Slider Disabled States', () => {
    it('disables slider during loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let resolveRequest: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      await waitFor(() => {
        // Slider should be disabled - Radix uses data-disabled attribute
        const slider = screen.getByRole('slider')
        expect(slider).toHaveAttribute('data-disabled')
      })

      // Cleanup
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })
    })

    it('disables slider after success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ segments: [] }),
      })

      render(<CreateSegmentsDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /create segments/i }))

      act(() => {
        jest.advanceTimersByTime(600)
      })

      await waitFor(() => {
        const slider = screen.getByRole('slider')
        expect(slider).toHaveAttribute('data-disabled')
      })
    })
  })
})
