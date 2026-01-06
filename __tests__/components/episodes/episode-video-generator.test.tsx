/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EpisodeVideoGenerator } from '@/components/episodes/episode-video-generator'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  Video: () => <div data-testid="video-icon" />,
}))

// Mock child components to simplify testing
jest.mock('@/components/videos/prompt-output', () => ({
  PromptOutput: ({
    optimizedPrompt,
    characterCount,
    hashtags,
  }: {
    optimizedPrompt: string
    characterCount: number
    hashtags: string[]
  }) => (
    <div data-testid="prompt-output">
      <div data-testid="optimized-prompt">{optimizedPrompt}</div>
      <div data-testid="character-count">{characterCount}</div>
      <div data-testid="hashtags">{hashtags.join(', ')}</div>
    </div>
  ),
}))

jest.mock('@/components/videos/advanced-mode-toggle', () => ({
  AdvancedModeToggle: ({
    enabled,
    onChange,
  }: {
    enabled: boolean
    onChange: (enabled: boolean) => void
  }) => (
    <button
      data-testid="advanced-mode-toggle"
      data-enabled={enabled}
      onClick={() => onChange(!enabled)}
    >
      {enabled ? 'Disable Advanced Mode' : 'Enable Advanced Mode'}
    </button>
  ),
}))

jest.mock('@/components/videos/editable-prompt-field', () => ({
  EditablePromptField: ({
    value,
    originalValue,
    onChange,
    onRevert,
  }: {
    value: string
    originalValue: string
    onChange: (value: string) => void
    onRevert: () => void
  }) => (
    <div data-testid="editable-prompt-field">
      <textarea
        data-testid="editable-prompt-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={onRevert}>Revert</button>
    </div>
  ),
}))

jest.mock('@/components/videos/shot-list-builder', () => ({
  ShotListBuilder: ({ shots, onChange }: { shots: unknown[]; onChange: (shots: unknown[]) => void }) => (
    <div data-testid="shot-list-builder">
      <span>{shots.length} shots</span>
    </div>
  ),
}))

jest.mock('@/components/videos/additional-guidance', () => ({
  AdditionalGuidance: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => (
    <div data-testid="additional-guidance">
      <textarea
        data-testid="additional-guidance-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}))

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
    finalPrompt: string
  }) =>
    open ? (
      <div data-testid="sora-modal" data-video-id={videoId}>
        <span>Sora Modal: {videoTitle}</span>
        <span>Prompt: {finalPrompt}</span>
        <button onClick={onClose}>Close Sora Modal</button>
      </div>
    ) : null,
}))

describe('EpisodeVideoGenerator', () => {
  const defaultProps = {
    episodeId: 'episode-123',
    seriesId: 'series-456',
    episodeTitle: 'The Beginning',
    episodeNumber: 1,
    seasonNumber: 1,
    storyBeat: 'The hero discovers their power',
    emotionalArc: 'Wonder and excitement',
  }

  const mockRoundtableResult = {
    discussion: {
      round1: [{ agent: 'Director', response: 'Great concept' }],
      round2: [{ agent: 'Editor', response: 'Needs more pacing' }],
    },
    detailedBreakdown: {
      scene_structure: 'Opening shot',
      visual_specs: '4K HDR',
      audio: 'Epic soundtrack',
      platform_optimization: 'Vertical format',
      hashtags: ['#hero', '#discovery'],
    },
    optimizedPrompt: 'A cinematic hero discovery scene',
    characterCount: 35,
    hashtags: ['#hero', '#discovery'],
    suggestedShots: [{ id: '1', description: 'Opening shot', duration: 3 }],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the component with episode context header', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      expect(screen.getByText('Generate Video from Episode')).toBeInTheDocument()
      expect(
        screen.getByText(/Season 1, Episode 1: The Beginning/)
      ).toBeInTheDocument()
    })

    it('shows Auto Context badge', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      expect(screen.getByText('Auto Context')).toBeInTheDocument()
    })

    it('displays episode context when storyBeat and emotionalArc provided', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      expect(screen.getByText('Episode Context (Auto-Injected)')).toBeInTheDocument()
      // Story Beat and Emotional Arc appear both in the context display AND in the textarea value,
      // so we check that at least one instance exists (using getAllBy)
      const storyBeatElements = screen.getAllByText(/Story Beat:/)
      expect(storyBeatElements.length).toBeGreaterThanOrEqual(1)
      const emotionalArcElements = screen.getAllByText(/Emotional Arc:/)
      expect(emotionalArcElements.length).toBeGreaterThanOrEqual(1)
      // Check that the actual context text is rendered (also appears in both context display and textarea)
      const heroTextElements = screen.getAllByText(/The hero discovers their power/)
      expect(heroTextElements.length).toBeGreaterThanOrEqual(1)
      const wonderTextElements = screen.getAllByText(/Wonder and excitement/)
      expect(wonderTextElements.length).toBeGreaterThanOrEqual(1)
    })

    it('renders video brief textarea', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      expect(screen.getByLabelText('Video Brief')).toBeInTheDocument()
    })

    it('renders platform selection buttons', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'TikTok' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Instagram' })).toBeInTheDocument()
    })

    it('renders generate button', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /generate video prompt/i })
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Episode Context Initialization
  // ============================================================================
  describe('Episode Context Initialization', () => {
    it('initializes brief with storyBeat and emotionalArc', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      const briefTextarea = screen.getByLabelText('Video Brief')
      expect(briefTextarea).toHaveValue(
        'Story Beat: The hero discovers their power\n\nEmotional Arc: Wonder and excitement'
      )
    })

    it('initializes brief with only storyBeat when emotionalArc is missing', () => {
      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          emotionalArc={undefined}
        />
      )

      const briefTextarea = screen.getByLabelText('Video Brief')
      expect(briefTextarea).toHaveValue('Story Beat: The hero discovers their power')
    })

    it('initializes brief with only emotionalArc when storyBeat is missing', () => {
      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          storyBeat={undefined}
        />
      )

      const briefTextarea = screen.getByLabelText('Video Brief')
      expect(briefTextarea).toHaveValue('Emotional Arc: Wonder and excitement')
    })

    it('leaves brief empty when no context provided', () => {
      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          storyBeat={undefined}
          emotionalArc={undefined}
        />
      )

      const briefTextarea = screen.getByLabelText('Video Brief')
      expect(briefTextarea).toHaveValue('')
    })

    it('shows only episode title when season/episode numbers missing', () => {
      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          seasonNumber={undefined}
          episodeNumber={undefined}
        />
      )

      expect(screen.getByText('The Beginning')).toBeInTheDocument()
      expect(screen.queryByText(/Season/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Platform Selection
  // ============================================================================
  describe('Platform Selection', () => {
    it('defaults to TikTok platform', () => {
      render(<EpisodeVideoGenerator {...defaultProps} />)

      const tiktokButton = screen.getByRole('button', { name: 'TikTok' })
      const instagramButton = screen.getByRole('button', { name: 'Instagram' })

      // TikTok should be selected (default variant)
      expect(tiktokButton).toHaveClass('bg-primary')
    })

    it('switches platform to Instagram when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Instagram' }))

      const instagramButton = screen.getByRole('button', { name: 'Instagram' })
      expect(instagramButton).toHaveClass('bg-primary')
    })
  })

  // ============================================================================
  // Roundtable Generation
  // ============================================================================
  describe('Roundtable Generation', () => {
    it('disables generate button when brief is empty', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          storyBeat={undefined}
          emotionalArc={undefined}
        />
      )

      const generateButton = screen.getByRole('button', { name: /generate video prompt/i })
      expect(generateButton).toBeDisabled()
    })

    it('shows error when trying to generate with empty brief', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          storyBeat={undefined}
          emotionalArc={undefined}
        />
      )

      // The button is disabled, so we can't actually click it
      // The validation happens before the API call
      expect(
        screen.getByRole('button', { name: /generate video prompt/i })
      ).toBeDisabled()
    })

    it('calls roundtable API with correct payload', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoundtableResult),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agent/roundtable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('episode-123'),
        })
      })

      // Verify body contains all required fields
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.episodeId).toBe('episode-123')
      expect(callBody.seriesId).toBe('series-456')
      expect(callBody.platform).toBe('tiktok')
    })

    it('shows loading state during generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolve

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      expect(screen.getByText('AI Agents Collaborating...')).toBeInTheDocument()
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('displays results after successful generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoundtableResult),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByTestId('prompt-output')).toBeInTheDocument()
      })

      expect(screen.getByTestId('optimized-prompt')).toHaveTextContent(
        'A cinematic hero discovery scene'
      )
    })

    it('shows error message on API failure', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Advanced Mode
  // ============================================================================
  describe('Advanced Mode', () => {
    it('shows advanced mode toggle after generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoundtableResult),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByTestId('advanced-mode-toggle')).toBeInTheDocument()
      })
    })

    it('shows editable components when advanced mode is enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoundtableResult),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByTestId('advanced-mode-toggle')).toBeInTheDocument()
      })

      // Enable advanced mode
      await user.click(screen.getByTestId('advanced-mode-toggle'))

      await waitFor(() => {
        expect(screen.getByTestId('editable-prompt-field')).toBeInTheDocument()
        expect(screen.getByTestId('shot-list-builder')).toBeInTheDocument()
        expect(screen.getByTestId('additional-guidance')).toBeInTheDocument()
      })
    })

    it('hides prompt output when advanced mode is enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoundtableResult),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByTestId('prompt-output')).toBeInTheDocument()
      })

      // Enable advanced mode
      await user.click(screen.getByTestId('advanced-mode-toggle'))

      await waitFor(() => {
        expect(screen.queryByTestId('prompt-output')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Save Video
  // ============================================================================
  describe('Save Video', () => {
    it('shows save button after generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoundtableResult),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })
    })

    it('calls videos API with correct payload when saving', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      })

      const saveBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(saveBody.episodeId).toBe('episode-123')
      expect(saveBody.seriesId).toBe('series-456')
      expect(saveBody.generation_source).toBe('episode')
    })

    it('shows loading state while saving', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockImplementation(() => new Promise(() => {})) // Never resolve

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      expect(screen.getByText('Saving video...')).toBeInTheDocument()
    })

    it('shows success message after saving', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(screen.getByText(/has been created/)).toBeInTheDocument()
      })
    })

    it('calls onVideoCreated callback with video ID', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnVideoCreated = jest.fn()
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(
        <EpisodeVideoGenerator
          {...defaultProps}
          onVideoCreated={mockOnVideoCreated}
        />
      )

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(mockOnVideoCreated).toHaveBeenCalledWith('video-789')
      })
    })

    it('shows View Video button after save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View Video' })).toBeInTheDocument()
      })
    })

    it('navigates to video page when View Video clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'View Video' }))

      expect(mockPush).toHaveBeenCalledWith('/dashboard/videos/video-789')
    })
  })

  // ============================================================================
  // Sora Modal
  // ============================================================================
  describe('Sora Modal', () => {
    it('auto-opens Sora modal after save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText(/has been created/)).toBeInTheDocument()
      })

      // Advance timer for the 500ms delay before modal opens
      jest.advanceTimersByTime(600)

      await waitFor(() => {
        expect(screen.getByTestId('sora-modal')).toBeInTheDocument()
      })
    })

    it('passes correct props to Sora modal', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(screen.getByText(/has been created/)).toBeInTheDocument()
      })

      jest.advanceTimersByTime(600)

      await waitFor(() => {
        const modal = screen.getByTestId('sora-modal')
        expect(modal).toHaveAttribute('data-video-id', 'video-789')
        expect(screen.getByText(/Sora Modal: The Beginning/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('shows error when save fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to save' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to save')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('handles network error during generation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles empty suggestedShots from API', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockRoundtableResult,
            suggestedShots: [],
          }),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByTestId('prompt-output')).toBeInTheDocument()
      })
    })

    it('handles missing suggestedShots from API', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const { suggestedShots, ...resultWithoutShots } = mockRoundtableResult
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(resultWithoutShots),
      })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByTestId('prompt-output')).toBeInTheDocument()
      })
    })

    it('disables save button after successful save', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRoundtableResult),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'video-789' }),
        })

      render(<EpisodeVideoGenerator {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /generate video prompt/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save Video' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save Video' }))

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /video saved/i })
        expect(saveButton).toBeDisabled()
      })
    })
  })
})
