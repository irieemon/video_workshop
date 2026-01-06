/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoraSettingsManager } from '@/components/series/sora-settings-manager'

// Mock Next.js router
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Camera: () => <div data-testid="camera-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Type: () => <div data-testid="type-icon" />,
  Film: () => <div data-testid="film-icon" />,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('SoraSettingsManager', () => {
  const emptySettings = {
    sora_camera_style: null,
    sora_lighting_mood: null,
    sora_color_palette: null,
    sora_overall_tone: null,
    sora_narrative_prefix: null,
  }

  const filledSettings = {
    sora_camera_style: 'shot on 35mm film',
    sora_lighting_mood: 'soft morning light',
    sora_color_palette: 'warm amber tones',
    sora_overall_tone: 'minimalist luxury',
    sora_narrative_prefix: 'In the world of Adventure, ',
  }

  const defaultProps = {
    seriesId: 'series-123',
    seriesName: 'My Series',
    settings: emptySettings,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the header with title', () => {
      render(<SoraSettingsManager {...defaultProps} />)

      expect(screen.getByText('Sora Visual Consistency')).toBeInTheDocument()
    })

    it('renders the description', () => {
      render(<SoraSettingsManager {...defaultProps} />)

      expect(
        screen.getByText(/Define visual style settings that ensure consistency/)
      ).toBeInTheDocument()
    })

    it('renders the best practices badge', () => {
      render(<SoraSettingsManager {...defaultProps} />)

      expect(screen.getByText('Sora 2 Best Practices')).toBeInTheDocument()
    })

    it('renders sparkles icon in header', () => {
      render(<SoraSettingsManager {...defaultProps} />)

      // At least one sparkles icon in header
      expect(screen.getAllByTestId('sparkles-icon').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no settings', () => {
      render(<SoraSettingsManager {...defaultProps} settings={emptySettings} />)

      expect(screen.getByText('No Sora settings configured yet')).toBeInTheDocument()
    })

    it('shows configure button when no settings', () => {
      render(<SoraSettingsManager {...defaultProps} settings={emptySettings} />)

      expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument()
    })

    it('shows helpful description in empty state', () => {
      render(<SoraSettingsManager {...defaultProps} settings={emptySettings} />)

      expect(
        screen.getByText(/Configure visual consistency settings/)
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Display Mode (with settings)
  // ============================================================================
  describe('Display Mode', () => {
    it('shows settings when populated', () => {
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      expect(screen.getByText('shot on 35mm film')).toBeInTheDocument()
      expect(screen.getByText('soft morning light')).toBeInTheDocument()
      expect(screen.getByText('warm amber tones')).toBeInTheDocument()
      expect(screen.getByText('minimalist luxury')).toBeInTheDocument()
      expect(screen.getByText('In the world of Adventure,')).toBeInTheDocument()
    })

    it('shows Edit Settings button when settings exist', () => {
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      expect(screen.getByRole('button', { name: /edit settings/i })).toBeInTheDocument()
    })

    it('shows section labels for each setting', () => {
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      expect(screen.getByText('Camera/Film Style')).toBeInTheDocument()
      expect(screen.getByText('Lighting Mood')).toBeInTheDocument()
      expect(screen.getByText('Color Palette')).toBeInTheDocument()
      expect(screen.getByText('Overall Tone')).toBeInTheDocument()
      expect(screen.getByText('Narrative Prefix')).toBeInTheDocument()
    })

    it('hides sections for null settings', () => {
      render(
        <SoraSettingsManager
          {...defaultProps}
          settings={{ ...emptySettings, sora_camera_style: '35mm film' }}
        />
      )

      expect(screen.getByText('Camera/Film Style')).toBeInTheDocument()
      expect(screen.queryByText('Lighting Mood')).not.toBeInTheDocument()
      expect(screen.queryByText('Color Palette')).not.toBeInTheDocument()
    })

    it('shows correct icons for each setting type', () => {
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      expect(screen.getByTestId('camera-icon')).toBeInTheDocument()
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
      expect(screen.getByTestId('palette-icon')).toBeInTheDocument()
      expect(screen.getByTestId('type-icon')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Edit Mode
  // ============================================================================
  describe('Edit Mode', () => {
    it('enters edit mode when configure button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} settings={emptySettings} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))

      expect(screen.getByText('Configure Visual Consistency')).toBeInTheDocument()
    })

    it('enters edit mode when edit settings button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      await user.click(screen.getByRole('button', { name: /edit settings/i }))

      expect(screen.getByText('Configure Visual Consistency')).toBeInTheDocument()
    })

    it('shows all form fields in edit mode', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))

      expect(screen.getByLabelText(/Narrative Prefix/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Overall Tone/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Camera\/Film Style/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Lighting Mood/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Color Palette/)).toBeInTheDocument()
    })

    it('populates form with existing settings', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      await user.click(screen.getByRole('button', { name: /edit settings/i }))

      expect(screen.getByLabelText(/Narrative Prefix/)).toHaveValue(
        'In the world of Adventure, '
      )
      expect(screen.getByLabelText(/Overall Tone/)).toHaveValue('minimalist luxury')
      expect(screen.getByLabelText(/Camera\/Film Style/)).toHaveValue('shot on 35mm film')
    })

    it('shows helper text for fields', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))

      expect(
        screen.getByText(/Optional opening phrase for episodic continuity/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/The overarching visual aesthetic and mood/)
      ).toBeInTheDocument()
    })

    it('hides edit button when in edit mode', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))

      expect(screen.queryByRole('button', { name: /configure/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Form Submission
  // ============================================================================
  describe('Form Submission', () => {
    it('calls API when form submitted', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(filledSettings),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.type(screen.getByLabelText(/Overall Tone/), 'dramatic')
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series/series-123/sora-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      })
    })

    it('shows success message after save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(filledSettings),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(screen.getByText(/Sora settings updated successfully/)).toBeInTheDocument()
      })
    })

    it('clears success message after 3 seconds', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(filledSettings),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(screen.getByText(/Sora settings updated successfully/)).toBeInTheDocument()
      })

      // Advance timers by 3 seconds
      jest.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(
          screen.queryByText(/Sora settings updated successfully/)
        ).not.toBeInTheDocument()
      })
    })

    it('exits edit mode after successful save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(filledSettings),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(
          screen.queryByText('Configure Visual Consistency')
        ).not.toBeInTheDocument()
      })
    })

    it('refreshes router after successful save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(filledSettings),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('shows loading state while saving', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      expect(screen.getByText('Saving...')).toBeInTheDocument()

      // Resolve to clean up
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(emptySettings),
      })
    })

    it('shows error when API fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })
    })

    it('handles network error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Form Cancel
  // ============================================================================
  describe('Form Cancel', () => {
    it('exits edit mode when cancel clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      expect(screen.getByText('Configure Visual Consistency')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByText('Configure Visual Consistency')).not.toBeInTheDocument()
    })

    it('resets form to saved values when cancel clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} settings={filledSettings} />)

      await user.click(screen.getByRole('button', { name: /edit settings/i }))
      await user.clear(screen.getByLabelText(/Overall Tone/))
      await user.type(screen.getByLabelText(/Overall Tone/), 'changed value')

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Reopen to verify reset
      await user.click(screen.getByRole('button', { name: /edit settings/i }))
      expect(screen.getByLabelText(/Overall Tone/)).toHaveValue('minimalist luxury')
    })

    it('clears error when cancel clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'API error' }),
      })

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      await waitFor(() => {
        expect(screen.getByText('API error')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByText('API error')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Field Updates
  // ============================================================================
  describe('Field Updates', () => {
    it('updates narrative prefix field', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.type(screen.getByLabelText(/Narrative Prefix/), 'In the story, ')

      expect(screen.getByLabelText(/Narrative Prefix/)).toHaveValue('In the story, ')
    })

    it('updates camera style field', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.type(screen.getByLabelText(/Camera\/Film Style/), 'cinematic 16mm')

      expect(screen.getByLabelText(/Camera\/Film Style/)).toHaveValue('cinematic 16mm')
    })

    it('updates lighting mood field', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.type(screen.getByLabelText(/Lighting Mood/), 'golden hour')

      expect(screen.getByLabelText(/Lighting Mood/)).toHaveValue('golden hour')
    })

    it('updates color palette field', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.type(screen.getByLabelText(/Color Palette/), 'cool blues')

      expect(screen.getByLabelText(/Color Palette/)).toHaveValue('cool blues')
    })

    it('updates overall tone field', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.type(screen.getByLabelText(/Overall Tone/), 'dramatic')

      expect(screen.getByLabelText(/Overall Tone/)).toHaveValue('dramatic')
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles partial settings', () => {
      render(
        <SoraSettingsManager
          {...defaultProps}
          settings={{
            ...emptySettings,
            sora_camera_style: 'film look',
            sora_overall_tone: 'dramatic',
          }}
        />
      )

      expect(screen.getByText('film look')).toBeInTheDocument()
      expect(screen.getByText('dramatic')).toBeInTheDocument()
      expect(screen.queryByText('No Sora settings configured')).not.toBeInTheDocument()
    })

    it('uses series name in placeholder', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <SoraSettingsManager {...defaultProps} seriesName="Adventure Time" />
      )

      await user.click(screen.getByRole('button', { name: /configure/i }))

      const narrativePrefixInput = screen.getByLabelText(/Narrative Prefix/)
      expect(narrativePrefixInput).toHaveAttribute(
        'placeholder',
        expect.stringContaining('Adventure Time')
      )
    })

    it('disables buttons while loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      render(<SoraSettingsManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /configure/i }))
      await user.click(screen.getByRole('button', { name: /save settings/i }))

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()

      // Resolve to clean up
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(emptySettings),
      })
    })

    it('shows film icon on edit/configure button', () => {
      render(<SoraSettingsManager {...defaultProps} />)

      expect(screen.getByTestId('film-icon')).toBeInTheDocument()
    })
  })
})
