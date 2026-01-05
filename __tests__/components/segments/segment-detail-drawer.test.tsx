/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentDetailDrawer } from '@/components/segments/segment-detail-drawer'

// Mock sonner toast - define inside factory to avoid hoisting issues
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Import toast after mock to get the mocked version
import { toast as mockToast } from 'sonner'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock segment data
const mockSegment = {
  id: 'segment-1',
  episode_id: 'episode-1',
  segment_number: 3,
  narrative_beat: 'The hero confronts the villain',
  estimated_duration: 5.5,
  start_timestamp: 10.0,
  end_timestamp: 15.5,
  narrative_transition: 'Cut to action',
  dialogue_lines: [
    {
      character: 'Hero',
      lines: ['I will stop you!', 'This ends now!'],
    },
    {
      character: 'Villain',
      lines: ['You cannot defeat me.'],
    },
  ],
  action_beats: ['Hero draws sword', 'Villain laughs menacingly', 'They clash'],
  visual_continuity_notes: 'Maintain consistent lighting from previous scene',
  characters_in_segment: ['Hero', 'Villain'],
  settings_in_segment: ['Dark Castle', 'Throne Room'],
  scene_ids: ['scene-1', 'scene-2'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const defaultProps = {
  segment: mockSegment,
  open: true,
  onOpenChange: jest.fn(),
  seriesId: 'series-1',
  episodeId: 'episode-1',
  onGenerate: jest.fn(),
  isPremium: false,
}

describe('SegmentDetailDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    ;(mockToast.success as jest.Mock).mockReset()
    ;(mockToast.error as jest.Mock).mockReset()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders nothing when segment is null', () => {
      const { container } = render(
        <SegmentDetailDrawer {...defaultProps} segment={null} />
      )

      expect(container).toBeEmptyDOMElement()
    })

    it('renders drawer when open with segment', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(<SegmentDetailDrawer {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays segment number badge', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      // Badge shows segment number - there may be multiple #3 (badge and technical details)
      const badges = screen.getAllByText('#3')
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it('displays narrative beat as title', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('The hero confronts the villain')).toBeInTheDocument()
    })

    it('displays duration in description', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText(/Duration: 5\.5s/)).toBeInTheDocument()
    })

    it('displays narrative transition in description', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText(/Cut to action/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Screenplay Content
  // ============================================================================
  describe('Screenplay Content', () => {
    it('displays dialogue lines', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Dialogue')).toBeInTheDocument()
      // Hero and Villain appear multiple times (dialogue and characters sections)
      expect(screen.getAllByText('Hero').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Villain').length).toBeGreaterThanOrEqual(1)
    })

    it('displays action beats', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Action')).toBeInTheDocument()
      expect(screen.getByText('Hero draws sword')).toBeInTheDocument()
      expect(screen.getByText('Villain laughs menacingly')).toBeInTheDocument()
      expect(screen.getByText('They clash')).toBeInTheDocument()
    })

    it('displays visual continuity notes', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Visual Continuity')).toBeInTheDocument()
      expect(screen.getByText('Maintain consistent lighting from previous scene')).toBeInTheDocument()
    })

    it('displays characters in segment', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Characters')).toBeInTheDocument()
      // Characters appear as badges
      const characterBadges = screen.getAllByText(/Hero|Villain/)
      expect(characterBadges.length).toBeGreaterThanOrEqual(2)
    })

    it('displays settings in segment', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Dark Castle')).toBeInTheDocument()
      expect(screen.getByText('Throne Room')).toBeInTheDocument()
    })

    it('handles segment without dialogue', () => {
      const segmentWithoutDialogue = {
        ...mockSegment,
        dialogue_lines: [],
      }

      render(
        <SegmentDetailDrawer {...defaultProps} segment={segmentWithoutDialogue} />
      )

      expect(screen.queryByText('Dialogue')).not.toBeInTheDocument()
    })

    it('handles segment without action beats', () => {
      const segmentWithoutAction = {
        ...mockSegment,
        action_beats: [],
      }

      render(
        <SegmentDetailDrawer {...defaultProps} segment={segmentWithoutAction} />
      )

      expect(screen.queryByText('Action')).not.toBeInTheDocument()
    })

    it('handles segment without visual continuity notes', () => {
      const segmentWithoutNotes = {
        ...mockSegment,
        visual_continuity_notes: null,
      }

      render(
        <SegmentDetailDrawer {...defaultProps} segment={segmentWithoutNotes} />
      )

      expect(screen.queryByText('Visual Continuity')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Technical Details
  // ============================================================================
  describe('Technical Details', () => {
    it('displays technical details section', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Technical Details')).toBeInTheDocument()
    })

    it('displays segment number in technical details', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      const technicalSection = screen.getByText('Technical Details').parentElement
      expect(technicalSection).toHaveTextContent('#3')
    })

    it('displays duration in technical details', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('5.5s')).toBeInTheDocument()
    })

    it('displays start timestamp', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('10s')).toBeInTheDocument()
    })

    it('displays end timestamp', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('15.5s')).toBeInTheDocument()
    })

    it('displays scene IDs', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Scene IDs:')).toBeInTheDocument()
      expect(screen.getByText('scene-1, scene-2')).toBeInTheDocument()
    })

    it('formats duration to fix floating-point precision', () => {
      const segmentWithPrecision = {
        ...mockSegment,
        estimated_duration: 5.555555555,
      }

      render(
        <SegmentDetailDrawer {...defaultProps} segment={segmentWithPrecision} />
      )

      // Should be formatted to 2 decimal places - appears in multiple places
      const durationElements = screen.getAllByText(/5\.56s/)
      expect(durationElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // Prompt Generation
  // ============================================================================
  describe('Prompt Generation', () => {
    it('shows Generate Prompt button initially', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Generate Prompt/i })).toBeInTheDocument()
    })

    it('shows Sora Video Prompt section header', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText('Sora Video Prompt')).toBeInTheDocument()
    })

    it('calls API and displays generated prompt', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Generated Sora prompt for this segment' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Generated Sora prompt for this segment')).toBeInTheDocument()
      })

      expect(mockToast.success).toHaveBeenCalledWith('Sora prompt generated successfully!')
    })

    it('sends correct request body when generating prompt', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/segments/generate-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentId: 'segment-1',
            episodeId: 'episode-1',
            seriesId: 'series-1',
          }),
        })
      })
    })

    it('shows loading state while generating', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument()
      })
    })

    it('displays error when prompt generation fails', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient credits' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Insufficient credits')).toBeInTheDocument()
      })

      expect(mockToast.error).toHaveBeenCalledWith('Insufficient credits')
    })

    it('handles network error during prompt generation', async () => {
      const user = userEvent.setup()

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error')
      })
    })
  })

  // ============================================================================
  // Copy Prompt
  // ============================================================================
  describe('Copy Prompt', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt to copy' }),
      })
    })

    it('shows copy buttons after prompt is generated', async () => {
      const user = userEvent.setup()

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Test prompt to copy')).toBeInTheDocument()
      })

      // Should have multiple copy buttons (one in prompt area, one as main action)
      const copyButtons = screen.getAllByRole('button', { name: /Copy/i })
      expect(copyButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('copies prompt to clipboard', async () => {
      const user = userEvent.setup()

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Test prompt to copy')).toBeInTheDocument()
      })

      // Set up clipboard mock right before click to ensure it's not overwritten
      const localMockWriteText = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: localMockWriteText },
        writable: true,
        configurable: true,
      })

      // Use direct click (not userEvent) to avoid userEvent's clipboard interception
      const copyButton = screen.getByRole('button', { name: /Copy to Clipboard/i })
      copyButton.click()

      await waitFor(() => {
        expect(localMockWriteText).toHaveBeenCalledWith('Test prompt to copy')
      })
      expect(mockToast.success).toHaveBeenCalledWith('Prompt copied to clipboard!')
    })
  })

  // ============================================================================
  // Video Generation - Non-Premium
  // ============================================================================
  describe('Video Generation - Non-Premium', () => {
    it('shows Premium Required button when not premium', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} isPremium={false} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Premium Required/i })).toBeInTheDocument()
      })
    })

    it('Premium Required button is disabled', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} isPremium={false} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Premium Required/i })).toBeDisabled()
      })
    })

    it('shows appropriate help text for non-premium users', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} isPremium={false} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText(/Copy the prompt and paste it into Sora manually/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Video Generation - Premium
  // ============================================================================
  describe('Video Generation - Premium', () => {
    it('shows Generate with Sora button when premium', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} isPremium={true} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate with Sora/i })).toBeInTheDocument()
      })
    })

    it('calls video generation API when Generate with Sora is clicked', async () => {
      const user = userEvent.setup()
      const onGenerate = jest.fn()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ prompt: 'Test prompt' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ videoId: 'video-1' }),
        })

      render(
        <SegmentDetailDrawer {...defaultProps} isPremium={true} onGenerate={onGenerate} />
      )

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate with Sora/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Generate with Sora/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/segments/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentId: 'segment-1',
            episodeId: 'episode-1',
            seriesId: 'series-1',
            prompt: 'Test prompt',
          }),
        })
      })

      expect(mockToast.success).toHaveBeenCalledWith('Video generation started!')
      expect(onGenerate).toHaveBeenCalledWith('segment-1')
    })

    it('closes drawer after successful video generation', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ prompt: 'Test prompt' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ videoId: 'video-1' }),
        })

      render(
        <SegmentDetailDrawer {...defaultProps} isPremium={true} onOpenChange={onOpenChange} />
      )

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate with Sora/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Generate with Sora/i }))

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows loading state during video generation', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ prompt: 'Test prompt' }),
        })
        .mockImplementationOnce(() => new Promise(() => {})) // Never resolves

      render(<SegmentDetailDrawer {...defaultProps} isPremium={true} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate with Sora/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Generate with Sora/i }))

      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument()
      })
    })

    it('shows error when video generation fails', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ prompt: 'Test prompt' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'API rate limit exceeded' }),
        })

      render(<SegmentDetailDrawer {...defaultProps} isPremium={true} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate with Sora/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Generate with Sora/i }))

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('API rate limit exceeded')
      })
    })

    it('shows premium help text', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} isPremium={true} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText(/Click 'Generate with Sora' to create this video automatically/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Segment Change Reset
  // ============================================================================
  describe('Segment Change Reset', () => {
    it('resets prompt when segment changes', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ prompt: 'Generated prompt' }),
      })

      const { rerender } = render(<SegmentDetailDrawer {...defaultProps} />)

      // Generate a prompt
      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Generated prompt')).toBeInTheDocument()
      })

      // Change the segment
      const newSegment = { ...mockSegment, id: 'segment-2' }
      rerender(<SegmentDetailDrawer {...defaultProps} segment={newSegment} />)

      // Should reset and show Generate Prompt button again
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Prompt/i })).toBeInTheDocument()
      })

      expect(screen.queryByText('Generated prompt')).not.toBeInTheDocument()
    })

    it('resets error when segment changes', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Some error' }),
      })

      const { rerender } = render(<SegmentDetailDrawer {...defaultProps} />)

      // Generate a prompt that fails
      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Some error')).toBeInTheDocument()
      })

      // Change the segment
      const newSegment = { ...mockSegment, id: 'segment-2' }
      rerender(<SegmentDetailDrawer {...defaultProps} segment={newSegment} />)

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Some error')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Initial State - No Prompt
  // ============================================================================
  describe('Initial State - No Prompt', () => {
    it('shows informational alert when no prompt exists', () => {
      render(<SegmentDetailDrawer {...defaultProps} />)

      expect(screen.getByText(/Generate an AI-optimized prompt for Sora/)).toBeInTheDocument()
    })

    it('hides Generate Prompt button when prompt exists', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prompt: 'Test prompt' }),
      })

      render(<SegmentDetailDrawer {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Generate Prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Test prompt')).toBeInTheDocument()
      })

      // The Generate Prompt button in header should be gone
      expect(screen.queryByRole('button', { name: /^Generate Prompt$/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // onOpenChange Callback
  // ============================================================================
  describe('onOpenChange Callback', () => {
    it('calls onOpenChange when drawer is closed', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()

      render(<SegmentDetailDrawer {...defaultProps} onOpenChange={onOpenChange} />)

      // Find and click the close button (X button in Sheet)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
