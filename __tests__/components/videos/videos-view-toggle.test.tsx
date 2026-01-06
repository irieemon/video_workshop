/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideosViewToggle, ViewMode } from '@/components/videos/videos-view-toggle'

// Mock tooltip components
jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
}))

describe('VideosViewToggle', () => {
  const mockOnViewChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders both view buttons', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      expect(screen.getAllByRole('button')).toHaveLength(2)
    })

    it('renders Card View tooltip', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      expect(screen.getByText('Card View')).toBeInTheDocument()
    })

    it('renders List View tooltip', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      expect(screen.getByText('List View')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Card View Selected
  // ============================================================================
  describe('Card View Selected', () => {
    it('applies secondary variant to card button when selected', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      // First button is card
      expect(buttons[0]).toHaveClass('bg-secondary')
    })

    it('applies ghost variant to list button when card is selected', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      // Second button is list - should not have secondary variant
      expect(buttons[1]).not.toHaveClass('bg-secondary')
    })
  })

  // ============================================================================
  // List View Selected
  // ============================================================================
  describe('List View Selected', () => {
    it('applies secondary variant to list button when selected', () => {
      render(<VideosViewToggle view="list" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      // Second button is list
      expect(buttons[1]).toHaveClass('bg-secondary')
    })

    it('applies ghost variant to card button when list is selected', () => {
      render(<VideosViewToggle view="list" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      // First button is card - should not have secondary variant
      expect(buttons[0]).not.toHaveClass('bg-secondary')
    })
  })

  // ============================================================================
  // Click Handlers
  // ============================================================================
  describe('Click Handlers', () => {
    it('calls onViewChange with card when card button is clicked', () => {
      render(<VideosViewToggle view="list" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(mockOnViewChange).toHaveBeenCalledWith('card')
    })

    it('calls onViewChange with list when list button is clicked', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[1])

      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })

    it('allows clicking the already selected view', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(mockOnViewChange).toHaveBeenCalledWith('card')
    })
  })

  // ============================================================================
  // Styling
  // ============================================================================
  describe('Styling', () => {
    it('renders container with border and rounded styling', () => {
      const { container } = render(
        <VideosViewToggle view="card" onViewChange={mockOnViewChange} />
      )

      const wrapper = container.querySelector('.border.rounded-md')
      expect(wrapper).toBeInTheDocument()
    })

    it('buttons have correct size classes', () => {
      render(<VideosViewToggle view="card" onViewChange={mockOnViewChange} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('h-8')
        expect(button).toHaveClass('w-8')
      })
    })
  })
})
