/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EpisodeSelector, EpisodeData } from '@/components/videos/episode-selector'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Suppress console.error and console.log in tests
const originalConsoleError = console.error
const originalConsoleLog = console.log
beforeAll(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})
afterAll(() => {
  console.error = originalConsoleError
  console.log = originalConsoleLog
})

// Mock alert
global.alert = jest.fn()

// Mock episode data
const mockEpisodes = [
  {
    id: 'ep-1',
    series_id: 'series-123',
    title: 'Pilot Episode',
    logline: 'The hero begins their journey in this exciting pilot.',
    synopsis: 'A young hero discovers their powers and sets out on an adventure.',
    screenplay_text: 'FADE IN:\n\nEXT. VILLAGE - DAY\n\nOur hero walks...',
    structured_screenplay: {
      scenes: [
        { id: 'scene-1', heading: 'EXT. VILLAGE - DAY' },
        { id: 'scene-2', heading: 'INT. HERO HOME - NIGHT' },
      ],
    },
    season_number: 1,
    episode_number: 1,
    status: 'draft',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ep-2',
    series_id: 'series-123',
    title: 'The Challenge',
    logline: 'Our hero faces their first major obstacle.',
    synopsis: null,
    screenplay_text: null,
    structured_screenplay: null,
    season_number: 1,
    episode_number: 2,
    status: 'in_progress',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'ep-3',
    series_id: 'series-123',
    title: 'Season Finale',
    logline: 'The epic conclusion.',
    synopsis: 'All threads come together in this finale.',
    screenplay_text: 'FADE IN:\n\nINT. CASTLE - NIGHT',
    structured_screenplay: {
      scenes: [{ id: 'scene-1', heading: 'INT. CASTLE - NIGHT' }],
    },
    season_number: 1,
    episode_number: 10,
    status: 'completed',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
]

const mockFullEpisodeData = {
  episode: mockEpisodes[0],
  series: { id: 'series-123', name: 'Test Series' },
  characters: [
    { id: 'char-1', name: 'Hero', description: 'The main character', role: 'protagonist' },
    { id: 'char-2', name: 'Mentor', description: 'Wise guide', role: 'supporting' },
  ],
  settings: [
    {
      id: 'setting-1',
      name: 'Village Square',
      description: 'Central gathering place',
      environment_type: 'exterior',
      time_of_day: 'day',
      atmosphere: 'peaceful',
    },
  ],
  suggestedCharacters: ['char-1', 'char-2'],
  suggestedSettings: ['setting-1'],
}

describe('EpisodeSelector', () => {
  const defaultProps = {
    seriesId: 'series-123',
    selectedEpisodeId: null as string | null,
    onEpisodeSelect: jest.fn(),
    onEpisodeDataLoaded: jest.fn(),
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
      const { container } = render(<EpisodeSelector {...defaultProps} seriesId={null} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders loading spinner while fetching episodes', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<EpisodeSelector {...defaultProps} />)

      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders empty state when no episodes exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: [] }),
      })

      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No episodes available for this series yet.')).toBeInTheDocument()
      })
    })

    it('renders episode selector dropdown when episodes exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })

      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })
    })

    it('displays component title and description', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })

      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Episode Source')).toBeInTheDocument()
        expect(screen.getByText(/Use an existing episode screenplay/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Episode Selection
  // ============================================================================
  describe('Episode Selection', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockFullEpisodeData,
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('calls onEpisodeSelect when an episode is selected', async () => {
      const onEpisodeSelect = jest.fn()

      render(
        <EpisodeSelector {...defaultProps} onEpisodeSelect={onEpisodeSelect} />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      expect(onEpisodeSelect).toHaveBeenCalledWith('ep-1')
    })

    it('fetches full episode data when episode is selected', async () => {
      const onEpisodeDataLoaded = jest.fn()

      render(
        <EpisodeSelector {...defaultProps} onEpisodeDataLoaded={onEpisodeDataLoaded} />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/episodes/ep-1/full-data')
      })

      await waitFor(() => {
        expect(onEpisodeDataLoaded).toHaveBeenCalled()
      })
    })

    it('calls onEpisodeSelect with null when selecting manual mode', async () => {
      const onEpisodeSelect = jest.fn()

      render(
        <EpisodeSelector
          {...defaultProps}
          selectedEpisodeId="ep-1"
          onEpisodeSelect={onEpisodeSelect}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })

      expect(onEpisodeSelect).toHaveBeenCalledWith(null)
    })

    it('clears episode data when switching to manual mode', async () => {
      const onEpisodeDataLoaded = jest.fn()

      render(
        <EpisodeSelector
          {...defaultProps}
          selectedEpisodeId="ep-1"
          onEpisodeDataLoaded={onEpisodeDataLoaded}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })

      expect(onEpisodeDataLoaded).toHaveBeenCalledWith(null)
    })
  })

  // ============================================================================
  // Episode Display Format
  // ============================================================================
  describe('Episode Display Format', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })
    })

    it('displays episodes in correct format (SxEx: Title)', async () => {
      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      const options = select.querySelectorAll('option')

      // First option is manual mode
      expect(options[0].textContent).toBe('Manual video creation')
      expect(options[1].textContent).toBe('S1E1: Pilot Episode')
      expect(options[2].textContent).toBe('S1E2: The Challenge')
      expect(options[3].textContent).toBe('S1E10: Season Finale')
    })

    it('includes manual creation option', async () => {
      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Manual video creation' })).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Selected Episode Details
  // ============================================================================
  describe('Selected Episode Details', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockFullEpisodeData,
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('displays selected episode title', async () => {
      render(
        <EpisodeSelector {...defaultProps} selectedEpisodeId="ep-1" />
      )

      await waitFor(() => {
        expect(screen.getByText('Pilot Episode')).toBeInTheDocument()
      })
    })

    it('displays selected episode logline when available', async () => {
      render(
        <EpisodeSelector {...defaultProps} selectedEpisodeId="ep-1" />
      )

      await waitFor(() => {
        expect(screen.getByText('The hero begins their journey in this exciting pilot.')).toBeInTheDocument()
      })
    })

    it('displays season and episode badge', async () => {
      render(
        <EpisodeSelector {...defaultProps} selectedEpisodeId="ep-1" />
      )

      await waitFor(() => {
        expect(screen.getByText('S1E1')).toBeInTheDocument()
      })
    })

    it('displays episode status badge', async () => {
      render(
        <EpisodeSelector {...defaultProps} selectedEpisodeId="ep-1" />
      )

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument()
      })
    })

    it('shows data loaded confirmation message', async () => {
      render(
        <EpisodeSelector {...defaultProps} selectedEpisodeId="ep-1" />
      )

      // Wait for full data to load
      await waitFor(() => {
        expect(screen.getByText('Episode Data Loaded')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  // ============================================================================
  // Episode Data Loading
  // ============================================================================
  describe('Episode Data Loading', () => {
    it('shows loading indicator while fetching episode data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          // Delay the response to show loading state
          return new Promise(() => {})
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(screen.getByText('Loading episode data...')).toBeInTheDocument()
      })
    })

    it('handles episode data fetch error', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          return Promise.resolve({
            ok: false,
            status: 500,
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<EpisodeSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to fetch episode data')
      })
    })

    it('generates detailed brief from episode data', async () => {
      const onEpisodeDataLoaded = jest.fn()

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockFullEpisodeData,
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(
        <EpisodeSelector {...defaultProps} onEpisodeDataLoaded={onEpisodeDataLoaded} />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(onEpisodeDataLoaded).toHaveBeenCalled()
      })

      const callArg = onEpisodeDataLoaded.mock.calls.find(
        (call: any[]) => call[0] !== null
      )?.[0] as EpisodeData | undefined

      expect(callArg).toBeDefined()
      expect(callArg?.brief).toContain('Test Series')
      expect(callArg?.brief).toContain('Season 1')
      expect(callArg?.brief).toContain('Pilot Episode')
    })

    it('includes screenplay metadata in loaded data', async () => {
      const onEpisodeDataLoaded = jest.fn()

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockFullEpisodeData,
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(
        <EpisodeSelector {...defaultProps} onEpisodeDataLoaded={onEpisodeDataLoaded} />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(onEpisodeDataLoaded).toHaveBeenCalled()
      })

      const callArg = onEpisodeDataLoaded.mock.calls.find(
        (call: any[]) => call[0] !== null
      )?.[0] as EpisodeData | undefined

      expect(callArg?.hasScreenplay).toBe(true)
      expect(callArg?.sceneCount).toBe(2)
    })
  })

  // ============================================================================
  // Disabled State
  // ============================================================================
  describe('Disabled State', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })
    })

    it('disables select when disabled prop is true', async () => {
      render(<EpisodeSelector {...defaultProps} disabled={true} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeDisabled()
      })
    })

    it('allows selection when not disabled', async () => {
      render(<EpisodeSelector {...defaultProps} disabled={false} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).not.toBeDisabled()
      })
    })
  })

  // ============================================================================
  // Series Change Handling
  // ============================================================================
  describe('Series Change Handling', () => {
    it('fetches new episodes when seriesId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })

      const { rerender } = render(
        <EpisodeSelector {...defaultProps} seriesId="series-123" />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/episodes?seriesId=series-123')
      })

      // Change series
      rerender(<EpisodeSelector {...defaultProps} seriesId="series-456" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/episodes?seriesId=series-456')
      })
    })

    it('resets episode selection when series changes', async () => {
      const onEpisodeSelect = jest.fn()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })

      const { rerender } = render(
        <EpisodeSelector
          {...defaultProps}
          seriesId="series-123"
          onEpisodeSelect={onEpisodeSelect}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Change series
      rerender(
        <EpisodeSelector
          {...defaultProps}
          seriesId="series-456"
          onEpisodeSelect={onEpisodeSelect}
        />
      )

      // Should reset selection to null
      expect(onEpisodeSelect).toHaveBeenCalledWith(null)
    })

    it('clears episodes when seriesId becomes null', async () => {
      const onEpisodeSelect = jest.fn()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      })

      const { rerender } = render(
        <EpisodeSelector
          {...defaultProps}
          seriesId="series-123"
          onEpisodeSelect={onEpisodeSelect}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Set seriesId to null
      rerender(
        <EpisodeSelector
          {...defaultProps}
          seriesId={null}
          onEpisodeSelect={onEpisodeSelect}
        />
      )

      expect(onEpisodeSelect).toHaveBeenCalledWith(null)
    })
  })

  // ============================================================================
  // Brief Generation
  // ============================================================================
  describe('Brief Generation', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/episodes?')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ episodes: mockEpisodes }),
          })
        }
        if (url.includes('/full-data')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockFullEpisodeData,
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('includes character information in brief', async () => {
      const onEpisodeDataLoaded = jest.fn()

      render(
        <EpisodeSelector {...defaultProps} onEpisodeDataLoaded={onEpisodeDataLoaded} />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(onEpisodeDataLoaded).toHaveBeenCalled()
      })

      const callArg = onEpisodeDataLoaded.mock.calls.find(
        (call: any[]) => call[0] !== null
      )?.[0] as EpisodeData | undefined

      expect(callArg?.brief).toContain('Characters involved')
      expect(callArg?.brief).toContain('Hero')
      expect(callArg?.brief).toContain('protagonist')
    })

    it('includes settings information in brief', async () => {
      const onEpisodeDataLoaded = jest.fn()

      render(
        <EpisodeSelector {...defaultProps} onEpisodeDataLoaded={onEpisodeDataLoaded} />
      )

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ep-1' } })

      await waitFor(() => {
        expect(onEpisodeDataLoaded).toHaveBeenCalled()
      })

      const callArg = onEpisodeDataLoaded.mock.calls.find(
        (call: any[]) => call[0] !== null
      )?.[0] as EpisodeData | undefined

      expect(callArg?.brief).toContain('locations and settings')
      expect(callArg?.brief).toContain('Village Square')
    })
  })
})
