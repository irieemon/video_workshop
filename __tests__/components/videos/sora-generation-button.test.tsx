/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoraGenerationButton } from '@/components/videos/sora-generation-button'

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

// Mock the SoraGenerationModal to avoid complex nested testing
jest.mock('@/components/videos/sora-generation-modal', () => ({
  SoraGenerationModal: ({
    open,
    onClose,
    videoId,
    videoTitle,
    finalPrompt,
  }: {
    open: boolean
    onClose: () => void
    videoId: string
    videoTitle: string
    finalPrompt?: string
  }) =>
    open ? (
      <div data-testid="sora-generation-modal" data-video-id={videoId}>
        <span>Modal for: {videoTitle}</span>
        {finalPrompt && <span>Prompt: {finalPrompt}</span>}
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}))

describe('SoraGenerationButton', () => {
  const defaultProps = {
    videoId: 'video-123',
    videoTitle: 'Test Video',
    finalPrompt: 'A cinematic shot of sunset',
  }

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the generate button', () => {
      render(<SoraGenerationButton {...defaultProps} />)

      expect(screen.getByRole('button', { name: /generate with sora/i })).toBeInTheDocument()
    })

    it('shows crown icon for free users by default', () => {
      render(<SoraGenerationButton {...defaultProps} />)

      // Free users see the crown icon indicating premium feature
      const button = screen.getByRole('button', { name: /generate with sora/i })
      // The crown icon should be within the button (as a sibling to the text)
      expect(button.querySelector('.text-yellow-400')).toBeInTheDocument()
    })

    it('hides crown icon for premium users', () => {
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="premium" />)

      const button = screen.getByRole('button', { name: /generate with sora/i })
      expect(button.querySelector('.text-yellow-400')).not.toBeInTheDocument()
    })

    it('hides crown icon for enterprise users', () => {
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="enterprise" />)

      const button = screen.getByRole('button', { name: /generate with sora/i })
      expect(button.querySelector('.text-yellow-400')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Free User Behavior
  // ============================================================================
  describe('Free User Behavior', () => {
    it('opens upgrade dialog when free user clicks button', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.getByText('Premium Feature')).toBeInTheDocument()
      expect(
        screen.getByText(/sora video generation is available exclusively for premium/i)
      ).toBeInTheDocument()
    })

    it('does not open generation modal for free users', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.queryByTestId('sora-generation-modal')).not.toBeInTheDocument()
    })

    it('shows premium benefits in upgrade dialog', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.getByText('Premium Benefits')).toBeInTheDocument()
      expect(screen.getByText(/unlimited ai-powered video generation/i)).toBeInTheDocument()
      expect(screen.getByText(/advanced prompt optimization/i)).toBeInTheDocument()
      expect(screen.getByText(/priority generation queue/i)).toBeInTheDocument()
      expect(screen.getByText(/hd video exports/i)).toBeInTheDocument()
    })

    it('shows upgrade button linking to subscription settings', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      const upgradeLink = screen.getByRole('link', { name: /upgrade to premium/i })
      expect(upgradeLink).toHaveAttribute('href', '/dashboard/settings?tab=subscription')
    })

    it('closes upgrade dialog when "Maybe Later" is clicked', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))
      expect(screen.getByText('Premium Feature')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /maybe later/i }))

      expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument()
    })

    it('uses free tier by default when not specified', async () => {
      const user = userEvent.setup()
      render(
        <SoraGenerationButton
          videoId="video-123"
          videoTitle="Test"
        />
      )

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      // Should show upgrade dialog, not generation modal
      expect(screen.getByText('Premium Feature')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Premium User Behavior
  // ============================================================================
  describe('Premium User Behavior', () => {
    it('opens generation modal when premium user clicks button', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="premium" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
    })

    it('does not show upgrade dialog for premium users', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="premium" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument()
    })

    it('passes video props to generation modal', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="premium" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      const modal = screen.getByTestId('sora-generation-modal')
      expect(modal).toHaveAttribute('data-video-id', 'video-123')
      expect(screen.getByText('Modal for: Test Video')).toBeInTheDocument()
      expect(screen.getByText('Prompt: A cinematic shot of sunset')).toBeInTheDocument()
    })

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="premium" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))
      expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /close modal/i }))

      expect(screen.queryByTestId('sora-generation-modal')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Enterprise User Behavior
  // ============================================================================
  describe('Enterprise User Behavior', () => {
    it('opens generation modal when enterprise user clicks button', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="enterprise" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
    })

    it('does not show upgrade dialog for enterprise users', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="enterprise" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument()
    })

    it('passes video props to generation modal for enterprise', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="enterprise" />)

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      const modal = screen.getByTestId('sora-generation-modal')
      expect(modal).toHaveAttribute('data-video-id', 'video-123')
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles undefined finalPrompt', async () => {
      const user = userEvent.setup()
      render(
        <SoraGenerationButton
          videoId="video-123"
          videoTitle="No Prompt Video"
          subscriptionTier="premium"
        />
      )

      await user.click(screen.getByRole('button', { name: /generate with sora/i }))

      const modal = screen.getByTestId('sora-generation-modal')
      expect(modal).toBeInTheDocument()
      expect(screen.queryByText(/Prompt:/i)).not.toBeInTheDocument()
    })

    it('renders modal with correct props when opened multiple times', async () => {
      const user = userEvent.setup()
      render(<SoraGenerationButton {...defaultProps} subscriptionTier="premium" />)

      // Open modal
      await user.click(screen.getByRole('button', { name: /generate with sora/i }))
      expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()

      // Close modal
      await user.click(screen.getByRole('button', { name: /close modal/i }))
      expect(screen.queryByTestId('sora-generation-modal')).not.toBeInTheDocument()

      // Open again
      await user.click(screen.getByRole('button', { name: /generate with sora/i }))
      expect(screen.getByTestId('sora-generation-modal')).toBeInTheDocument()
    })

    it('button has correct styling classes', () => {
      render(<SoraGenerationButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /generate with sora/i })
      expect(button).toHaveClass('bg-sage-600')
    })
  })
})
