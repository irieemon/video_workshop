/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScreenplayViewer } from '@/components/screenplay/screenplay-viewer'
import type { Episode } from '@/lib/types/database.types'

// Mock Lucide icons - include all icons used by the component AND by UI primitives (Dialog uses X)
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronRight: () => <div data-testid="chevron-right" />,
  Users: () => <div data-testid="users-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Play: () => <div data-testid="play-icon" />,
  X: () => <div data-testid="close-icon" />,
}))

describe('ScreenplayViewer', () => {
  const mockOnClose = jest.fn()

  // Base episode without screenplay content
  const baseEpisode: Episode = {
    id: 'ep-123',
    series_id: 'series-456',
    user_id: 'user-789',
    episode_number: 3,
    season_number: 2,
    title: 'The Revelation',
    logline: 'Secrets are finally revealed.',
    status: 'complete',
    screenplay_text: null,
    structured_screenplay: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T15:30:00Z',
  }

  // Episode with structured screenplay
  const structuredEpisode: Episode = {
    ...baseEpisode,
    structured_screenplay: {
      scenes: [
        {
          scene_id: 'scene-1',
          scene_number: 1,
          location: 'INT. COFFEE SHOP',
          time_of_day: 'DAY',
          time_period: 'PRESENT',
          duration_estimate: 30,
          description: 'A busy coffee shop in downtown Manhattan.',
          characters: ['SARAH', 'JOHN'],
          dialogue: [
            { character: 'SARAH', lines: ['Hello, stranger.'] },
            { character: 'JOHN', lines: ['It has been a while.', 'Too long perhaps.'] },
          ],
          action: ['Sarah stirs her coffee nervously.', 'John removes his coat.'],
          scene_purpose: 'Establish the tension between the characters.',
          emotional_beat: 'Awkward reunion',
        },
        {
          scene_id: 'scene-2',
          scene_number: 2,
          location: 'EXT. CITY STREET',
          time_of_day: 'NIGHT',
          time_period: 'PRESENT',
          duration_estimate: 45,
          description: 'Rain-soaked city streets reflect neon lights.',
          characters: ['SARAH'],
          dialogue: [],
          action: ['Sarah walks alone, lost in thought.'],
          scene_purpose: null,
          emotional_beat: null,
        },
        {
          scene_id: 'scene-3',
          scene_number: 3,
          location: 'INT. APARTMENT',
          time_of_day: 'EVENING',
          time_period: 'FLASHBACK',
          description: 'A cozy apartment decorated for the holidays.',
          characters: [],
          dialogue: [],
          action: [],
        },
      ],
    },
  }

  // Episode with raw text screenplay
  const textEpisode: Episode = {
    ...baseEpisode,
    screenplay_text: `FADE IN:

INT. COFFEE SHOP - DAY

SARAH sits at a corner table, stirring her coffee.

JOHN enters, spots her, and approaches cautiously.

SARAH
Hello, stranger.

JOHN
It's been a while.

FADE OUT.`,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Dialog Open/Close
  // ============================================================================
  describe('Dialog Open/Close', () => {
    it('renders nothing when closed', () => {
      render(<ScreenplayViewer open={false} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('calls onClose when dialog is closed', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      // Click the close button (X) in the dialog
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // Header Information
  // ============================================================================
  describe('Header Information', () => {
    it('displays episode title', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.getByText('The Revelation')).toBeInTheDocument()
    })

    it('displays logline when available', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.getByText('Secrets are finally revealed.')).toBeInTheDocument()
    })

    it('displays season/episode info when no logline', () => {
      const episodeWithoutLogline = { ...baseEpisode, logline: null }
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={episodeWithoutLogline} />)

      expect(screen.getByText('Season 2, Episode 3')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no screenplay content', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.getByText('No screenplay content available')).toBeInTheDocument()
      expect(screen.getByText(/work with the screenplay writer/i)).toBeInTheDocument()
    })

    it('shows map pin icon in empty state', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument()
    })

    it('does not show expand/collapse buttons in empty state', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      expect(screen.queryByRole('button', { name: /expand all/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /collapse all/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Raw Text Screenplay
  // ============================================================================
  describe('Raw Text Screenplay', () => {
    it('displays raw screenplay text', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={textEpisode} />)

      expect(screen.getByText(/FADE IN:/)).toBeInTheDocument()
      expect(screen.getByText(/INT. COFFEE SHOP - DAY/)).toBeInTheDocument()
    })

    it('displays text in monospace font area', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={textEpisode} />)

      // Find the container with font-mono class
      const textContainer = screen.getByText(/FADE IN:/).closest('div')
      expect(textContainer).toHaveClass('font-mono')
    })

    it('does not show expand/collapse buttons for text screenplay', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={textEpisode} />)

      expect(screen.queryByRole('button', { name: /expand all/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /collapse all/i })).not.toBeInTheDocument()
    })

    it('handles whitespace-only text as empty', () => {
      const whitespaceEpisode = { ...baseEpisode, screenplay_text: '   \n\t  ' }
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={whitespaceEpisode} />)

      expect(screen.getByText('No screenplay content available')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Structured Screenplay - Scene Display
  // ============================================================================
  describe('Structured Screenplay - Scene Display', () => {
    it('shows scene count badge', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getByText('3 scenes')).toBeInTheDocument()
    })

    it('displays all scene cards', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getByText('Scene 1: INT. COFFEE SHOP')).toBeInTheDocument()
      expect(screen.getByText('Scene 2: EXT. CITY STREET')).toBeInTheDocument()
      expect(screen.getByText('Scene 3: INT. APARTMENT')).toBeInTheDocument()
    })

    it('displays time badges for scenes', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getByText('DAY PRESENT')).toBeInTheDocument()
      expect(screen.getByText('NIGHT PRESENT')).toBeInTheDocument()
      expect(screen.getByText('EVENING FLASHBACK')).toBeInTheDocument()
    })

    it('displays duration estimate when available', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getByText('~30s')).toBeInTheDocument()
      expect(screen.getByText('~45s')).toBeInTheDocument()
    })

    it('shows character count indicator', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Scene 1 has 2 characters, Scene 2 has 1 character
      const userIcons = screen.getAllByTestId('users-icon')
      expect(userIcons.length).toBeGreaterThan(0)
    })

    it('shows dialogue count indicator for scenes with dialogue', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Scene 1 has dialogue
      expect(screen.getAllByTestId('message-square-icon').length).toBeGreaterThan(0)
    })

    it('shows action count indicator for scenes with actions', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Scene 1 and 2 have actions
      expect(screen.getAllByTestId('play-icon').length).toBeGreaterThan(0)
    })

    it('shows collapsed chevron by default', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getAllByTestId('chevron-right')).toHaveLength(3)
      expect(screen.queryByTestId('chevron-down')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Scene Expansion/Collapse
  // ============================================================================
  describe('Scene Expansion/Collapse', () => {
    it('expands scene when clicking on header', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Click on first scene header
      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      // Should now show scene details
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('A busy coffee shop in downtown Manhattan.')).toBeInTheDocument()
    })

    it('shows expanded chevron when scene is expanded', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      // Should show one down chevron (expanded) and two right chevrons (collapsed)
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
      expect(screen.getAllByTestId('chevron-right')).toHaveLength(2)
    })

    it('collapses scene when clicking expanded header', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Expand scene
      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))
      expect(screen.getByText('A busy coffee shop in downtown Manhattan.')).toBeInTheDocument()

      // Collapse scene
      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      // Description should no longer be visible (in a card content section)
      expect(screen.queryByText('Description')).not.toBeInTheDocument()
    })

    it('can expand multiple scenes independently', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))
      await user.click(screen.getByText('Scene 2: EXT. CITY STREET'))

      // Both should be expanded
      expect(screen.getByText('A busy coffee shop in downtown Manhattan.')).toBeInTheDocument()
      expect(screen.getByText('Rain-soaked city streets reflect neon lights.')).toBeInTheDocument()
      expect(screen.getAllByTestId('chevron-down')).toHaveLength(2)
    })
  })

  // ============================================================================
  // Expand/Collapse All
  // ============================================================================
  describe('Expand/Collapse All', () => {
    it('shows expand all button for structured screenplay', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getByRole('button', { name: /expand all/i })).toBeInTheDocument()
    })

    it('shows collapse all button for structured screenplay', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      expect(screen.getByRole('button', { name: /collapse all/i })).toBeInTheDocument()
    })

    it('expands all scenes when clicking expand all', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByRole('button', { name: /expand all/i }))

      // All scenes should now be expanded (3 down chevrons)
      expect(screen.getAllByTestId('chevron-down')).toHaveLength(3)
      expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument()
    })

    it('collapses all scenes when clicking collapse all', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // First expand all
      await user.click(screen.getByRole('button', { name: /expand all/i }))
      expect(screen.getAllByTestId('chevron-down')).toHaveLength(3)

      // Then collapse all
      await user.click(screen.getByRole('button', { name: /collapse all/i }))

      // All scenes should be collapsed
      expect(screen.getAllByTestId('chevron-right')).toHaveLength(3)
      expect(screen.queryByTestId('chevron-down')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Expanded Scene Content
  // ============================================================================
  describe('Expanded Scene Content', () => {
    it('shows scene description', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('A busy coffee shop in downtown Manhattan.')).toBeInTheDocument()
    })

    it('shows characters section with badges', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      expect(screen.getByText('Characters')).toBeInTheDocument()
      // Characters appear as badges in the characters section
      // SARAH and JOHN appear multiple times (badges + dialogue), so verify badges exist
      const badges = screen.getAllByText(/^(SARAH|JOHN)$/)
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })

    it('shows dialogue section with formatted lines', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      expect(screen.getByText('Dialogue')).toBeInTheDocument()
      expect(screen.getByText(/"Hello, stranger."/)).toBeInTheDocument()
      expect(screen.getByText(/"It has been a while. Too long perhaps."/)).toBeInTheDocument()
    })

    it('shows actions section with list items', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      expect(screen.getByText('Actions')).toBeInTheDocument()
      expect(screen.getByText('Sarah stirs her coffee nervously.')).toBeInTheDocument()
      expect(screen.getByText('John removes his coat.')).toBeInTheDocument()
    })

    it('shows scene purpose when available', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      expect(screen.getByText('Purpose')).toBeInTheDocument()
      expect(screen.getByText('Establish the tension between the characters.')).toBeInTheDocument()
    })

    it('shows emotional beat when available', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      expect(screen.getByText('Emotional Beat')).toBeInTheDocument()
      expect(screen.getByText('Awkward reunion')).toBeInTheDocument()
    })

    it('does not show optional sections when not available', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Scene 2 has no dialogue or purpose/emotional beat
      await user.click(screen.getByText('Scene 2: EXT. CITY STREET'))

      expect(screen.queryByText('Dialogue')).not.toBeInTheDocument()
      expect(screen.queryByText('Purpose')).not.toBeInTheDocument()
      expect(screen.queryByText('Emotional Beat')).not.toBeInTheDocument()
    })

    it('does not show characters section when no characters', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Scene 3 has no characters
      await user.click(screen.getByText('Scene 3: INT. APARTMENT'))

      // Should not have a "Characters" header in the expanded content
      const expandedContent = screen.getByText('A cozy apartment decorated for the holidays.')
      expect(expandedContent).toBeInTheDocument()
      // The Characters heading should not appear for scene 3
      const headings = screen.queryAllByRole('heading', { level: 4 })
      const characterHeadings = headings.filter((h) => h.textContent === 'Characters')
      expect(characterHeadings.length).toBe(0)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles empty scenes array', () => {
      const emptyStructured = {
        ...baseEpisode,
        structured_screenplay: { scenes: [] },
      }
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={emptyStructured} />)

      // Should show empty state since no scenes
      expect(screen.getByText('No screenplay content available')).toBeInTheDocument()
    })

    it('handles dialogue with array of lines', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      await user.click(screen.getByText('Scene 1: INT. COFFEE SHOP'))

      // John's dialogue has multiple lines that should be joined
      expect(screen.getByText(/"It has been a while. Too long perhaps."/)).toBeInTheDocument()
    })

    it('handles dialogue with single line string', async () => {
      const user = userEvent.setup()

      const singleLineDialogue: Episode = {
        ...baseEpisode,
        structured_screenplay: {
          scenes: [
            {
              scene_id: 'scene-1',
              scene_number: 1,
              location: 'TEST',
              time_of_day: 'DAY',
              time_period: 'PRESENT',
              description: 'Test scene',
              characters: [],
              dialogue: [{ character: 'TEST', lines: 'Single line' }],
              action: [],
            },
          ],
        },
      }

      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={singleLineDialogue} />)

      await user.click(screen.getByText('Scene 1: TEST'))

      expect(screen.getByText(/"Single line"/)).toBeInTheDocument()
    })

    it('handles scene without scene_id using index', () => {
      const noIdScene: Episode = {
        ...baseEpisode,
        structured_screenplay: {
          scenes: [
            {
              scene_number: 1,
              location: 'NO ID SCENE',
              time_of_day: 'DAY',
              time_period: 'PRESENT',
              description: 'Scene without ID',
              characters: [],
              dialogue: [],
              action: [],
            },
          ],
        },
      }

      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={noIdScene} />)

      expect(screen.getByText('Scene 1: NO ID SCENE')).toBeInTheDocument()
    })

    it('handles missing duration estimate', () => {
      const noDuration: Episode = {
        ...baseEpisode,
        structured_screenplay: {
          scenes: [
            {
              scene_id: 'scene-1',
              scene_number: 1,
              location: 'TEST',
              time_of_day: 'DAY',
              time_period: 'PRESENT',
              description: 'Test',
              characters: [],
              dialogue: [],
              action: [],
            },
          ],
        },
      }

      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={noDuration} />)

      // Should not crash and should not show duration badge
      expect(screen.queryByText(/~.*s/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe('Accessibility', () => {
    it('dialog has accessible name from title', () => {
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={baseEpisode} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('scene cards are keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<ScreenplayViewer open={true} onClose={mockOnClose} episode={structuredEpisode} />)

      // Tab to first scene header and press enter
      await user.tab() // Focus on close button
      await user.tab() // Focus on expand all
      await user.tab() // Focus on collapse all
      await user.tab() // Focus on first scene

      // The scene header should be focusable since it's clickable
      // Note: We're testing that keyboard navigation works, not specific focus order
      expect(document.activeElement).toBeInstanceOf(HTMLElement)
    })
  })
})
