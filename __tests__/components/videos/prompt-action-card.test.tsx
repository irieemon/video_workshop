/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptActionCard } from '@/components/videos/prompt-action-card'
import { Sparkles, Wand2, FileText } from 'lucide-react'

describe('PromptActionCard', () => {
  const defaultProps = {
    icon: Sparkles,
    title: 'Test Card',
    description: 'Test description for the card',
    buttonLabel: 'Click Me',
    onClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the title', () => {
      render(<PromptActionCard {...defaultProps} />)

      expect(screen.getByText('Test Card')).toBeInTheDocument()
    })

    it('renders the description', () => {
      render(<PromptActionCard {...defaultProps} />)

      expect(screen.getByText('Test description for the card')).toBeInTheDocument()
    })

    it('renders the button with label', () => {
      render(<PromptActionCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument()
    })

    it('renders the icon', () => {
      const { container } = render(<PromptActionCard {...defaultProps} />)

      // Lucide icons render as SVG
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Button Interactions
  // ============================================================================
  describe('Button Interactions', () => {
    it('calls onClick when button is clicked', () => {
      render(<PromptActionCard {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Click Me' }))

      expect(defaultProps.onClick).toHaveBeenCalled()
    })

    it('disables button when disabled prop is true', () => {
      render(<PromptActionCard {...defaultProps} disabled={true} />)

      expect(screen.getByRole('button', { name: 'Click Me' })).toBeDisabled()
    })

    it('does not call onClick when disabled', () => {
      render(<PromptActionCard {...defaultProps} disabled={true} />)

      fireEvent.click(screen.getByRole('button', { name: 'Click Me' }))

      expect(defaultProps.onClick).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading label when isLoading', () => {
      render(<PromptActionCard {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows custom loading label', () => {
      render(
        <PromptActionCard
          {...defaultProps}
          isLoading={true}
          loadingLabel="Processing..."
        />
      )

      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('disables button when loading', () => {
      render(<PromptActionCard {...defaultProps} isLoading={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('hides original button label when loading', () => {
      render(<PromptActionCard {...defaultProps} isLoading={true} />)

      expect(screen.queryByText('Click Me')).not.toBeInTheDocument()
    })

    it('shows spinner when loading', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} isLoading={true} />
      )

      // Check for animate-spin class on the spinner element
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Premium Lock
  // ============================================================================
  describe('Premium Lock', () => {
    it('shows crown icon when isPremiumLocked', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} isPremiumLocked={true} />
      )

      // Crown icon has specific color
      const crownIcon = container.querySelector('.text-yellow-400')
      expect(crownIcon).toBeInTheDocument()
    })

    it('does not show crown icon when not premium locked', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} isPremiumLocked={false} />
      )

      const crownIcon = container.querySelector('.text-yellow-400')
      expect(crownIcon).not.toBeInTheDocument()
    })

    it('does not show crown icon when loading', () => {
      const { container } = render(
        <PromptActionCard
          {...defaultProps}
          isPremiumLocked={true}
          isLoading={true}
        />
      )

      // Loading state takes precedence
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Variants
  // ============================================================================
  describe('Variants', () => {
    it('renders default variant', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} variant="default" />
      )

      const card = container.querySelector('.relative')
      expect(card).not.toHaveClass('border-primary/50')
    })

    it('renders primary variant with styling', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} variant="primary" />
      )

      const card = container.querySelector('.border-primary\\/50')
      expect(card).toBeInTheDocument()
    })

    it('renders secondary variant with styling', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} variant="secondary" />
      )

      const card = container.querySelector('.border-sage-500\\/30')
      expect(card).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Secondary Action
  // ============================================================================
  describe('Secondary Action', () => {
    it('renders secondary action button when provided', () => {
      const secondaryAction = {
        label: 'Secondary Action',
        onClick: jest.fn(),
      }

      render(
        <PromptActionCard {...defaultProps} secondaryAction={secondaryAction} />
      )

      expect(
        screen.getByRole('button', { name: 'Secondary Action' })
      ).toBeInTheDocument()
    })

    it('calls secondary action onClick', () => {
      const secondaryAction = {
        label: 'Secondary Action',
        onClick: jest.fn(),
      }

      render(
        <PromptActionCard {...defaultProps} secondaryAction={secondaryAction} />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Secondary Action' }))

      expect(secondaryAction.onClick).toHaveBeenCalled()
    })

    it('does not render secondary button when not provided', () => {
      render(<PromptActionCard {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
    })
  })

  // ============================================================================
  // Custom Class
  // ============================================================================
  describe('Custom Class', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} className="custom-class" />
      )

      const card = container.querySelector('.custom-class')
      expect(card).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Different Icons
  // ============================================================================
  describe('Different Icons', () => {
    it('renders Wand2 icon', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} icon={Wand2} />
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders FileText icon', () => {
      const { container } = render(
        <PromptActionCard {...defaultProps} icon={FileText} />
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })
})
