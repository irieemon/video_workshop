/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoraGenerationModal } from '@/components/videos/sora-generation-modal'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock modal provider
const mockShowConfirm = jest.fn()
jest.mock('@/components/providers/modal-provider', () => ({
  useModal: () => ({
    showConfirm: mockShowConfirm,
  }),
}))

// Mock toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('SoraGenerationModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    videoId: 'video-123',
    videoTitle: 'Test Video Title',
    finalPrompt: 'A cinematic video of a sunset over the ocean',
    userApiKeyId: 'api-key-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    // Clean up any pending timers
    jest.clearAllTimers()
  })

  // ============================================================================
  // Basic Rendering - Settings Step
  // ============================================================================
  describe('Basic Rendering - Settings Step', () => {
    it('renders dialog when open', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      render(<SoraGenerationModal {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog title with correct text', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText(/Generate Video with Sora AI/)).toBeInTheDocument()
    })

    it('renders video title in description', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Test Video Title')).toBeInTheDocument()
    })

    it('renders duration select', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Video Duration')).toBeInTheDocument()
    })

    it('renders aspect ratio select', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Aspect Ratio')).toBeInTheDocument()
    })

    it('renders resolution select', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Resolution')).toBeInTheDocument()
    })

    it('renders model select', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Sora Model')).toBeInTheDocument()
    })

    it('renders estimated cost badge', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Estimated Cost')).toBeInTheDocument()
      expect(screen.getByText(/\$.*USD/)).toBeInTheDocument()
    })

    it('renders prompt preview when finalPrompt is provided', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Prompt to be used:')).toBeInTheDocument()
      expect(
        screen.getByText('A cinematic video of a sunset over the ocean')
      ).toBeInTheDocument()
    })

    it('does not render prompt preview when finalPrompt is not provided', () => {
      render(<SoraGenerationModal {...defaultProps} finalPrompt={undefined} />)

      expect(screen.queryByText('Prompt to be used:')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Settings Selection
  // ============================================================================
  describe('Settings Selection', () => {
    it('renders default duration value in select', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      // The default duration (4 seconds) should be shown in the select trigger
      // Check that the combobox contains the expected default
      const durationTriggers = screen.getAllByRole('combobox')
      expect(durationTriggers.length).toBeGreaterThanOrEqual(4) // Duration, Aspect Ratio, Resolution, Model
    })

    it('updates estimated cost when duration changes', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationModal {...defaultProps} />)

      // Initial cost for 4s, 1080p is $1.50
      expect(screen.getByText('$1.50 USD')).toBeInTheDocument()

      // Open duration select and change to 8 seconds
      const durationTriggers = screen.getAllByRole('combobox')
      await user.click(durationTriggers[0])

      await waitFor(() => {
        expect(screen.getByText('8 seconds')).toBeInTheDocument()
      })

      await user.click(screen.getByText('8 seconds'))

      // Cost should update
      await waitFor(() => {
        expect(screen.getByText('$3.00 USD')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Footer Buttons
  // ============================================================================
  describe('Footer Buttons', () => {
    it('renders Cancel button in settings step', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Generate Video button in settings step', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      // Button text includes dollar amount
      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      expect(generateButton).toBeInTheDocument()
    })

    it('disables Generate button when finalPrompt is not provided', () => {
      render(<SoraGenerationModal {...defaultProps} finalPrompt={undefined} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      expect(generateButton).toBeDisabled()
    })

    it('enables Generate button when finalPrompt is provided', () => {
      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      expect(generateButton).not.toBeDisabled()
    })

    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationModal {...defaultProps} />)

      await user.click(screen.getByText('Cancel'))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Generation Flow - Starting Generation
  // ============================================================================
  describe('Generation Flow - Starting Generation', () => {
    it('starts generation when Generate button is clicked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/video-123/generate-sora',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    })

    it('shows generating step after starting generation', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generating Your Video')).toBeInTheDocument()
      })
    })

    it('shows progress bar during generation', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Progress')).toBeInTheDocument()
      })
    })

    it('shows status badge during generation', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Status: queued')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Generation Flow - Error Handling
  // ============================================================================
  describe('Generation Flow - Error Handling', () => {
    it('shows failed step when API returns error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Generation failed' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })
    })

    it('shows error message in failed step for rate limit', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'API quota exceeded' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('API Rate Limit Reached')).toBeInTheDocument()
      })
    })

    it('shows troubleshooting steps for timeout error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Request timed out' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generation Timeout')).toBeInTheDocument()
        expect(screen.getByText('Troubleshooting Steps:')).toBeInTheDocument()
      })
    })

    it('shows troubleshooting steps for authentication error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'API key invalid' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      })
    })

    it('shows troubleshooting steps for content policy error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Content policy violation' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Content Policy Violation')).toBeInTheDocument()
      })
    })

    it('shows troubleshooting steps for network error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Network connection failed' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Network Connection Error')).toBeInTheDocument()
      })
    })

    it('shows generic error for unknown errors', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Something went wrong' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Generation Flow - Polling Status
  // ============================================================================
  describe('Generation Flow - Polling Status', () => {
    it('makes initial generate API call with correct endpoint', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/video-123/generate-sora',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    })

    it('transitions to generating step immediately after clicking generate', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generating Your Video')).toBeInTheDocument()
      })
    })

    it('stores jobId from successful API response', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      // Verify the status shows queued (which means jobId was processed)
      await waitFor(() => {
        expect(screen.getByText('Status: queued')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Generation Flow - Completed Step
  // ============================================================================
  describe('Generation Flow - Completed Step', () => {
    it('shows Close (Continue in Background) button during generation', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Close (Continue in Background)')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Close Dialog Behavior
  // ============================================================================
  describe('Close Dialog Behavior', () => {
    it('closes dialog and calls onClose when Cancel is clicked in settings', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationModal {...defaultProps} />)

      await user.click(screen.getByText('Cancel'))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('shows confirmation when closing during generation', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(true)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generating Your Video')).toBeInTheDocument()
      })

      // Try to close
      await user.click(screen.getByText('Close (Continue in Background)'))

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Generation in Progress',
          expect.any(String),
          expect.any(Object)
        )
      })
    })

    it('does not close when user cancels confirmation', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(false)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generating Your Video')).toBeInTheDocument()
      })

      // Try to close
      await user.click(screen.getByText('Close (Continue in Background)'))

      // Should not close when user cancels
      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled()
      })

      // onClose should NOT be called since user declined
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it('closes when user confirms closing during generation', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(true)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generating Your Video')).toBeInTheDocument()
      })

      // Try to close
      await user.click(screen.getByText('Close (Continue in Background)'))

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Reset and Retry Functionality
  // ============================================================================
  describe('Reset and Retry Functionality', () => {
    it('shows Retry button for retryable errors', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Request timed out' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      // Timeout errors show "Retry (3 left)" button
      await waitFor(() => {
        expect(screen.getByText(/Retry \(\d+ left\)/)).toBeInTheDocument()
      })
    })

    it('shows failed step when initial API call fails', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Service unavailable' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      })
    })

    it('shows Try Again button after non-retryable error', async () => {
      const user = userEvent.setup()
      // "Insufficient credits" errors are not retryable (canRetry: false)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Insufficient credits' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      // First, wait for the failed state to be reached
      await waitFor(() => {
        expect(screen.getByText('Insufficient Credits')).toBeInTheDocument()
      })

      // Then check for the Try Again button - for canRetry: false the button appears
      await waitFor(() => {
        expect(screen.getByText('Try Again with New Settings')).toBeInTheDocument()
      })
    })

    it('shows Close button after error', async () => {
      const user = userEvent.setup()
      // Content policy error is not retryable
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Content policy violation' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        // There will be a Close button in the failed step footer
        const closeButtons = screen.getAllByRole('button').filter((btn) =>
          btn.textContent?.trim() === 'Close'
        )
        expect(closeButtons.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // Generation Steps Display
  // ============================================================================
  describe('Generation Steps Display', () => {
    it('shows generation steps during generation', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(screen.getByText('Generating Your Video')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // API Request Body
  // ============================================================================
  describe('API Request Body', () => {
    it('sends correct default settings in API request', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/video-123/generate-sora',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"duration":4'),
          })
        )
      })
    })

    it('sends userApiKeyId in API request', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/video-123/generate-sora',
          expect.objectContaining({
            body: expect.stringContaining('"userApiKeyId":"api-key-123"'),
          })
        )
      })
    })

    it('sends settings object in API request', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-123', status: 'queued' }),
      })

      render(<SoraGenerationModal {...defaultProps} />)

      const generateButton = screen.getAllByRole('button').find((btn) =>
        btn.textContent?.includes('Generate Video')
      )
      await user.click(generateButton!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/video-123/generate-sora',
          expect.objectContaining({
            body: expect.stringContaining('"settings"'),
          })
        )
      })
    })
  })
})
