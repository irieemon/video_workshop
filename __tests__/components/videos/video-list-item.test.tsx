/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoListItem } from '@/components/videos/video-list-item'

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="video-link">
      {children}
    </a>
  )
})

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}))

// Mock dropdown menu
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: (e: any) => void
  }) => (
    <button onClick={(e) => onClick?.(e)} data-testid="dropdown-item">
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => <div data-testid="dropdown-trigger">{children}</div>,
}))

describe('VideoListItem', () => {
  const mockVideo = {
    id: 'video-123',
    title: 'Test Video Title',
    user_brief: 'A test video brief description',
    platform: 'tiktok',
    status: 'draft',
    created_at: '2024-01-15T00:00:00Z',
    series: {
      id: 'series-123',
      name: 'Test Series',
      is_system: false,
    },
  }

  const mockOnDelete = jest.fn()
  const mockOnDuplicate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders video title', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('Test Video Title')).toBeInTheDocument()
    })

    it('renders video brief', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('A test video brief description')).toBeInTheDocument()
    })

    it('links to video roundtable page', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      const link = screen.getByTestId('video-link')
      expect(link).toHaveAttribute('href', '/dashboard/videos/video-123/roundtable')
    })

    it('renders series badge', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('Test Series')).toBeInTheDocument()
    })

    it('renders platform badge', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('tiktok')).toBeInTheDocument()
    })

    it('renders status badge', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('renders relative date', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('2 days ago')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Standalone Video Handling
  // ============================================================================
  describe('Standalone Video Handling', () => {
    it('shows Standalone badge for system series', () => {
      const standaloneVideo = {
        ...mockVideo,
        series: {
          id: 'standalone',
          name: 'Standalone Videos',
          is_system: true,
        },
      }

      render(
        <VideoListItem
          video={standaloneVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('Standalone')).toBeInTheDocument()
    })

    it('shows No Series text when series is null', () => {
      const noSeriesVideo = {
        ...mockVideo,
        series: null,
      }

      render(
        <VideoListItem
          video={noSeriesVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('No Series')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Platform Handling
  // ============================================================================
  describe('Platform Handling', () => {
    it('shows dash when platform is empty', () => {
      const noPlatformVideo = {
        ...mockVideo,
        platform: '',
      }

      render(
        <VideoListItem
          video={noPlatformVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Status Variants
  // ============================================================================
  describe('Status Variants', () => {
    it('renders published status', () => {
      const publishedVideo = {
        ...mockVideo,
        status: 'published',
      }

      render(
        <VideoListItem
          video={publishedVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('published')).toBeInTheDocument()
    })

    it('renders generated status', () => {
      const generatedVideo = {
        ...mockVideo,
        status: 'generated',
      }

      render(
        <VideoListItem
          video={generatedVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('generated')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Action Callbacks
  // ============================================================================
  describe('Action Callbacks', () => {
    it('calls onDuplicate when duplicate is clicked', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      const buttons = screen.getAllByTestId('dropdown-item')
      // First button is Duplicate
      fireEvent.click(buttons[0])

      expect(mockOnDuplicate).toHaveBeenCalledWith('video-123')
    })

    it('calls onDelete when delete is clicked', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      const buttons = screen.getAllByTestId('dropdown-item')
      // Second button is Delete
      fireEvent.click(buttons[1])

      expect(mockOnDelete).toHaveBeenCalledWith('video-123')
    })
  })

  // ============================================================================
  // UI Elements
  // ============================================================================
  describe('UI Elements', () => {
    it('renders dropdown menu', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
    })

    it('renders menu trigger button', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      // Multiple buttons exist (trigger + menu items)
      expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1)
    })

    it('has accessible menu trigger', () => {
      render(
        <VideoListItem
          video={mockVideo}
          onDelete={mockOnDelete}
          onDuplicate={mockOnDuplicate}
        />
      )

      expect(screen.getByText('Open menu')).toHaveClass('sr-only')
    })
  })
})
