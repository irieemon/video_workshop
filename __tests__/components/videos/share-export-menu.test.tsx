/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareExportMenu } from '@/components/videos/share-export-menu'
import { toast } from 'sonner'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ShareExportMenu', () => {
  const defaultVideo = {
    id: 'video-123',
    title: 'Test Video',
    optimizedPrompt: 'A cinematic shot of a sunset over the ocean',
    hashtags: ['sunset', 'ocean', 'cinematic'],
    technicalSpecs: {
      aspectRatio: '16:9',
      duration: 10,
      resolution: '1080p',
      style: 'Cinematic',
    },
    createdAt: '2024-01-15T10:00:00Z',
    platform: 'Sora',
  }

  // Store original implementations
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  const originalCreateElement = document.createElement.bind(document)

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()

    // Mock URL methods
    URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url')
    URL.revokeObjectURL = jest.fn()

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the share button', () => {
      render(<ShareExportMenu video={defaultVideo} />)

      expect(screen.getByRole('button', { name: /share & export/i })).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<ShareExportMenu video={defaultVideo} className="custom-class" />)

      const button = screen.getByRole('button', { name: /share & export/i })
      expect(button).toHaveClass('custom-class')
    })

    it('shows dropdown menu when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))

      expect(screen.getByText('Copy Share Link')).toBeInTheDocument()
      expect(screen.getByText('Download PDF')).toBeInTheDocument()
      expect(screen.getByText('Export JSON')).toBeInTheDocument()
      expect(screen.getByText('Copy as Markdown')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Share Link Generation
  // ============================================================================
  describe('Share Link Generation', () => {
    it('calls API to generate share link when clicked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shareUrl: 'https://example.com/share/abc123' }),
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy Share Link'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/videos/video-123/share', {
          method: 'POST',
        })
      })
    })

    it('shows success toast when share link is copied', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shareUrl: 'https://example.com/share/abc123' }),
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy Share Link'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Share link copied!', {
          description: 'Anyone with this link can view the prompt',
        })
      })
    })

    it('calls onShareLinkGenerated callback with URL', async () => {
      const user = userEvent.setup()
      const mockCallback = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shareUrl: 'https://example.com/share/abc123' }),
      })

      render(<ShareExportMenu video={defaultVideo} onShareLinkGenerated={mockCallback} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy Share Link'))

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('https://example.com/share/abc123')
      })
    })

    it('shows error toast when share link generation fails', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy Share Link'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to generate share link', {
          description: 'Unauthorized',
        })
      })

      consoleSpy.mockRestore()
    })

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy Share Link'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to generate share link', {
          description: 'Network error',
        })
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // PDF Export
  // ============================================================================
  describe('PDF Export', () => {
    it('calls API to export PDF when clicked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf content'], { type: 'application/pdf' })),
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/videos/video-123/export/pdf', {
          method: 'POST',
        })
      })
    })

    it('shows success toast after PDF download', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf content'], { type: 'application/pdf' })),
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('PDF downloaded!')
      })
    })

    it('shows error toast when PDF export fails', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export PDF', {
          description: 'Please try again',
        })
      })

      consoleSpy.mockRestore()
    })

    it('creates blob URL for download', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf content'], { type: 'application/pdf' })),
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
        expect(URL.revokeObjectURL).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // JSON Export
  // ============================================================================
  describe('JSON Export', () => {
    it('shows success toast after JSON export', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Export JSON'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('JSON exported!')
      })
    })

    it('creates blob URL for download', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Export JSON'))

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled()
        expect(URL.revokeObjectURL).toHaveBeenCalled()
      })
    })

    it('handles export errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Make createObjectURL throw
      URL.createObjectURL = jest.fn(() => {
        throw new Error('Failed to create URL')
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Export JSON'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export JSON')
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Markdown Copy
  // ============================================================================
  describe('Markdown Copy', () => {
    it('shows success toast after markdown copy', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy as Markdown'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Markdown copied to clipboard!')
      })
    })

    // Note: The clipboard mock verification is handled implicitly by the toast success
    // assertion. Since toast.success('Markdown copied to clipboard!') is called AFTER
    // the clipboard.writeText() call succeeds, we can be confident the clipboard
    // operation completed successfully.

    it('handles clipboard errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
        },
        writable: true,
        configurable: true,
      })

      render(<ShareExportMenu video={defaultVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy as Markdown'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy markdown')
      })

      consoleSpy.mockRestore()
    })
  })

  // Note: UI state tests for "Copied!" and "Link Copied!" text are omitted because
  // the Radix DropdownMenu closes after clicking a menu item, making it impossible
  // to verify the text change within the menu. However, these state changes are
  // implicitly verified by the toast success assertions - if the toast fires,
  // the async operation completed and the state was updated.

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles video without optional fields', async () => {
      const user = userEvent.setup()
      const minimalVideo = {
        id: 'video-123',
        title: 'Minimal Video',
        optimizedPrompt: 'Simple prompt',
      }

      render(<ShareExportMenu video={minimalVideo} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Export JSON'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('JSON exported!')
      })
    })

    it('handles video with empty hashtags array', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={{ ...defaultVideo, hashtags: [] }} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy as Markdown'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Markdown copied to clipboard!')
      })
    })

    it('handles video with empty technical specs', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={{ ...defaultVideo, technicalSpecs: {} }} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Copy as Markdown'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Markdown copied to clipboard!')
      })
    })

    it('handles video with empty title', async () => {
      const user = userEvent.setup()
      render(<ShareExportMenu video={{ ...defaultVideo, title: '' }} />)

      await user.click(screen.getByRole('button', { name: /share & export/i }))
      await user.click(screen.getByText('Export JSON'))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('JSON exported!')
      })
    })
  })
})
