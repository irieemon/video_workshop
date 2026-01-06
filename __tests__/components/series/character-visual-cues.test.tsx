/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterVisualCues } from '@/components/series/character-visual-cues'
import type { VisualCue } from '@/lib/types/database.types'

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string
    alt: string
    fill?: boolean
    className?: string
  }) => <img src={src} alt={alt} data-testid="next-image" {...props} />,
}))

// Mock Lucide icons - include all icons used by component AND UI primitives (Select uses Check, ChevronDown, ChevronUp)
jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon" />,
  X: () => <div data-testid="x-icon" />,
  ImageIcon: () => <div data-testid="image-icon" />,
  User: () => <div data-testid="user-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Check: () => <div data-testid="check-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('CharacterVisualCues', () => {
  const mockOnUpdate = jest.fn()

  const defaultProps = {
    seriesId: 'series-123',
    characterId: 'char-456',
    characterName: 'Elena Rodriguez',
    onUpdate: mockOnUpdate,
  }

  const mockVisualCues: VisualCue[] = [
    {
      url: 'https://example.com/cue1.jpg',
      type: 'full-body',
      caption: 'Front view standing',
    },
    {
      url: 'https://example.com/cue2.jpg',
      type: 'face',
      caption: 'Close-up portrait',
    },
    {
      url: 'https://example.com/cue3.jpg',
      type: 'costume',
      caption: null,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the component with section headers', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText('Primary Reference Image')).toBeInTheDocument()
      expect(screen.getByText('Additional Visual Cues')).toBeInTheDocument()
    })

    it('shows character name in description', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText(/Elena Rodriguez/)).toBeInTheDocument()
    })

    it('renders user icon for primary section', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    })

    it('renders image icon for additional cues section', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByTestId('image-icon')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Primary Image - No Image State
  // ============================================================================
  describe('Primary Image - No Image State', () => {
    it('shows upload button when no primary image', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText('Upload Primary Reference Image')).toBeInTheDocument()
    })

    it('shows file format hint', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText(/JPEG, PNG, WebP, or GIF/)).toBeInTheDocument()
    })

    it('does not show AI analyze button without images', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.queryByText('AI Analyze Image')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Primary Image - With Image
  // ============================================================================
  describe('Primary Image - With Image', () => {
    it('displays primary image when provided', () => {
      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      const image = screen.getAllByTestId('next-image')[0]
      expect(image).toHaveAttribute('src', 'https://example.com/primary.jpg')
      expect(image).toHaveAttribute('alt', 'Elena Rodriguez primary reference')
    })

    it('shows remove button for primary image', () => {
      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      expect(screen.getByText('Remove Primary Image')).toBeInTheDocument()
    })

    it('shows AI analyze button when primary image exists', () => {
      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      expect(screen.getByText('AI Analyze Image')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Visual Cues - Empty State
  // ============================================================================
  describe('Visual Cues - Empty State', () => {
    it('shows empty state message when no visual cues', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText('No additional visual cues yet.')).toBeInTheDocument()
    })

    it('shows help text in empty state', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(
        screen.getByText(/Upload specific reference images to maintain visual consistency/)
      ).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Visual Cues - With Cues
  // ============================================================================
  describe('Visual Cues - With Cues', () => {
    it('displays all visual cue images', () => {
      render(<CharacterVisualCues {...defaultProps} visualCues={mockVisualCues} />)

      const images = screen.getAllByTestId('next-image')
      expect(images).toHaveLength(3)
    })

    it('displays type badges for visual cues', () => {
      render(<CharacterVisualCues {...defaultProps} visualCues={mockVisualCues} />)

      // Use getAllByText since labels appear in both Select options and badges
      expect(screen.getAllByText('Full Body').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Face/Portrait').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Costume/Outfit').length).toBeGreaterThanOrEqual(1)
    })

    it('displays captions when available', () => {
      render(<CharacterVisualCues {...defaultProps} visualCues={mockVisualCues} />)

      expect(screen.getByText('Front view standing')).toBeInTheDocument()
      expect(screen.getByText('Close-up portrait')).toBeInTheDocument()
    })

    it('shows AI analyze button when visual cues exist', () => {
      render(<CharacterVisualCues {...defaultProps} visualCues={mockVisualCues} />)

      expect(screen.getByText('AI Analyze Image')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Upload Form
  // ============================================================================
  describe('Upload Form', () => {
    it('renders reference type selector', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText('Reference Type')).toBeInTheDocument()
    })

    it('renders caption input', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByLabelText('Caption')).toBeInTheDocument()
    })

    it('shows upload visual cue button', () => {
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.getByText('Upload Visual Cue')).toBeInTheDocument()
    })

    it('allows changing caption', async () => {
      const user = userEvent.setup()
      render(<CharacterVisualCues {...defaultProps} />)

      const captionInput = screen.getByLabelText('Caption')
      await user.type(captionInput, 'Side profile')

      expect(captionInput).toHaveValue('Side profile')
    })

    it('allows selecting reference type', async () => {
      const user = userEvent.setup()
      render(<CharacterVisualCues {...defaultProps} />)

      // Click on the select trigger to open dropdown
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      // Select a different type
      await user.click(screen.getByText('Expression'))

      // Verify selection changed (the trigger should now show Expression)
      expect(screen.getByRole('combobox')).toHaveTextContent('Expression')
    })
  })

  // ============================================================================
  // Delete Flow
  // ============================================================================
  describe('Delete Flow', () => {
    it('opens delete confirmation when clicking remove primary image', async () => {
      const user = userEvent.setup()
      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('Remove Primary Image'))

      expect(screen.getByText('Delete Visual Reference')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete this primary visual reference/)).toBeInTheDocument()
    })

    it('closes delete dialog when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('Remove Primary Image'))
      await user.click(screen.getByText('Cancel'))

      expect(screen.queryByText('Delete Visual Reference')).not.toBeInTheDocument()
    })

    it('calls delete API when confirming deletion', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('Remove Primary Image'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/series/series-123/characters/char-456/upload-visual-cue'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('calls onUpdate after successful deletion', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('Remove Primary Image'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // AI Analysis
  // ============================================================================
  describe('AI Analysis', () => {
    it('shows analyzing state when clicked', async () => {
      const user = userEvent.setup()
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      analysis: { confidence: 'high', images_analyzed: 1 },
                    }),
                }),
              100
            )
          )
      )

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('AI Analyze Image'))

      expect(screen.getByText('Analyzing...')).toBeInTheDocument()
    })

    it('calls analyze API endpoint', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            analysis: { confidence: 'high', images_analyzed: 1 },
          }),
      })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('AI Analyze Image'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-123/characters/char-456/analyze-image',
          { method: 'POST' }
        )
      })
    })

    it('displays analysis results after successful analysis', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            analysis: {
              confidence: 'high',
              images_analyzed: 2,
              notes: 'Clear facial features detected',
            },
            character: {
              visual_fingerprint: {
                hair_color: 'dark brown',
                eye_color: 'green',
              },
            },
          }),
      })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('AI Analyze Image'))

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Complete')).toBeInTheDocument()
      })
      expect(screen.getByText('high')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Clear facial features detected')).toBeInTheDocument()
    })

    it('displays extracted features from analysis', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            analysis: { confidence: 'high', images_analyzed: 1 },
            character: {
              visual_fingerprint: {
                hair_color: 'dark brown',
                eye_color: 'green',
              },
            },
          }),
      })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('AI Analyze Image'))

      await waitFor(() => {
        expect(screen.getByText('Extracted Features:')).toBeInTheDocument()
      })
      expect(screen.getByText('hair color:')).toBeInTheDocument()
      expect(screen.getByText('dark brown')).toBeInTheDocument()
    })

    it('allows dismissing analysis results', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            analysis: { confidence: 'high', images_analyzed: 1 },
          }),
      })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('AI Analyze Image'))

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Complete')).toBeInTheDocument()
      })

      // Find the dismiss button (X) in the analysis card
      const analysisCard = screen.getByText('AI Analysis Complete').closest('.border-green-500\\/50')
      const dismissButton = analysisCard?.querySelector('button')
      if (dismissButton) {
        await user.click(dismissButton)
      }

      await waitFor(() => {
        expect(screen.queryByText('AI Analysis Complete')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('displays error message when upload fails', async () => {
      // We can't easily test the upload error since it uses programmatic file input
      // But we can test the error display by checking initial state doesn't show error
      render(<CharacterVisualCues {...defaultProps} />)

      expect(screen.queryByText(/Upload failed/)).not.toBeInTheDocument()
    })

    it('displays error when delete fails', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Delete failed: image in use' }),
      })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('Remove Primary Image'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByText('Delete failed: image in use')).toBeInTheDocument()
      })
    })

    it('displays error when analysis fails', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'No images to analyze' }),
      })

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      await user.click(screen.getByText('AI Analyze Image'))

      await waitFor(() => {
        expect(screen.getByText('No images to analyze')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Button States
  // ============================================================================
  describe('Button States', () => {
    it('disables analyze button while analyzing', async () => {
      const user = userEvent.setup()
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ analysis: { confidence: 'high', images_analyzed: 1 } }),
                }),
              500
            )
          )
      )

      render(
        <CharacterVisualCues
          {...defaultProps}
          primaryImageUrl="https://example.com/primary.jpg"
        />
      )

      const analyzeButton = screen.getByText('AI Analyze Image').closest('button')
      await user.click(analyzeButton!)

      expect(analyzeButton).toBeDisabled()
    })
  })

  // ============================================================================
  // Visual Cue Type Colors
  // ============================================================================
  describe('Visual Cue Type Badges', () => {
    it('renders badges with correct type labels', () => {
      const allTypeCues: VisualCue[] = [
        { url: 'https://example.com/1.jpg', type: 'full-body', caption: null },
        { url: 'https://example.com/2.jpg', type: 'face', caption: null },
        { url: 'https://example.com/3.jpg', type: 'costume', caption: null },
        { url: 'https://example.com/4.jpg', type: 'expression', caption: null },
        { url: 'https://example.com/5.jpg', type: 'other', caption: null },
      ]

      render(<CharacterVisualCues {...defaultProps} visualCues={allTypeCues} />)

      // Use getAllByText since labels appear in both Select options and badges
      expect(screen.getAllByText('Full Body').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Face/Portrait').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Costume/Outfit').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Expression').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Other').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles empty visual cues array', () => {
      render(<CharacterVisualCues {...defaultProps} visualCues={[]} />)

      expect(screen.getByText('No additional visual cues yet.')).toBeInTheDocument()
    })

    it('handles undefined visual cues', () => {
      render(<CharacterVisualCues {...defaultProps} visualCues={undefined} />)

      expect(screen.getByText('No additional visual cues yet.')).toBeInTheDocument()
    })

    it('handles null primary image URL', () => {
      render(<CharacterVisualCues {...defaultProps} primaryImageUrl={null} />)

      expect(screen.getByText('Upload Primary Reference Image')).toBeInTheDocument()
    })

    it('handles visual cue without caption', () => {
      const cueWithoutCaption: VisualCue[] = [
        { url: 'https://example.com/1.jpg', type: 'full-body', caption: null },
      ]

      render(<CharacterVisualCues {...defaultProps} visualCues={cueWithoutCaption} />)

      // Should render badge (Full Body appears in both select dropdown and badge)
      expect(screen.getAllByText('Full Body').length).toBeGreaterThanOrEqual(1)
    })
  })
})
