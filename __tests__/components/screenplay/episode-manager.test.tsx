/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EpisodeManager, EpisodeManagerHandle } from '@/components/screenplay/episode-manager'
import type { Episode } from '@/lib/types/database.types'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock useModal
const mockShowConfirm = jest.fn()
jest.mock('@/components/providers/modal-provider', () => ({
  useModal: () => ({
    showConfirm: mockShowConfirm,
  }),
}))

// Mock useToast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

// Mock ScreenplayChat component
jest.mock('@/components/screenplay/screenplay-chat', () => ({
  ScreenplayChat: ({
    open,
    onClose,
    seriesId,
    targetType,
    initialConcept,
  }: {
    open: boolean
    onClose: () => void
    seriesId: string
    targetType: string
    initialConcept?: any
  }) =>
    open ? (
      <div
        data-testid="screenplay-chat"
        data-target-type={targetType}
        data-initial-concept={JSON.stringify(initialConcept)}
      >
        <span>Chat for series: {seriesId}</span>
        <button onClick={onClose}>Close Chat</button>
      </div>
    ) : null,
}))

// Mock ScreenplayViewer component
jest.mock('@/components/screenplay/screenplay-viewer', () => ({
  ScreenplayViewer: ({
    open,
    onClose,
    episode,
  }: {
    open: boolean
    onClose: () => void
    episode: any
  }) =>
    open ? (
      <div data-testid="screenplay-viewer" data-episode-id={episode.id}>
        <span>Viewing: {episode.title}</span>
        <button onClick={onClose}>Close Viewer</button>
      </div>
    ) : null,
}))

// Mock EpisodeVideoGenerator component
jest.mock('@/components/episodes', () => ({
  EpisodeVideoGenerator: ({
    episodeId,
    onVideoCreated,
  }: {
    episodeId: string
    onVideoCreated: (videoId: string) => void
  }) => (
    <div data-testid="video-generator" data-episode-id={episodeId}>
      <button onClick={() => onVideoCreated('new-video-123')}>Generate Video</button>
    </div>
  ),
}))

describe('EpisodeManager', () => {
  const mockEpisodes: Partial<Episode>[] = [
    {
      id: 'ep-1',
      series_id: 'series-123',
      user_id: 'user-456',
      episode_number: 1,
      season_number: 1,
      title: 'Pilot Episode',
      logline: 'A mysterious stranger arrives in town.',
      status: 'complete',
      screenplay_text: 'FADE IN...' + 'x'.repeat(5000), // ~5k chars
      structured_screenplay: {
        acts: [{ id: 1 }, { id: 2 }],
        scenes: [{ id: 1 }, { id: 2 }, { id: 3 }],
        beats: [{ id: 1 }],
      } as any,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-16T15:30:00Z',
    },
    {
      id: 'ep-2',
      series_id: 'series-123',
      user_id: 'user-456',
      episode_number: 2,
      season_number: 1,
      title: 'The Discovery',
      logline: 'Secrets begin to unravel.',
      status: 'in-progress',
      screenplay_text: null,
      structured_screenplay: null,
      created_at: '2024-01-17T10:00:00Z',
      updated_at: '2024-01-17T12:00:00Z',
    },
    {
      id: 'ep-3',
      series_id: 'series-123',
      user_id: 'user-456',
      episode_number: 3,
      season_number: 1,
      title: 'Rising Action',
      logline: null,
      status: 'draft',
      screenplay_text: null,
      structured_screenplay: null,
      created_at: '2024-01-18T10:00:00Z',
      updated_at: null,
    },
  ]

  const defaultProps = {
    seriesId: 'series-123',
    seriesName: 'Test Series',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()

    // Default mock for loading episodes
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ episodes: mockEpisodes }),
    })
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<EpisodeManager {...defaultProps} />)

      expect(screen.getByText('Loading episodes...')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders episode manager with title', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Episodes')).toBeInTheDocument()
      })
    })

    it('shows series name in description', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Manage episodes for Test Series/i)).toBeInTheDocument()
      })
    })

    it('renders New Episode button', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new episode/i })).toBeInTheDocument()
      })
    })

    it('displays all episode titles', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
        expect(screen.getByText('The Discovery')).toBeInTheDocument()
        expect(screen.getByText('Rising Action')).toBeInTheDocument()
      })
    })

    it('displays episode numbers with season', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('S1E1')).toBeInTheDocument()
        expect(screen.getByText('S1E2')).toBeInTheDocument()
        expect(screen.getByText('S1E3')).toBeInTheDocument()
      })
    })

    it('displays status badges', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('complete')).toBeInTheDocument()
        expect(screen.getByText('in-progress')).toBeInTheDocument()
        expect(screen.getByText('draft')).toBeInTheDocument()
      })
    })

    it('displays logline when available', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('A mysterious stranger arrives in town.')).toBeInTheDocument()
        expect(screen.getByText('Secrets begin to unravel.')).toBeInTheDocument()
      })
    })

    it('displays screenplay progress when available', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Screenplay Progress')).toBeInTheDocument()
        expect(screen.getByText(/5k characters written/i)).toBeInTheDocument()
      })
    })

    it('displays structure info when structured screenplay exists', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Structure')).toBeInTheDocument()
        expect(screen.getByText('2 Acts')).toBeInTheDocument()
        expect(screen.getByText('3 Scenes')).toBeInTheDocument()
        expect(screen.getByText('1 Beats')).toBeInTheDocument()
      })
    })

    it('displays last updated time', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        // Should have "Last updated:" text for each episode
        const lastUpdatedTexts = screen.getAllByText(/Last updated:/i)
        expect(lastUpdatedTexts.length).toBe(3)
      })
    })
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no episodes exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ episodes: [] }),
      })

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No episodes yet')).toBeInTheDocument()
      })
    })

    it('shows create first episode button in empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ episodes: [] }),
      })

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create first episode/i })).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Create Episode
  // ============================================================================
  describe('Create Episode', () => {
    it('opens chat dialog when clicking New Episode', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new episode/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /new episode/i }))

      expect(screen.getByTestId('screenplay-chat')).toBeInTheDocument()
    })

    it('calculates next episode number correctly', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new episode/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /new episode/i }))

      // Should have initial concept with episode 4 (after 3 existing)
      const chat = screen.getByTestId('screenplay-chat')
      const initialConcept = JSON.parse(chat.getAttribute('data-initial-concept') || '{}')
      expect(initialConcept.episode_number).toBe(4)
    })

    it('reloads episodes when chat closes', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new episode/i })).toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      await user.click(screen.getByRole('button', { name: /new episode/i }))
      await user.click(screen.getByRole('button', { name: /close chat/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  // ============================================================================
  // Edit Episode
  // ============================================================================
  describe('Edit Episode', () => {
    it('passes episode data to chat when editing', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      // Find edit button by title attribute
      const editButtons = screen.getAllByTitle('Continue with AI')
      await user.click(editButtons[0])

      const chat = screen.getByTestId('screenplay-chat')
      const initialConcept = JSON.parse(chat.getAttribute('data-initial-concept') || '{}')

      expect(initialConcept.title).toBe('Pilot Episode')
      expect(initialConcept.logline).toBe('A mysterious stranger arrives in town.')
      expect(initialConcept.episode_number).toBe(1)
    })
  })

  // ============================================================================
  // Delete Episode
  // ============================================================================
  describe('Delete Episode', () => {
    it('shows confirmation dialog when clicking delete', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(false)

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete episode')
      await user.click(deleteButtons[0])

      expect(mockShowConfirm).toHaveBeenCalledWith(
        'Delete Episode',
        'Are you sure you want to delete Pilot Episode? This action cannot be undone.',
        expect.objectContaining({
          variant: 'destructive',
          confirmLabel: 'Delete',
        })
      )
    })

    it('deletes episode when confirmed', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(true)

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ episodes: mockEpisodes }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ episodes: mockEpisodes.slice(1) }),
        })

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete episode')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/episodes/ep-1',
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Episode Deleted',
        description: 'Pilot Episode has been successfully deleted.',
      })
    })

    it('does not delete when cancelled', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(false)

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete episode')
      await user.click(deleteButtons[0])

      expect(mockFetch).not.toHaveBeenCalledWith(
        '/api/episodes/ep-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('shows error toast on delete failure', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockShowConfirm.mockResolvedValueOnce(true)

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ episodes: mockEpisodes }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete episode')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Delete Failed',
          description: 'Failed to delete episode. Please try again.',
          variant: 'destructive',
        })
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // View Episode
  // ============================================================================
  describe('View Episode', () => {
    it('opens screenplay viewer when clicking view button', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const viewButtons = screen.getAllByTitle('View screenplay')
      await user.click(viewButtons[0])

      expect(screen.getByTestId('screenplay-viewer')).toBeInTheDocument()
      expect(screen.getByText('Viewing: Pilot Episode')).toBeInTheDocument()
    })

    it('passes episode data to viewer', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const viewButtons = screen.getAllByTitle('View screenplay')
      await user.click(viewButtons[0])

      const viewer = screen.getByTestId('screenplay-viewer')
      expect(viewer).toHaveAttribute('data-episode-id', 'ep-1')
    })

    it('closes viewer when close button clicked', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const viewButtons = screen.getAllByTitle('View screenplay')
      await user.click(viewButtons[0])

      expect(screen.getByTestId('screenplay-viewer')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /close viewer/i }))

      expect(screen.queryByTestId('screenplay-viewer')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Video Generation
  // ============================================================================
  describe('Video Generation', () => {
    it('opens video generator when clicking video button', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const videoButtons = screen.getAllByTitle('Generate video')
      await user.click(videoButtons[0])

      expect(screen.getByTestId('video-generator')).toBeInTheDocument()
    })

    it('passes episode ID to video generator', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const videoButtons = screen.getAllByTitle('Generate video')
      await user.click(videoButtons[0])

      const generator = screen.getByTestId('video-generator')
      expect(generator).toHaveAttribute('data-episode-id', 'ep-1')
    })

    it('navigates to video page when video is created', async () => {
      const user = userEvent.setup()
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const videoButtons = screen.getAllByTitle('Generate video')
      await user.click(videoButtons[0])

      // Click generate video in the mock component
      await user.click(screen.getByRole('button', { name: /generate video/i }))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Video Created',
        description: 'Video prompt generated successfully. Redirecting...',
      })

      expect(mockPush).toHaveBeenCalledWith('/dashboard/videos/new-video-123')
    })
  })

  // ============================================================================
  // Episode Details Link
  // ============================================================================
  describe('Episode Details Link', () => {
    it('renders details link for each episode', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const detailsLinks = screen.getAllByRole('link', { name: /details/i })
      expect(detailsLinks.length).toBe(3)
    })

    it('links to correct episode detail page', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      const detailsLinks = screen.getAllByRole('link', { name: /details/i })
      expect(detailsLinks[0]).toHaveAttribute('href', '/dashboard/episodes/ep-1')
      expect(detailsLinks[1]).toHaveAttribute('href', '/dashboard/episodes/ep-2')
      expect(detailsLinks[2]).toHaveAttribute('href', '/dashboard/episodes/ep-3')
    })
  })

  // ============================================================================
  // Status Colors
  // ============================================================================
  describe('Status Colors', () => {
    it('applies correct color for complete status', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        const completeBadge = screen.getByText('complete')
        expect(completeBadge).toHaveClass('bg-green-100', 'text-green-800')
      })
    })

    it('applies correct color for in-progress status', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        const inProgressBadge = screen.getByText('in-progress')
        expect(inProgressBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
      })
    })

    it('applies correct color for draft status', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        const draftBadge = screen.getByText('draft')
        expect(draftBadge).toHaveClass('bg-blue-100', 'text-blue-800')
      })
    })
  })

  // ============================================================================
  // Ref Handle
  // ============================================================================
  describe('Ref Handle', () => {
    it('exposes refresh function via ref', async () => {
      const ref = React.createRef<EpisodeManagerHandle>()

      render(<EpisodeManager {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Call refresh via ref
      await ref.current?.refresh()

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('handles load error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })

      consoleSpy.mockRestore()
    })

    it('handles undefined episodes from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No episodes yet')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // API Integration
  // ============================================================================
  describe('API Integration', () => {
    it('calls correct API endpoint to load episodes', async () => {
      render(<EpisodeManager {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/episodes?seriesId=series-123')
      })
    })
  })
})
