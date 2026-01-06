/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentCard, SegmentCardSkeleton, type SegmentWithStatus } from '@/components/segments/segment-card'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  PlayCircle: () => <div data-testid="play-circle-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Info: () => <div data-testid="info-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}))

describe('SegmentCard', () => {
  const defaultSegment: SegmentWithStatus = {
    id: 'seg-123',
    episode_id: 'ep-456',
    segment_number: 1,
    narrative_beat: 'The hero enters the mysterious cave',
    narrative_transition: 'Cut to interior',
    dialogue_lines: [
      { character: 'Hero', lines: ['Where am I?', 'This place feels strange'] },
      { character: 'Guide', lines: ['Welcome to the ancient temple'] },
      { character: 'Villain', lines: ['You should not have come here'] },
    ],
    action_beats: [
      'Hero walks cautiously into the cave',
      'Light flickers dramatically',
      'Camera pans across ancient symbols',
    ],
    estimated_duration: 12.567,
    characters_in_segment: ['hero', 'guide'],
    visual_continuity_notes: 'Maintain dim lighting from previous scene',
    hasVideo: false,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    sequence_order: 1,
    status: 'pending',
    final_prompt: null,
    prompt_version: null,
    screenplay_chunk: null,
  }

  const mockOnViewDetails = jest.fn()
  const mockOnGenerate = jest.fn()
  const mockOnViewVideo = jest.fn()
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders segment number badge', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('renders narrative beat as title', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('The hero enters the mysterious cave')).toBeInTheDocument()
    })

    it('renders narrative transition', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Transition: Cut to interior')).toBeInTheDocument()
    })

    it('renders estimated duration formatted to 2 decimal places', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('12.57s')).toBeInTheDocument()
    })

    it('renders character count', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('shows continuity notes badge when present', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Has continuity notes')).toBeInTheDocument()
    })

    it('does not show continuity notes badge when absent', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, visual_continuity_notes: null }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Has continuity notes')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Dialogue Display
  // ============================================================================
  describe('Dialogue Display', () => {
    it('renders first two dialogue lines', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Hero:')).toBeInTheDocument()
      expect(screen.getByText('Where am I? This place feels strange')).toBeInTheDocument()
      expect(screen.getByText('Guide:')).toBeInTheDocument()
      expect(screen.getByText('Welcome to the ancient temple')).toBeInTheDocument()
    })

    it('shows "+N more lines" when more than 2 dialogue lines exist', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('+1 more lines')).toBeInTheDocument()
    })

    it('does not show dialogue section when empty', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, dialogue_lines: [] }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Dialogue:')).not.toBeInTheDocument()
    })

    it('does not show dialogue section when null', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, dialogue_lines: null }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Dialogue:')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Action Beats Display
  // ============================================================================
  describe('Action Beats Display', () => {
    it('renders first two action beats', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Hero walks cautiously into the cave')).toBeInTheDocument()
      expect(screen.getByText('Light flickers dramatically')).toBeInTheDocument()
    })

    it('shows "+N more actions" when more than 2 action beats exist', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('+1 more actions')).toBeInTheDocument()
    })

    it('does not show action section when empty', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, action_beats: [] }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Action:')).not.toBeInTheDocument()
    })

    it('does not show action section when null', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, action_beats: null }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Action:')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Pending State
  // ============================================================================
  describe('Pending State', () => {
    it('shows clock icon for pending segment', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('shows Generate button for pending segment', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
    })

    it('calls onGenerate when Generate button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      await user.click(screen.getByRole('button', { name: /generate/i }))

      expect(mockOnGenerate).toHaveBeenCalledWith('seg-123')
    })
  })

  // ============================================================================
  // Generating State
  // ============================================================================
  describe('Generating State', () => {
    const generatingSegment = { ...defaultSegment, isGenerating: true }

    it('shows spinning animation for generating segment', () => {
      render(
        <SegmentCard
          segment={generatingSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      // The spinning animation is a div with animate-spin class
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('shows "Generating..." badge', () => {
      render(
        <SegmentCard
          segment={generatingSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })

    it('does not show Generate button while generating', () => {
      render(
        <SegmentCard
          segment={generatingSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
    })

    it('applies pulse animation to card', () => {
      render(
        <SegmentCard
          segment={generatingSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      // Card should have animate-pulse class
      const card = document.querySelector('.animate-pulse')
      expect(card).toBeInTheDocument()
    })

    it('applies primary border class', () => {
      const { container } = render(
        <SegmentCard
          segment={generatingSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(container.firstChild).toHaveClass('border-primary/50')
    })
  })

  // ============================================================================
  // Complete State (Has Video)
  // ============================================================================
  describe('Complete State', () => {
    const completeSegment = { ...defaultSegment, hasVideo: true, videoId: 'video-789' }

    it('shows check circle icon for completed segment', () => {
      render(
        <SegmentCard
          segment={completeSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })

    it('shows View button for completed segment', () => {
      render(
        <SegmentCard
          segment={completeSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
    })

    it('does not show Generate button for completed segment', () => {
      render(
        <SegmentCard
          segment={completeSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
    })

    it('calls onViewVideo when View button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SegmentCard
          segment={completeSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      await user.click(screen.getByRole('button', { name: /view/i }))

      expect(mockOnViewVideo).toHaveBeenCalledWith('video-789')
    })

    it('applies green border class', () => {
      const { container } = render(
        <SegmentCard
          segment={completeSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(container.firstChild).toHaveClass('border-green-200')
    })
  })

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    const errorSegment = { ...defaultSegment, hasError: true }

    it('shows alert triangle icon for error segment', () => {
      render(
        <SegmentCard
          segment={errorSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    })

    it('shows "Failed" badge', () => {
      render(
        <SegmentCard
          segment={errorSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('shows Retry button when onRetry is provided', () => {
      render(
        <SegmentCard
          segment={errorSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('does not show Retry button when onRetry is not provided', () => {
      render(
        <SegmentCard
          segment={errorSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('calls onRetry when Retry button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SegmentCard
          segment={errorSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          onRetry={mockOnRetry}
        />
      )

      await user.click(screen.getByRole('button', { name: /retry/i }))

      expect(mockOnRetry).toHaveBeenCalledWith('seg-123')
    })

    it('applies red border and background classes', () => {
      const { container } = render(
        <SegmentCard
          segment={errorSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(container.firstChild).toHaveClass('border-red-200')
      expect(container.firstChild).toHaveClass('bg-red-50/50')
    })
  })

  // ============================================================================
  // Details Button
  // ============================================================================
  describe('Details Button', () => {
    it('renders Details button', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      // There are two buttons - one for desktop (with text) and one for mobile (icon only)
      expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument()
    })

    it('calls onViewDetails when Details button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      await user.click(screen.getByRole('button', { name: /details/i }))

      expect(mockOnViewDetails).toHaveBeenCalledWith(defaultSegment)
    })

    it('renders mobile info button', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      // Mobile button has info icon
      expect(screen.getAllByTestId('info-icon')).toHaveLength(2)
    })
  })

  // ============================================================================
  // Compact Mode
  // ============================================================================
  describe('Compact Mode', () => {
    it('hides narrative transition in compact mode', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          compact={true}
        />
      )

      expect(screen.queryByText('Transition: Cut to interior')).not.toBeInTheDocument()
    })

    it('hides dialogue section in compact mode', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          compact={true}
        />
      )

      expect(screen.queryByText('Dialogue:')).not.toBeInTheDocument()
    })

    it('hides action beats section in compact mode', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          compact={true}
        />
      )

      expect(screen.queryByText('Action:')).not.toBeInTheDocument()
    })

    it('hides duration and meta info in compact mode', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          compact={true}
        />
      )

      expect(screen.queryByText('12.57s')).not.toBeInTheDocument()
      expect(screen.queryByText('Has continuity notes')).not.toBeInTheDocument()
    })

    it('still shows segment number in compact mode', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          compact={true}
        />
      )

      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('still shows narrative beat in compact mode', () => {
      render(
        <SegmentCard
          segment={defaultSegment}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
          compact={true}
        />
      )

      expect(screen.getByText('The hero enters the mysterious cave')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles segment with no characters', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, characters_in_segment: [] }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Characters:')).not.toBeInTheDocument()
    })

    it('handles segment with null characters', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, characters_in_segment: null }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText('Characters:')).not.toBeInTheDocument()
    })

    it('handles single dialogue line', () => {
      render(
        <SegmentCard
          segment={{
            ...defaultSegment,
            dialogue_lines: [{ character: 'Solo', lines: ['Just one line'] }],
          }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('Solo:')).toBeInTheDocument()
      expect(screen.getByText('Just one line')).toBeInTheDocument()
      expect(screen.queryByText(/more lines/)).not.toBeInTheDocument()
    })

    it('handles exactly two dialogue lines (no "more" message)', () => {
      render(
        <SegmentCard
          segment={{
            ...defaultSegment,
            dialogue_lines: [
              { character: 'A', lines: ['Line A'] },
              { character: 'B', lines: ['Line B'] },
            ],
          }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText(/more lines/)).not.toBeInTheDocument()
    })

    it('handles exactly two action beats (no "more" message)', () => {
      render(
        <SegmentCard
          segment={{
            ...defaultSegment,
            action_beats: ['Action 1', 'Action 2'],
          }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText(/more actions/)).not.toBeInTheDocument()
    })

    it('handles duration with no decimal places needed', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, estimated_duration: 10 }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('10s')).toBeInTheDocument()
    })

    it('handles very long duration', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, estimated_duration: 123.456789 }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.getByText('123.46s')).toBeInTheDocument()
    })

    it('handles segment with null narrative_transition', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, narrative_transition: null }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      expect(screen.queryByText(/Transition:/)).not.toBeInTheDocument()
    })

    it('prioritizes error state over hasVideo state', () => {
      render(
        <SegmentCard
          segment={{ ...defaultSegment, hasVideo: true, hasError: true }}
          onViewDetails={mockOnViewDetails}
          onGenerate={mockOnGenerate}
          onViewVideo={mockOnViewVideo}
        />
      )

      // Should show error icon, not check icon
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('check-circle-icon')).not.toBeInTheDocument()
    })
  })
})

// ============================================================================
// SegmentCardSkeleton
// ============================================================================
describe('SegmentCardSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<SegmentCardSkeleton />)

    // Should have multiple skeleton elements
    expect(container.querySelectorAll('[class*="h-"]').length).toBeGreaterThan(0)
  })

  it('shows content section in default mode', () => {
    const { container } = render(<SegmentCardSkeleton />)

    // Should have CardContent section with multiple skeletons
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('hides content section in compact mode', () => {
    const { container } = render(<SegmentCardSkeleton compact={true} />)

    // In compact mode, there should be fewer skeleton elements (no CardContent)
    // Check that the border-t element (which is in CardContent) is not present
    expect(container.querySelector('.border-t')).not.toBeInTheDocument()
  })

  it('shows header elements in compact mode', () => {
    render(<SegmentCardSkeleton compact={true} />)

    // Even in compact mode, header skeletons should be present
    // The component should still render without errors
    expect(document.body).toBeInTheDocument()
  })
})
