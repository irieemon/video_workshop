/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentRoundtable } from '@/components/agents/agent-roundtable'

// Mock the AgentCard component
jest.mock('@/components/agents/agent-card', () => ({
  AgentCard: ({ agent, response, isChallenge, respondingTo, buildingOn }: any) => (
    <div data-testid={`agent-card-${agent}`}>
      <span data-testid="agent-name">{agent}</span>
      <span data-testid="agent-response">{response}</span>
      {isChallenge && <span data-testid="is-challenge">Challenge</span>}
      {respondingTo && <span data-testid="responding-to">{respondingTo}</span>}
      {buildingOn && buildingOn.length > 0 && (
        <span data-testid="building-on">{buildingOn.join(',')}</span>
      )}
    </div>
  ),
}))

describe('AgentRoundtable', () => {
  const mockDiscussion = {
    round1: [
      { agent: 'director', response: 'Director analysis' },
      { agent: 'cinematographer', response: 'Camera perspective' },
      { agent: 'editor', response: 'Pacing thoughts' },
    ],
    round2: [
      {
        agent: 'editor',
        response: 'I challenge the director view',
        isChallenge: true,
        respondingTo: 'director',
      },
      {
        agent: 'cinematographer',
        response: 'Building on consensus',
        buildingOn: ['director', 'editor'],
      },
    ],
  }

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders Round 1 card when round1 has items', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByText('Round 1: Initial Analysis')).toBeInTheDocument()
    })

    it('renders Round 2 card when round2 has items', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByText('Round 2: Collaborative Refinement')).toBeInTheDocument()
    })

    it('renders all agent cards from round1', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByTestId('agent-card-director')).toBeInTheDocument()
      // cinematographer and editor appear in both rounds, use getAllByTestId
      const cinematographerCards = screen.getAllByTestId('agent-card-cinematographer')
      const editorCards = screen.getAllByTestId('agent-card-editor')
      expect(cinematographerCards.length).toBeGreaterThanOrEqual(1)
      expect(editorCards.length).toBeGreaterThanOrEqual(1)
    })

    it('renders agent cards from round2', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      // Round 2 has editor and cinematographer
      const editorCards = screen.getAllByTestId('agent-card-editor')
      expect(editorCards.length).toBeGreaterThanOrEqual(1)
    })

    it('renders card descriptions', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByText('Each expert analyzes your brief from their unique perspective')).toBeInTheDocument()
      expect(screen.getByText("Experts challenge, respond, and build on each other's ideas")).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Empty State Handling
  // ============================================================================
  describe('Empty State Handling', () => {
    it('does not render Round 1 card when round1 is empty', () => {
      const emptyRound1 = {
        round1: [],
        round2: mockDiscussion.round2,
      }

      render(<AgentRoundtable discussion={emptyRound1} />)

      expect(screen.queryByText('Round 1: Initial Analysis')).not.toBeInTheDocument()
    })

    it('does not render Round 2 card when round2 is empty', () => {
      const emptyRound2 = {
        round1: mockDiscussion.round1,
        round2: [],
      }

      render(<AgentRoundtable discussion={emptyRound2} />)

      expect(screen.queryByText('Round 2: Collaborative Refinement')).not.toBeInTheDocument()
    })

    it('returns null for invalid discussion structure', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { container } = render(
        <AgentRoundtable discussion={null as any} />
      )

      expect(container.firstChild).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('returns null when round1 is not an array', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { container } = render(
        <AgentRoundtable discussion={{ round1: 'invalid', round2: [] } as any} />
      )

      expect(container.firstChild).toBeNull()

      consoleSpy.mockRestore()
    })

    it('returns null when round2 is not an array', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { container } = render(
        <AgentRoundtable discussion={{ round1: [], round2: 'invalid' } as any} />
      )

      expect(container.firstChild).toBeNull()

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Click Handler
  // ============================================================================
  describe('Click Handler', () => {
    it('calls onReviewClick when Round 1 card is clicked', () => {
      const mockOnReviewClick = jest.fn()

      render(
        <AgentRoundtable
          discussion={mockDiscussion}
          onReviewClick={mockOnReviewClick}
        />
      )

      // Find the Round 1 card and click it
      const round1Title = screen.getByText('Round 1: Initial Analysis')
      const round1Card = round1Title.closest('.cursor-pointer')
      fireEvent.click(round1Card!)

      expect(mockOnReviewClick).toHaveBeenCalledTimes(1)
    })

    it('calls onReviewClick when Round 2 card is clicked', () => {
      const mockOnReviewClick = jest.fn()

      render(
        <AgentRoundtable
          discussion={mockDiscussion}
          onReviewClick={mockOnReviewClick}
        />
      )

      // Find the Round 2 card and click it
      const round2Title = screen.getByText('Round 2: Collaborative Refinement')
      const round2Card = round2Title.closest('.cursor-pointer')
      fireEvent.click(round2Card!)

      expect(mockOnReviewClick).toHaveBeenCalledTimes(1)
    })

    it('shows review hint when onReviewClick is provided', () => {
      render(
        <AgentRoundtable
          discussion={mockDiscussion}
          onReviewClick={() => {}}
        />
      )

      const hints = screen.getAllByText('Click to review →')
      expect(hints.length).toBe(2) // One for each round
    })

    it('does not show review hint when onReviewClick is not provided', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.queryByText('Click to review →')).not.toBeInTheDocument()
    })

    it('applies cursor-pointer class when onReviewClick is provided', () => {
      const { container } = render(
        <AgentRoundtable
          discussion={mockDiscussion}
          onReviewClick={() => {}}
        />
      )

      const clickableCards = container.querySelectorAll('.cursor-pointer')
      expect(clickableCards.length).toBe(2)
    })

    it('does not apply cursor-pointer class when onReviewClick is not provided', () => {
      const { container } = render(
        <AgentRoundtable discussion={mockDiscussion} />
      )

      const clickableCards = container.querySelectorAll('.cursor-pointer')
      expect(clickableCards.length).toBe(0)
    })
  })

  // ============================================================================
  // Round 2 Threading
  // ============================================================================
  describe('Round 2 Threading', () => {
    it('adds padding for items with respondingTo', () => {
      const { container } = render(
        <AgentRoundtable discussion={mockDiscussion} />
      )

      // Items with respondingTo should have pl-3 or pl-6 class
      const paddedItems = container.querySelectorAll('.pl-3, .pl-6')
      expect(paddedItems.length).toBeGreaterThan(0)
    })

    it('adds padding for items with buildingOn', () => {
      const { container } = render(
        <AgentRoundtable discussion={mockDiscussion} />
      )

      const paddedItems = container.querySelectorAll('.pl-3, .pl-6')
      expect(paddedItems.length).toBeGreaterThan(0)
    })

    it('passes challenge props to AgentCard', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByTestId('is-challenge')).toBeInTheDocument()
    })

    it('passes respondingTo props to AgentCard', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByTestId('responding-to')).toBeInTheDocument()
    })

    it('passes buildingOn props to AgentCard', () => {
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByTestId('building-on')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Layout
  // ============================================================================
  describe('Layout', () => {
    it('renders with grid layout for Round 1', () => {
      const { container } = render(
        <AgentRoundtable discussion={mockDiscussion} />
      )

      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
    })

    it('uses correct key pattern for round1 items', () => {
      // Keys are internal React details, but we can verify all items render
      render(<AgentRoundtable discussion={mockDiscussion} />)

      expect(screen.getByTestId('agent-card-director')).toBeInTheDocument()
      // cinematographer appears in both rounds, so use getAllByTestId
      const cinematographerCards = screen.getAllByTestId('agent-card-cinematographer')
      expect(cinematographerCards.length).toBeGreaterThanOrEqual(1)
    })

    it('renders round2 items sequentially (not in grid)', () => {
      const { container } = render(
        <AgentRoundtable discussion={mockDiscussion} />
      )

      // Round 2 items are in a space-y container, not a grid
      const round2Container = container.querySelector('.space-y-3, .space-y-4')
      expect(round2Container).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles single item in round1', () => {
      const singleItem = {
        round1: [{ agent: 'director', response: 'Solo director' }],
        round2: [],
      }

      render(<AgentRoundtable discussion={singleItem} />)

      expect(screen.getByText('Round 1: Initial Analysis')).toBeInTheDocument()
      expect(screen.getByTestId('agent-card-director')).toBeInTheDocument()
    })

    it('handles round2 item without threading props', () => {
      const noThreading = {
        round1: [],
        round2: [
          { agent: 'director', response: 'No threading' },
        ],
      }

      render(<AgentRoundtable discussion={noThreading} />)

      expect(screen.getByText('Round 2: Collaborative Refinement')).toBeInTheDocument()
    })

    it('handles both rounds empty', () => {
      const bothEmpty = {
        round1: [],
        round2: [],
      }

      const { container } = render(
        <AgentRoundtable discussion={bothEmpty} />
      )

      // Should render container but no round cards
      expect(screen.queryByText('Round 1: Initial Analysis')).not.toBeInTheDocument()
      expect(screen.queryByText('Round 2: Collaborative Refinement')).not.toBeInTheDocument()
    })
  })
})
