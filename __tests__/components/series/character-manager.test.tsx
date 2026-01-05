/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterManager } from '@/components/series/character-manager'

// Mock next/navigation
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

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

// Mock CharacterVisualCues
jest.mock('@/components/series/character-visual-cues', () => ({
  CharacterVisualCues: ({ characterId, characterName }: { characterId: string; characterName: string }) => (
    <div data-testid="visual-cues">
      Visual Cues for {characterName} (ID: {characterId})
    </div>
  ),
}))

// Mock CharacterConsistencyForm
jest.mock('@/components/series/character-consistency-form', () => ({
  CharacterConsistencyForm: ({ onChange }: { onChange: (data: any) => void }) => (
    <div data-testid="consistency-form">
      Consistency Form
      <button
        type="button"
        onClick={() => onChange({
          visualFingerprint: { hairColor: 'brown' },
          voiceProfile: { tone: 'deep' },
        })}
        data-testid="update-consistency"
      >
        Update Consistency
      </button>
    </div>
  ),
}))

const mockCharacters = [
  {
    id: 'char-1',
    name: 'Alice',
    description: 'A brave protagonist with short brown hair',
    role: 'protagonist' as const,
    performance_style: 'energetic and bold',
    visual_reference_url: null,
    visual_cues: [],
    visual_fingerprint: { hairColor: 'brown' },
    voice_profile: null,
    sora_prompt_template: null,
  },
  {
    id: 'char-2',
    name: 'Bob',
    description: 'A wise mentor figure',
    role: 'supporting' as const,
    performance_style: 'calm and measured',
    visual_reference_url: null,
    visual_cues: [],
    visual_fingerprint: null,
    voice_profile: null,
    sora_prompt_template: null,
  },
]

const defaultProps = {
  seriesId: 'series-1',
  characters: mockCharacters,
}

describe('CharacterManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockShowConfirm.mockReset()
    mockToast.mockReset()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders header with title and description', () => {
      render(<CharacterManager {...defaultProps} />)

      expect(screen.getByText('Characters')).toBeInTheDocument()
      expect(screen.getByText('Define characters that appear across episodes')).toBeInTheDocument()
    })

    it('renders Add Character button', () => {
      render(<CharacterManager {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Add Character/i })).toBeInTheDocument()
    })

    it('renders all character cards', () => {
      render(<CharacterManager {...defaultProps} />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('displays character descriptions', () => {
      render(<CharacterManager {...defaultProps} />)

      expect(screen.getByText('A brave protagonist with short brown hair')).toBeInTheDocument()
      expect(screen.getByText('A wise mentor figure')).toBeInTheDocument()
    })

    it('displays character roles as badges', () => {
      render(<CharacterManager {...defaultProps} />)

      expect(screen.getByText('protagonist')).toBeInTheDocument()
      expect(screen.getByText('supporting')).toBeInTheDocument()
    })

    it('displays performance style when present', () => {
      render(<CharacterManager {...defaultProps} />)

      expect(screen.getByText(/energetic and bold/)).toBeInTheDocument()
    })

    it('renders edit and delete buttons for each character', () => {
      render(<CharacterManager {...defaultProps} />)

      // Each character card has 3 action buttons (visual, edit, delete)
      // Find all buttons that are NOT the Add Character button
      const allButtons = screen.getAllByRole('button')
      const actionButtons = allButtons.filter(btn => !btn.textContent?.includes('Add Character'))
      // Should have at least 6 action buttons (2 characters × 3 buttons each)
      expect(actionButtons.length).toBeGreaterThanOrEqual(6)
    })
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no characters', () => {
      render(<CharacterManager seriesId="series-1" characters={[]} />)

      expect(screen.getByText('No characters defined yet')).toBeInTheDocument()
    })

    it('hides character grid when no characters', () => {
      render(<CharacterManager seriesId="series-1" characters={[]} />)

      expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Add Character Dialog
  // ============================================================================
  describe('Add Character Dialog', () => {
    it('opens dialog when Add Character is clicked', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      // Dialog title is "Add Character" but there's also the button - use heading
      expect(screen.getByRole('heading', { name: /Add Character/i })).toBeInTheDocument()
    })

    it('shows form fields in dialog', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))

      expect(screen.getByLabelText(/Character Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Role/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Performance Style/i)).toBeInTheDocument()
    })

    it('shows CharacterConsistencyForm in dialog', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))

      expect(screen.getByTestId('consistency-form')).toBeInTheDocument()
    })

    it('shows Cancel and Add buttons in dialog', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add Character$/i })).toBeInTheDocument()
    })

    it('closes dialog when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))
      await user.click(screen.getByRole('button', { name: /Cancel/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Create Character
  // ============================================================================
  describe('Create Character', () => {
    it('submits new character successfully', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-char',
          name: 'Charlie',
          description: 'A mysterious stranger',
          role: 'supporting',
          performance_style: 'enigmatic',
        }),
      })

      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))

      await user.type(screen.getByLabelText(/Character Name/i), 'Charlie')
      await user.type(screen.getByLabelText(/Description/i), 'A mysterious stranger')
      await user.selectOptions(screen.getByLabelText(/Role/i), 'supporting')
      await user.type(screen.getByLabelText(/Performance Style/i), 'enigmatic')

      await user.click(screen.getByRole('button', { name: /Add Character$/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-1/characters',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Charlie'),
          })
        )
      })
    })

    it('closes dialog after successful creation', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-char',
          name: 'Charlie',
          description: 'A mysterious stranger',
          role: 'supporting',
          performance_style: null,
        }),
      })

      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))
      await user.type(screen.getByLabelText(/Character Name/i), 'Charlie')
      await user.type(screen.getByLabelText(/Description/i), 'A mysterious stranger')
      await user.click(screen.getByRole('button', { name: /Add Character$/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('refreshes router after successful creation', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-char',
          name: 'Charlie',
          description: 'Test',
          role: 'supporting',
        }),
      })

      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))
      await user.type(screen.getByLabelText(/Character Name/i), 'Charlie')
      await user.type(screen.getByLabelText(/Description/i), 'Test')
      await user.click(screen.getByRole('button', { name: /Add Character$/i }))

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('shows error message when creation fails', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Name already exists' }),
      })

      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))
      await user.type(screen.getByLabelText(/Character Name/i), 'Alice') // Duplicate name
      await user.type(screen.getByLabelText(/Description/i), 'Test')
      await user.click(screen.getByRole('button', { name: /Add Character$/i }))

      await waitFor(() => {
        expect(screen.getByText('Name already exists')).toBeInTheDocument()
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))
      await user.type(screen.getByLabelText(/Character Name/i), 'Charlie')
      await user.type(screen.getByLabelText(/Description/i), 'Test')
      await user.click(screen.getByRole('button', { name: /Add Character$/i }))

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Edit Character
  // ============================================================================
  describe('Edit Character', () => {
    it('opens dialog with character data when Edit is clicked', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      // Find edit button for Alice (first character)
      const aliceCard = screen.getByText('Alice').closest('.relative, [class*="card"]')?.parentElement
      const editButtons = screen.getAllByRole('button')
      // Find the edit button in Alice's card section
      const editBtn = editButtons.find(btn =>
        btn.innerHTML.includes('Edit') || btn.querySelector('svg')?.classList.toString().includes('edit')
      )

      // Click first edit-like button after Alice's name
      const allButtons = screen.getAllByRole('button')
      // Filter to only buttons that appear after Alice text
      for (const btn of allButtons) {
        if (btn.closest('[class*="card"]')?.textContent?.includes('Alice')) {
          if (btn.innerHTML.includes('lucide-edit') || btn.innerHTML.includes('lucide-pencil')) {
            await user.click(btn)
            break
          }
        }
      }

      // If dialog didn't open, try clicking the second button in Alice's card (edit button)
      if (!screen.queryByRole('dialog')) {
        // More direct approach: find buttons within character cards
        const cards = document.querySelectorAll('[class*="card"]')
        for (const card of cards) {
          if (card.textContent?.includes('Alice')) {
            const buttons = card.querySelectorAll('button')
            // Second button is typically Edit
            if (buttons[1]) {
              await user.click(buttons[1] as HTMLElement)
              break
            }
          }
        }
      }

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Edit Character')).toBeInTheDocument()
    })

    it('pre-fills form with character data', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      // Click edit for Alice
      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[1]) {
            await user.click(buttons[1] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/Character Name/i)).toHaveValue('Alice')
      expect(screen.getByLabelText(/Role/i)).toHaveValue('protagonist')
    })

    it('shows Update Character button when editing', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[1]) {
            await user.click(buttons[1] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update Character/i })).toBeInTheDocument()
      })
    })

    it('submits updated character with PATCH method', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'char-1',
          name: 'Alice Updated',
          description: 'Updated description',
          role: 'protagonist',
        }),
      })

      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[1]) {
            await user.click(buttons[1] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.clear(screen.getByLabelText(/Character Name/i))
      await user.type(screen.getByLabelText(/Character Name/i), 'Alice Updated')
      await user.click(screen.getByRole('button', { name: /Update Character/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-1/characters/char-1',
          expect.objectContaining({
            method: 'PATCH',
          })
        )
      })
    })
  })

  // ============================================================================
  // Delete Character
  // ============================================================================
  describe('Delete Character', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(false) // User cancels

      render(<CharacterManager {...defaultProps} />)

      // Click delete for Alice
      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          // Third button is typically Delete
          if (buttons[2]) {
            await user.click(buttons[2] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Delete Character',
          expect.stringContaining('Alice'),
          expect.objectContaining({ variant: 'destructive' })
        )
      })
    })

    it('deletes character when confirmed', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(true)
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[2]) {
            await user.click(buttons[2] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-1/characters/char-1',
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('does not delete when cancelled', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(false)

      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[2]) {
            await user.click(buttons[2] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('shows success toast after deletion', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(true)
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[2]) {
            await user.click(buttons[2] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Character Deleted',
          })
        )
      })
    })

    it('shows error toast when deletion fails', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValue(true)
      mockFetch.mockResolvedValueOnce({ ok: false })

      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[2]) {
            await user.click(buttons[2] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Delete Failed',
            variant: 'destructive',
          })
        )
      })
    })
  })

  // ============================================================================
  // Visual Cues Dialog
  // ============================================================================
  describe('Visual Cues Dialog', () => {
    it('opens visual cues dialog when image button is clicked', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      // First button in each card is the visual cues button
      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[0]) {
            await user.click(buttons[0] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(screen.getByText(/Visual References - Alice/)).toBeInTheDocument()
      })
    })

    it('shows CharacterVisualCues component in dialog', async () => {
      const user = userEvent.setup()
      render(<CharacterManager {...defaultProps} />)

      const cards = document.querySelectorAll('[class*="card"]')
      for (const card of cards) {
        if (card.textContent?.includes('Alice')) {
          const buttons = card.querySelectorAll('button')
          if (buttons[0]) {
            await user.click(buttons[0] as HTMLElement)
            break
          }
        }
      }

      await waitFor(() => {
        expect(screen.getByTestId('visual-cues')).toBeInTheDocument()
        expect(screen.getByText(/Visual Cues for Alice/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Character Consistency Form Integration
  // ============================================================================
  describe('Character Consistency Form Integration', () => {
    it('updates form data when consistency form changes', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-char',
          name: 'Test',
          description: 'Test',
          role: 'protagonist',
          visual_fingerprint: { hairColor: 'brown' },
          voice_profile: { tone: 'deep' },
        }),
      })

      render(<CharacterManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Character/i }))
      await user.type(screen.getByLabelText(/Character Name/i), 'Test')
      await user.type(screen.getByLabelText(/Description/i), 'Test description')

      // Update consistency form
      await user.click(screen.getByTestId('update-consistency'))

      // Submit the form
      await user.click(screen.getByRole('button', { name: /Add Character$/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('hairColor'),
          })
        )
      })
    })
  })

  // ============================================================================
  // Role Colors
  // ============================================================================
  describe('Role Colors', () => {
    it('applies correct color class for protagonist', () => {
      render(<CharacterManager {...defaultProps} />)

      const protagonistBadge = screen.getByText('protagonist')
      expect(protagonistBadge.className).toContain('blue')
    })

    it('applies correct color class for supporting', () => {
      render(<CharacterManager {...defaultProps} />)

      const supportingBadge = screen.getByText('supporting')
      expect(supportingBadge.className).toContain('green')
    })
  })
})
