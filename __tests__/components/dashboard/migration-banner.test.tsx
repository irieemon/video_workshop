/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MigrationBanner } from '@/components/dashboard/migration-banner'

const BANNER_STORAGE_KEY = 'scenra-series-first-banner-dismissed'

describe('MigrationBanner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  // ============================================================================
  // Initial Visibility
  // ============================================================================
  describe('Initial Visibility', () => {
    it('shows banner when not previously dismissed', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })
    })

    it('hides banner when previously dismissed', async () => {
      localStorage.setItem(BANNER_STORAGE_KEY, 'true')

      render(<MigrationBanner />)

      // Banner should not appear
      await waitFor(() => {
        expect(screen.queryByText(/Welcome to the New Video-First Experience/)).not.toBeInTheDocument()
      })
    })

    it('returns null when dismissed (no DOM element)', () => {
      localStorage.setItem(BANNER_STORAGE_KEY, 'true')

      const { container } = render(<MigrationBanner />)

      expect(container.firstChild).toBeNull()
    })
  })

  // ============================================================================
  // Banner Content
  // ============================================================================
  describe('Banner Content', () => {
    it('displays welcome title', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })
    })

    it('displays feature description', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/We've simplified video creation based on your feedback/)).toBeInTheDocument()
      })
    })

    it('lists Quick Create feature', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Quick Create/)).toBeInTheDocument()
        expect(screen.getByText(/Create videos in 2 clicks instead of 5/)).toBeInTheDocument()
      })
    })

    it('lists Series-First feature', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Series-First/)).toBeInTheDocument()
        expect(screen.getByText(/Organize content by series without projects/)).toBeInTheDocument()
      })
    })

    it('lists Smart Defaults feature', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Smart Defaults/)).toBeInTheDocument()
        expect(screen.getByText(/Remembers your last-used series/)).toBeInTheDocument()
      })
    })

    it('lists Standalone Videos feature', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Standalone Videos/)).toBeInTheDocument()
        expect(screen.getByText(/Create one-off videos without creating a series/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Navigation Links
  // ============================================================================
  describe('Navigation Links', () => {
    it('renders Explore Videos link', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Explore Videos/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/dashboard/videos')
      })
    })

    it('renders Browse Series link', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Browse Series/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/dashboard/series')
      })
    })
  })

  // ============================================================================
  // Dismiss Functionality
  // ============================================================================
  describe('Dismiss Functionality', () => {
    it('renders dismiss button with aria-label', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Dismiss banner/i })).toBeInTheDocument()
      })
    })

    it('hides banner when dismiss button is clicked', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })

      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i })
      fireEvent.click(dismissButton)

      expect(screen.queryByText(/Welcome to the New Video-First Experience/)).not.toBeInTheDocument()
    })

    it('stores dismissal in localStorage', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })

      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i })
      fireEvent.click(dismissButton)

      expect(localStorage.getItem(BANNER_STORAGE_KEY)).toBe('true')
    })

    it('stays dismissed after page reload simulation', async () => {
      const { unmount } = render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })

      // Dismiss the banner
      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i })
      fireEvent.click(dismissButton)

      // Unmount and remount to simulate page reload
      unmount()
      render(<MigrationBanner />)

      // Banner should not appear
      expect(screen.queryByText(/Welcome to the New Video-First Experience/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Icons
  // ============================================================================
  describe('Icons', () => {
    it('renders Sparkles icon', async () => {
      const { container } = render(<MigrationBanner />)

      await waitFor(() => {
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBeGreaterThanOrEqual(1) // At least Sparkles icon
      })
    })

    it('renders X icon in dismiss button', async () => {
      render(<MigrationBanner />)

      await waitFor(() => {
        const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i })
        expect(dismissButton.querySelector('svg')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Styling
  // ============================================================================
  describe('Styling', () => {
    it('applies correct Alert classes', async () => {
      const { container } = render(<MigrationBanner />)

      await waitFor(() => {
        const alert = container.querySelector('[role="alert"]')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveClass('mb-6')
      })
    })

    it('has amber color scheme classes', async () => {
      const { container } = render(<MigrationBanner />)

      await waitFor(() => {
        const alert = container.querySelector('[role="alert"]')
        expect(alert).toHaveClass('border-scenra-amber/50')
      })
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles multiple renders without issues', async () => {
      const { rerender } = render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })

      // Rerender multiple times
      rerender(<MigrationBanner />)
      rerender(<MigrationBanner />)
      rerender(<MigrationBanner />)

      // Should still be visible
      expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
    })

    it('handles localStorage value of null', async () => {
      // Explicitly set to null (clear returns null for getItem)
      localStorage.removeItem(BANNER_STORAGE_KEY)

      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })
    })

    it('only checks localStorage once on mount', async () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')

      render(<MigrationBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the New Video-First Experience/)).toBeInTheDocument()
      })

      // Should have checked localStorage once (on mount)
      expect(getItemSpy).toHaveBeenCalledWith(BANNER_STORAGE_KEY)
      expect(getItemSpy).toHaveBeenCalledTimes(1)

      getItemSpy.mockRestore()
    })
  })
})
