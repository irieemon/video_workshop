/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CharacterSelector } from '@/components/videos/character-selector'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock character data
const mockCharacters = [
  {
    id: 'char-1',
    name: 'Alex Hero',
    description: 'The brave protagonist who never backs down from a challenge.',
    role: 'protagonist' as const,
    visual_reference_url: 'https://example.com/alex.jpg',
    sora_prompt_template: 'Alex, a young hero with determined eyes',
  },
  {
    id: 'char-2',
    name: 'Sam Sidekick',
    description: 'Loyal friend and trusted companion on every adventure.',
    role: 'supporting' as const,
    visual_reference_url: null,
    sora_prompt_template: null,
  },
  {
    id: 'char-3',
    name: 'Background Villager',
    description: 'A townsperson who appears in crowd scenes.',
    role: 'background' as const,
    visual_reference_url: null,
    sora_prompt_template: null,
  },
  {
    id: 'char-4',
    name: 'Mysterious Stranger',
    description: 'An enigmatic figure with unknown motives.',
    role: null,
    visual_reference_url: 'https://example.com/stranger.jpg',
    sora_prompt_template: 'A cloaked figure shrouded in mystery',
  },
]

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('CharacterSelector', () => {
  const defaultProps = {
    seriesId: 'series-123',
    selectedCharacters: [] as string[],
    onSelectionChange: jest.fn(),
    disabled: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // ============================================================================
  // Rendering States
  // ============================================================================
  describe('Rendering States', () => {
    it('returns null when no seriesId is provided', () => {
      const { container } = render(
        <CharacterSelector {...defaultProps} seriesId={null} />,
        { wrapper: createWrapper() }
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders loading state while fetching characters', async () => {
      // Never resolve to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(
        <CharacterSelector {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
      expect(screen.getByText('Loading characters...')).toBeInTheDocument()
    })

    it('renders error state when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Failed to load characters')).toBeInTheDocument()
      })
    })

    it('renders error state when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Failed to load characters')).toBeInTheDocument()
      })
    })

    it('renders empty state when no characters exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      })

      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/No characters defined for this series yet/)).toBeInTheDocument()
      })
    })

    it('renders character list when characters exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })

      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Alex Hero')).toBeInTheDocument()
        expect(screen.getByText('Sam Sidekick')).toBeInTheDocument()
        expect(screen.getByText('Background Villager')).toBeInTheDocument()
        expect(screen.getByText('Mysterious Stranger')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Character Selection
  // ============================================================================
  describe('Character Selection', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('calls onSelectionChange when selecting a character', async () => {
      const onSelectionChange = jest.fn()

      render(
        <CharacterSelector
          {...defaultProps}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Alex Hero')).toBeInTheDocument()
      })

      // Click on character checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Alex Hero/i })
      fireEvent.click(checkbox)

      expect(onSelectionChange).toHaveBeenCalledWith(['char-1'])
    })

    it('deselects character when already selected', async () => {
      const onSelectionChange = jest.fn()

      render(
        <CharacterSelector
          {...defaultProps}
          selectedCharacters={['char-1']}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Alex Hero')).toBeInTheDocument()
      })

      // Click on already selected character
      const checkbox = screen.getByRole('checkbox', { name: /Alex Hero/i })
      fireEvent.click(checkbox)

      expect(onSelectionChange).toHaveBeenCalledWith([])
    })

    it('handles multiple character selections', async () => {
      const onSelectionChange = jest.fn()

      render(
        <CharacterSelector
          {...defaultProps}
          selectedCharacters={['char-1']}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Sam Sidekick')).toBeInTheDocument()
      })

      // Select second character
      const checkbox = screen.getByRole('checkbox', { name: /Sam Sidekick/i })
      fireEvent.click(checkbox)

      expect(onSelectionChange).toHaveBeenCalledWith(['char-1', 'char-2'])
    })

    it('does not select when disabled', async () => {
      const onSelectionChange = jest.fn()

      render(
        <CharacterSelector
          {...defaultProps}
          disabled={true}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Alex Hero')).toBeInTheDocument()
      })

      // Try to click on character
      const checkbox = screen.getByRole('checkbox', { name: /Alex Hero/i })
      expect(checkbox).toBeDisabled()
    })
  })

  // ============================================================================
  // Select All / Deselect All
  // ============================================================================
  describe('Select All / Deselect All', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('shows Select All button when multiple characters exist', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Select All')).toBeInTheDocument()
      })
    })

    it('selects all characters when clicking Select All', async () => {
      const onSelectionChange = jest.fn()

      render(
        <CharacterSelector
          {...defaultProps}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Select All')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Select All'))

      expect(onSelectionChange).toHaveBeenCalledWith([
        'char-1',
        'char-2',
        'char-3',
        'char-4',
      ])
    })

    it('shows Deselect All when all characters are selected', async () => {
      render(
        <CharacterSelector
          {...defaultProps}
          selectedCharacters={['char-1', 'char-2', 'char-3', 'char-4']}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Deselect All')).toBeInTheDocument()
      })
    })

    it('deselects all when clicking Deselect All', async () => {
      const onSelectionChange = jest.fn()

      render(
        <CharacterSelector
          {...defaultProps}
          selectedCharacters={['char-1', 'char-2', 'char-3', 'char-4']}
          onSelectionChange={onSelectionChange}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Deselect All')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Deselect All'))

      expect(onSelectionChange).toHaveBeenCalledWith([])
    })

    it('disables Select All when disabled prop is true', async () => {
      render(
        <CharacterSelector {...defaultProps} disabled={true} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Select All')).toBeInTheDocument()
      })

      const selectAllButton = screen.getByText('Select All')
      expect(selectAllButton).toHaveClass('disabled:opacity-50')
    })
  })

  // ============================================================================
  // Role Badges
  // ============================================================================
  describe('Role Badges', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('displays protagonist badge for protagonist role', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('protagonist')).toBeInTheDocument()
      })
    })

    it('displays supporting badge for supporting role', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('supporting')).toBeInTheDocument()
      })
    })

    it('displays background badge for background role', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('background')).toBeInTheDocument()
      })
    })

    it('does not display badge when role is null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { ...mockCharacters[3] }, // Mysterious Stranger with null role
        ],
      })

      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Mysterious Stranger')).toBeInTheDocument()
      })

      // Should not have any role badges (protagonist, supporting, background)
      expect(screen.queryByText('protagonist')).not.toBeInTheDocument()
      expect(screen.queryByText('supporting')).not.toBeInTheDocument()
      expect(screen.queryByText('background')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Visual Reference Indicator
  // ============================================================================
  describe('Visual Reference Indicator', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('shows visual reference indicator when URL exists', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getAllByText('Visual reference available').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('does not show indicator when no visual reference', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockCharacters[1]], // Sam Sidekick has no visual reference
      })

      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Sam Sidekick')).toBeInTheDocument()
      })

      expect(screen.queryByText('Visual reference available')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Selection Count Display
  // ============================================================================
  describe('Selection Count Display', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('shows selection count when characters are selected', async () => {
      render(
        <CharacterSelector
          {...defaultProps}
          selectedCharacters={['char-1', 'char-2']}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/2 characters selected/)).toBeInTheDocument()
      })
    })

    it('uses singular form for single selection', async () => {
      render(
        <CharacterSelector
          {...defaultProps}
          selectedCharacters={['char-1']}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/1 character selected/)).toBeInTheDocument()
      })
    })

    it('does not show selection count when nothing selected', async () => {
      render(
        <CharacterSelector {...defaultProps} selectedCharacters={[]} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Alex Hero')).toBeInTheDocument()
      })

      expect(screen.queryByText(/character.*selected/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // API Request
  // ============================================================================
  describe('API Request', () => {
    it('fetches characters with correct series ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })

      render(
        <CharacterSelector {...defaultProps} seriesId="test-series-456" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series/test-series-456/characters')
      })
    })

    it('does not fetch when seriesId is null', async () => {
      render(
        <CharacterSelector {...defaultProps} seriesId={null} />,
        { wrapper: createWrapper() }
      )

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Character Descriptions
  // ============================================================================
  describe('Character Descriptions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('displays character descriptions', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(
          screen.getByText('The brave protagonist who never backs down from a challenge.')
        ).toBeInTheDocument()
      })
    })

    it('truncates long descriptions with line-clamp', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        const description = screen.getByText(
          'The brave protagonist who never backs down from a challenge.'
        )
        expect(description).toHaveClass('line-clamp-2')
      })
    })
  })

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCharacters,
      })
    })

    it('has accessible checkbox labels', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /Alex Hero/i })).toBeInTheDocument()
        expect(screen.getByRole('checkbox', { name: /Sam Sidekick/i })).toBeInTheDocument()
      })
    })

    it('checkboxes are properly associated with labels', async () => {
      render(<CharacterSelector {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /Alex Hero/i })
        expect(checkbox).toHaveAttribute('id', 'character-char-1')
      })
    })
  })
})
