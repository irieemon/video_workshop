/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelationshipManager } from '@/components/series/relationship-manager'

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

// Mock child components
jest.mock('@/components/series/relationship-form', () => ({
  RelationshipForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div data-testid="relationship-form">
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

jest.mock('@/components/series/relationship-list', () => ({
  RelationshipList: ({ onEdit, onDelete }: { onEdit: (rel: any) => void; onDelete: (id: string) => void }) => (
    <div data-testid="relationship-list">
      <button onClick={() => onEdit({ id: 'rel-1', relationship_type: 'friends' })}>Edit</button>
      <button onClick={() => onDelete('rel-1')}>Delete</button>
    </div>
  ),
}))

jest.mock('@/components/series/relationship-graph', () => ({
  RelationshipGraph: ({ onNodeClick, onLinkClick }: { onNodeClick: (id: string) => void; onLinkClick: (id: string) => void }) => (
    <div data-testid="relationship-graph">
      <button onClick={() => onNodeClick('char-1')}>Click Node</button>
      <button onClick={() => onLinkClick('rel-1')}>Click Link</button>
    </div>
  ),
}))

const mockCharacters = [
  { id: 'char-1', name: 'Alice', role: 'protagonist' },
  { id: 'char-2', name: 'Bob', role: 'supporting' },
  { id: 'char-3', name: 'Charlie', role: 'background' },
]

const mockRelationships = [
  {
    id: 'rel-1',
    character_a_id: 'char-1',
    character_b_id: 'char-2',
    character_a: { id: 'char-1', name: 'Alice' },
    character_b: { id: 'char-2', name: 'Bob' },
    relationship_type: 'friends',
    custom_label: null,
    description: 'Close friends since childhood',
    is_symmetric: true,
    intensity: 8,
    evolution_notes: null,
  },
  {
    id: 'rel-2',
    character_a_id: 'char-2',
    character_b_id: 'char-3',
    character_a: { id: 'char-2', name: 'Bob' },
    character_b: { id: 'char-3', name: 'Charlie' },
    relationship_type: 'mentor_student',
    custom_label: null,
    description: 'Mentor and apprentice',
    is_symmetric: false,
    intensity: 6,
    evolution_notes: 'Growing bond',
  },
]

const defaultProps = {
  seriesId: 'series-1',
  characters: mockCharacters,
}

describe('RelationshipManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // ============================================================================
  // Minimum Character Requirement
  // ============================================================================
  describe('Minimum Character Requirement', () => {
    it('shows message when less than 2 characters', () => {
      render(<RelationshipManager seriesId="series-1" characters={[{ id: 'char-1', name: 'Alice' }]} />)

      expect(screen.getByText('You need at least 2 characters to define relationships.')).toBeInTheDocument()
      expect(screen.getByText('Add more characters above to get started.')).toBeInTheDocument()
    })

    it('shows message when no characters', () => {
      render(<RelationshipManager seriesId="series-1" characters={[]} />)

      expect(screen.getByText('You need at least 2 characters to define relationships.')).toBeInTheDocument()
    })

    it('does not show Add Relationship button when less than 2 characters', () => {
      render(<RelationshipManager seriesId="series-1" characters={[{ id: 'char-1', name: 'Alice' }]} />)

      expect(screen.queryByRole('button', { name: /Add Relationship/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })
    })

    it('renders header with title', async () => {
      render(<RelationshipManager {...defaultProps} />)

      expect(screen.getByText('Character Relationships')).toBeInTheDocument()
    })

    it('renders description', async () => {
      render(<RelationshipManager {...defaultProps} />)

      expect(screen.getByText('Define and visualize how characters relate to each other')).toBeInTheDocument()
    })

    it('renders Add Relationship button', async () => {
      render(<RelationshipManager {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Add Relationship/i })).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
      render(<RelationshipManager {...defaultProps} />)

      expect(screen.getByText('Loading relationships...')).toBeInTheDocument()
    })

    it('renders tabs for graph and list view', async () => {
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Graph View' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Data Fetching
  // ============================================================================
  describe('Data Fetching', () => {
    it('fetches relationships on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })

      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series/series-1/relationships')
      })
    })

    it('shows error when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      })

      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch relationships')).toBeInTheDocument()
      })
    })

    it('renders RelationshipGraph component', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })

      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('relationship-graph')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Tab Navigation
  // ============================================================================
  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })
    })

    it('shows graph view by default', async () => {
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('relationship-graph')).toBeInTheDocument()
      })
    })

    it('switches to list view when tab clicked', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('relationship-graph')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'List View' }))

      await waitFor(() => {
        expect(screen.getByTestId('relationship-list')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Add Relationship Dialog
  // ============================================================================
  describe('Add Relationship Dialog', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })
    })

    it('opens dialog when Add Relationship clicked', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Relationship/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Add New Relationship')).toBeInTheDocument()
      })
    })

    it('shows RelationshipForm in dialog', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Relationship/i }))

      await waitFor(() => {
        expect(screen.getByTestId('relationship-form')).toBeInTheDocument()
      })
    })

    it('closes dialog on form cancel', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Add Relationship/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('refreshes data on form success', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      // Reset call count after initial fetch
      mockFetch.mockClear()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })

      await user.click(screen.getByRole('button', { name: /Add Relationship/i }))

      await waitFor(() => {
        expect(screen.getByTestId('relationship-form')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series/series-1/relationships')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Edit Relationship
  // ============================================================================
  describe('Edit Relationship', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })
    })

    it('opens edit dialog from list', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'List View' }))

      await waitFor(() => {
        expect(screen.getByTestId('relationship-list')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Edit'))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Edit Relationship')).toBeInTheDocument()
      })
    })

    it('opens edit dialog from graph link click', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('relationship-graph')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Click Link'))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Delete Relationship
  // ============================================================================
  describe('Delete Relationship', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })
    })

    it('deletes relationship when delete clicked', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'List View' }))

      await waitFor(() => {
        expect(screen.getByTestId('relationship-list')).toBeInTheDocument()
      })

      // Reset mock for delete call
      mockFetch.mockClear()
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockRelationships })

      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-1/relationships/rel-1',
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('shows error when delete fails', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading relationships...')).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: 'List View' }))

      await waitFor(() => {
        expect(screen.getByTestId('relationship-list')).toBeInTheDocument()
      })

      mockFetch.mockClear()
      mockFetch.mockResolvedValue({ ok: false })

      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(screen.getByText('Failed to delete relationship')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Character Detail Dialog
  // ============================================================================
  describe('Character Detail Dialog', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRelationships,
      })
    })

    it('opens character detail when graph node clicked', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('relationship-graph')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Click Node'))

      await waitFor(() => {
        // Use role to find the dialog title specifically
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Character relationship overview and network connections')).toBeInTheDocument()
      })
    })

    it('shows relationship stats in character detail', async () => {
      const user = userEvent.setup()
      render(<RelationshipManager {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('relationship-graph')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Click Node'))

      await waitFor(() => {
        expect(screen.getByText('Relationships')).toBeInTheDocument()
        expect(screen.getByText('Connected Characters')).toBeInTheDocument()
        expect(screen.getByText('Mutual Relationships')).toBeInTheDocument()
      })
    })
  })
})
