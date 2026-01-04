import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PerformanceMetricsForm } from '@/components/performance/performance-metrics-form'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('PerformanceMetricsForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()
  const videoId = 'test-video-id'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  it('renders the form with all required fields', () => {
    render(<PerformanceMetricsForm videoId={videoId} />)

    expect(screen.getByLabelText(/Platform/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Views/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Likes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comments/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Shares/i)).toBeInTheDocument()
  })

  it('shows advanced metrics in accordion', async () => {
    render(<PerformanceMetricsForm videoId={videoId} />)

    // Advanced metrics should be hidden initially
    expect(screen.queryByLabelText(/Watch Time/i)).not.toBeInTheDocument()

    // Click accordion to expand
    const accordionTrigger = screen.getByText(/Advanced Metrics/i)
    fireEvent.click(accordionTrigger)

    await waitFor(() => {
      expect(screen.getByLabelText(/Watch Time/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Completion Rate/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Traffic Source/i)).toBeInTheDocument()
    })
  })

  it('shows saves field for Instagram platform', async () => {
    const user = userEvent.setup()
    render(<PerformanceMetricsForm videoId={videoId} />)

    // Default is TikTok, saves should not be visible
    expect(screen.queryByLabelText(/Saves/i)).not.toBeInTheDocument()

    // Change to Instagram - Radix UI Select needs click to open, then click option
    const platformTrigger = screen.getByRole('combobox')
    await user.click(platformTrigger)

    // Wait for dropdown to open and find Instagram option
    await waitFor(() => {
      const instagramOption = screen.getByRole('option', { name: /Instagram/i })
      expect(instagramOption).toBeInTheDocument()
    })

    const instagramOption = screen.getByRole('option', { name: /Instagram/i })
    await user.click(instagramOption)

    // Saves should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/Saves/i)).toBeInTheDocument()
    })
  })

  it('submits form with zero values (valid data)', async () => {
    const user = userEvent.setup()
    render(<PerformanceMetricsForm videoId={videoId} />)

    // Submit with default zero values (which are valid)
    const submitButton = screen.getByRole('button', { name: /Save Metrics/i })
    await user.click(submitButton)

    // Form should submit since zero values are valid for metrics
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('submits form successfully', async () => {
    const user = userEvent.setup()
    render(<PerformanceMetricsForm videoId={videoId} onSuccess={mockOnSuccess} />)

    // Fill in required fields
    const viewsInput = screen.getByLabelText(/Views/i)
    const likesInput = screen.getByLabelText(/Likes/i)
    const commentsInput = screen.getByLabelText(/Comments/i)
    const sharesInput = screen.getByLabelText(/Shares/i)

    await user.clear(viewsInput)
    await user.type(viewsInput, '10000')
    await user.clear(likesInput)
    await user.type(likesInput, '500')
    await user.clear(commentsInput)
    await user.type(commentsInput, '50')
    await user.clear(sharesInput)
    await user.type(sharesInput, '25')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Metrics/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/videos/${videoId}/performance`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"views":10000'),
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save metrics' }),
    })

    render(<PerformanceMetricsForm videoId={videoId} />)

    // Fill in required fields
    const viewsInput = screen.getByLabelText(/Views/i)
    await user.clear(viewsInput)
    await user.type(viewsInput, '10000')

    const likesInput = screen.getByLabelText(/Likes/i)
    await user.clear(likesInput)
    await user.type(likesInput, '500')

    const commentsInput = screen.getByLabelText(/Comments/i)
    await user.clear(commentsInput)
    await user.type(commentsInput, '50')

    const sharesInput = screen.getByLabelText(/Shares/i)
    await user.clear(sharesInput)
    await user.type(sharesInput, '25')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Metrics/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<PerformanceMetricsForm videoId={videoId} onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('validates completion rate range (0-100)', async () => {
    const user = userEvent.setup()
    render(<PerformanceMetricsForm videoId={videoId} />)

    // Expand advanced metrics
    const accordionTrigger = screen.getByText(/Advanced Metrics/i)
    await user.click(accordionTrigger)

    await waitFor(async () => {
      const completionRateInput = screen.getByLabelText(/Completion Rate/i)

      // Try invalid value (over 100)
      await user.clear(completionRateInput)
      await user.type(completionRateInput, '150')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Save Metrics/i })
      await user.click(submitButton)

      // Should not submit due to validation
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    render(<PerformanceMetricsForm videoId={videoId} />)

    // Fill in required fields
    const viewsInput = screen.getByLabelText(/Views/i)
    await user.clear(viewsInput)
    await user.type(viewsInput, '10000')

    const likesInput = screen.getByLabelText(/Likes/i)
    await user.clear(likesInput)
    await user.type(likesInput, '500')

    const commentsInput = screen.getByLabelText(/Comments/i)
    await user.clear(commentsInput)
    await user.type(commentsInput, '50')

    const sharesInput = screen.getByLabelText(/Shares/i)
    await user.clear(sharesInput)
    await user.type(sharesInput, '25')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Metrics/i })
    await user.click(submitButton)

    // Button should be disabled and show "Saving..."
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/Saving.../i)).toBeInTheDocument()
    })
  })

  it('includes optional advanced metrics when provided', async () => {
    const user = userEvent.setup()
    render(<PerformanceMetricsForm videoId={videoId} onSuccess={mockOnSuccess} />)

    // Fill in required fields
    await user.clear(screen.getByLabelText(/Views/i))
    await user.type(screen.getByLabelText(/Views/i), '10000')
    await user.clear(screen.getByLabelText(/Likes/i))
    await user.type(screen.getByLabelText(/Likes/i), '500')
    await user.clear(screen.getByLabelText(/Comments/i))
    await user.type(screen.getByLabelText(/Comments/i), '50')
    await user.clear(screen.getByLabelText(/Shares/i))
    await user.type(screen.getByLabelText(/Shares/i), '25')

    // Expand advanced metrics
    await user.click(screen.getByText(/Advanced Metrics/i))

    await waitFor(async () => {
      const completionRateInput = screen.getByLabelText(/Completion Rate/i)
      await user.clear(completionRateInput)
      await user.type(completionRateInput, '85')
    })

    // Submit form
    await user.click(screen.getByRole('button', { name: /Save Metrics/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/videos/${videoId}/performance`,
        expect.objectContaining({
          body: expect.stringContaining('"completion_rate":85'),
        })
      )
    })
  })
})
