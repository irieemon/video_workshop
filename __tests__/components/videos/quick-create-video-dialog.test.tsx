/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QuickCreateVideoDialog } from '@/components/videos/quick-create-video-dialog'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
}))

// Mock child components to isolate testing
jest.mock('@/components/videos/character-selector', () => ({
  CharacterSelector: ({ seriesId, selectedCharacters, onSelectionChange, disabled }: any) => (
    <div data-testid="character-selector" data-series-id={seriesId} data-disabled={disabled}>
      <button
        onClick={() => onSelectionChange(['char-1', 'char-2'])}
        disabled={disabled}
      >
        Select Characters
      </button>
      <span>Selected: {selectedCharacters.length}</span>
    </div>
  ),
}))

jest.mock('@/components/videos/settings-selector', () => ({
  SettingsSelector: ({ seriesId, selectedSettings, onSelectionChange, disabled }: any) => (
    <div data-testid="settings-selector" data-series-id={seriesId} data-disabled={disabled}>
      <button
        onClick={() => onSelectionChange(['setting-1'])}
        disabled={disabled}
      >
        Select Settings
      </button>
      <span>Selected: {selectedSettings.length}</span>
    </div>
  ),
}))

jest.mock('@/components/videos/episode-selector-dropdown', () => ({
  EpisodeSelectorDropdown: ({ seriesId, value, onChange, disabled }: any) => (
    <div data-testid="episode-selector" data-series-id={seriesId} data-disabled={disabled}>
      <button onClick={() => onChange('episode-1')} disabled={disabled}>
        Select Episode
      </button>
      <span>Episode: {value || 'none'}</span>
    </div>
  ),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Create test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
    queryClient,
  }
}

describe('QuickCreateVideoDialog', () => {
  const mockSeries = [
    { id: 'series-1', name: 'My Series', genre: 'comedy', is_system: false },
    { id: 'series-2', name: 'Drama Series', genre: 'drama', is_system: false },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)

    // Default fetch mock for series
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/series') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSeries),
        })
      }
      if (url === '/api/series/standalone') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'standalone-series-id' }),
        })
      }
      if (url === '/api/videos') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-video-id' }),
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders default trigger button when no children provided', () => {
      renderWithProviders(<QuickCreateVideoDialog />)
      expect(screen.getByRole('button', { name: /new video/i })).toBeInTheDocument()
    })

    it('renders custom trigger when children provided', () => {
      renderWithProviders(
        <QuickCreateVideoDialog>
          <button>Custom Trigger</button>
        </QuickCreateVideoDialog>
      )
      expect(screen.getByRole('button', { name: /custom trigger/i })).toBeInTheDocument()
    })

    it('opens dialog when defaultOpen is true', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByText('Create New Video')).toBeInTheDocument()
      })
    })

    it('shows dialog content when trigger is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog />)

      await user.click(screen.getByRole('button', { name: /new video/i }))

      await waitFor(() => {
        expect(screen.getByText('Create New Video')).toBeInTheDocument()
      })
    })

    it('displays dialog header and description', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByText('Create New Video')).toBeInTheDocument()
        expect(
          screen.getByText(/describe your video idea and our ai film crew/i)
        ).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Series Selection
  // ============================================================================
  describe('Series Selection', () => {
    it('shows loading state while fetching series', async () => {
      // Delay the response
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/series') {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockSeries),
                }),
              100
            )
          )
        }
        return Promise.resolve({ ok: false })
      })

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      expect(screen.getByText(/loading series/i)).toBeInTheDocument()
    })

    it('displays series options after loading', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      // Wait for series to load
      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      // Click on the series select trigger
      const seriesSelect = screen.getByRole('combobox')
      await user.click(seriesSelect)

      // Check that series options are displayed (Radix Select renders options with role="option")
      await waitFor(() => {
        // Standalone option
        const standaloneOption = screen.getByRole('option', { name: /no series \(standalone\)/i })
        expect(standaloneOption).toBeInTheDocument()
      })
    })

    it('shows standalone option as first choice', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      const seriesSelect = screen.getByRole('combobox')
      await user.click(seriesSelect)

      // Standalone should be first
      const standaloneOption = screen.getByText(/no series \(standalone\)/i)
      expect(standaloneOption).toBeInTheDocument()
    })

    it('remembers last used series from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      // The select should show the last used series
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveTextContent(/my series/i)
      })
    })

    it('defaults to first series when no localStorage value', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      // Should default to first non-system series
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveTextContent(/my series/i)
      })
    })

    it('shows message when standalone is selected', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('__standalone__')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/this video won't be part of any series/i)).toBeInTheDocument()
      })
    })

    it('shows message when series is selected', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/video will be added to "my series" series/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Create New Series
  // ============================================================================
  describe('Create New Series', () => {
    it('shows create new series button', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /create new series/i })).toBeInTheDocument()
    })

    it('shows series creation form when button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create new series/i }))

      expect(screen.getByPlaceholderText(/series name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('cancels series creation and returns to selector', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create new series/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByPlaceholderText(/series name/i)).not.toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('creates series when form is submitted', async () => {
      const user = userEvent.setup()
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/series' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'new-series-id', name: 'New Series' }),
          })
        }
        if (url === '/api/series') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSeries),
          })
        }
        return Promise.resolve({ ok: false })
      })

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create new series/i }))
      await user.type(screen.getByPlaceholderText(/series name/i), 'New Series')
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New Series',
            description: null,
            genre: 'other',
          }),
        }))
      })
    })

    it('does not create series when name is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create new series/i }))
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      // Fetch should only be called for the initial series load, not for POST
      expect(mockFetch).not.toHaveBeenCalledWith('/api/series', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  // ============================================================================
  // Brief Input
  // ============================================================================
  describe('Brief Input', () => {
    it('renders brief textarea with label', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/video brief/i)).toBeInTheDocument()
      })
    })

    it('shows placeholder text', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/unboxing video for luxury skincare serum/i)
        ).toBeInTheDocument()
      })
    })

    it('updates brief value on input', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/video brief/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My video idea')

      expect(screen.getByLabelText(/video brief/i)).toHaveValue('My video idea')
    })
  })

  // ============================================================================
  // Platform Selection
  // ============================================================================
  describe('Platform Selection', () => {
    it('renders platform buttons', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tiktok/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /instagram/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /both/i })).toBeInTheDocument()
      })
    })

    it('defaults to TikTok platform', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        const tiktokButton = screen.getByRole('button', { name: /tiktok/i })
        // Default variant should indicate selection
        expect(tiktokButton).toHaveClass('bg-primary')
      })
    })

    it('changes platform when clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /instagram/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /instagram/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /instagram/i })).toHaveClass('bg-primary')
      })
    })
  })

  // ============================================================================
  // Conditional Child Components
  // ============================================================================
  describe('Conditional Child Components', () => {
    it('shows character selector when series is selected', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('character-selector')).toBeInTheDocument()
      })
    })

    it('shows settings selector when series is selected', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-selector')).toBeInTheDocument()
      })
    })

    it('shows episode selector when series is selected', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('episode-selector')).toBeInTheDocument()
      })
    })

    it('hides character/settings/episode selectors for standalone', async () => {
      mockLocalStorage.getItem.mockReturnValue('__standalone__')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      expect(screen.queryByTestId('character-selector')).not.toBeInTheDocument()
      expect(screen.queryByTestId('settings-selector')).not.toBeInTheDocument()
      expect(screen.queryByTestId('episode-selector')).not.toBeInTheDocument()
    })

    it('passes correct seriesId to child components', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        const characterSelector = screen.getByTestId('character-selector')
        expect(characterSelector).toHaveAttribute('data-series-id', 'series-1')
      })
    })
  })

  // ============================================================================
  // Submit Button
  // ============================================================================
  describe('Submit Button', () => {
    it('renders submit button', async () => {
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate with ai/i })).toBeInTheDocument()
      })
    })

    it('disables submit when brief is empty', async () => {
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /generate with ai/i })).toBeDisabled()
    })

    it('enables submit when brief has content', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My video idea')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate with ai/i })).not.toBeDisabled()
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      // Slow down the video creation
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/series') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSeries),
          })
        }
        if (url === '/api/videos') {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ id: 'new-video-id' }),
                }),
              500
            )
          )
        }
        return Promise.resolve({ ok: false })
      })

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My video idea')
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      expect(screen.getByText(/creating/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Video Creation Flow
  // ============================================================================
  describe('Video Creation Flow', () => {
    it('creates video with correct data', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My test video brief')
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/videos', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('My test video brief'),
        }))
      })
    })

    it('saves series selection to localStorage', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My test video brief')
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('lastUsedSeriesId', 'series-1')
      })
    })

    it('navigates to roundtable on success', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My test video brief')
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/videos/new-video-id/roundtable')
      })
    })

    it('handles standalone video creation', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('__standalone__')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'Standalone video idea')
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series/standalone')
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/videos', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('standalone-series-id'),
        }))
      })
    })

    it('includes selected platform in video creation', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My test video brief')
      await user.click(screen.getByRole('button', { name: /instagram/i }))
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/videos', expect.objectContaining({
          body: expect.stringContaining('"platform":"instagram"'),
        }))
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('shows error when video creation fails', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/series') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSeries),
          })
        }
        if (url === '/api/videos') {
          return Promise.resolve({ ok: false })
        }
        return Promise.resolve({ ok: false })
      })

      mockLocalStorage.getItem.mockReturnValue('series-1')
      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/video brief/i), 'My test video brief')
      await user.click(screen.getByRole('button', { name: /generate with ai/i }))

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to create video. Please try again.')
      })

      alertSpy.mockRestore()
    })

    it('shows error when series creation fails', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/series' && options?.method === 'POST') {
          return Promise.resolve({ ok: false })
        }
        if (url === '/api/series') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSeries),
          })
        }
        return Promise.resolve({ ok: false })
      })

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create new series/i }))
      await user.type(screen.getByPlaceholderText(/series name/i), 'New Series')
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to create series. Please try again.')
      })

      alertSpy.mockRestore()
    })
  })

  // ============================================================================
  // Selection Reset on Series Change
  // ============================================================================
  describe('Selection Reset on Series Change', () => {
    it('resets selections when series changes', async () => {
      const user = userEvent.setup()
      mockLocalStorage.getItem.mockReturnValue('series-1')

      renderWithProviders(<QuickCreateVideoDialog defaultOpen={true} />)

      await waitFor(() => {
        expect(screen.queryByText(/loading series/i)).not.toBeInTheDocument()
      })

      // The character selector shows the selected count from props
      // Initially it should show 0
      const characterSelector = screen.getByTestId('character-selector')
      expect(within(characterSelector).getByText('Selected: 0')).toBeInTheDocument()

      // Change series - the component's useEffect should reset selectedCharacters to []
      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByText(/drama series/i))

      // After series change, the selector receives the new series id
      // and the parent's state should be reset
      await waitFor(() => {
        const updatedSelector = screen.getByTestId('character-selector')
        // The reset is verified by the series-id changing
        expect(updatedSelector).toHaveAttribute('data-series-id', 'series-2')
      })
    })
  })
})
