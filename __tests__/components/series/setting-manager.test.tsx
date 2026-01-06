/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingManager } from '@/components/series/setting-manager'

// Mock Next.js router
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

// Mock modal provider
const mockShowConfirm = jest.fn()
jest.mock('@/components/providers/modal-provider', () => ({
  useModal: () => ({
    showConfirm: mockShowConfirm,
  }),
}))

// Mock toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock Lucide icons (including X used by Dialog close button)
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  MapPin: () => <div data-testid="mappin-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Star: () => <div data-testid="star-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('SettingManager', () => {
  const defaultProps = {
    seriesId: 'series-123',
    settings: [],
  }

  const mockSettings = [
    {
      id: 'setting-1',
      name: 'Coffee Shop',
      description: 'A cozy coffee shop with vintage decor',
      environment_type: 'interior' as const,
      time_of_day: 'morning',
      atmosphere: 'warm and inviting',
      is_primary: true,
    },
    {
      id: 'setting-2',
      name: 'City Street',
      description: 'Bustling downtown street with shops',
      environment_type: 'exterior' as const,
      time_of_day: 'afternoon',
      atmosphere: 'busy',
      is_primary: false,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    mockShowConfirm.mockResolvedValue(true)
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the header with title', () => {
      render(<SettingManager {...defaultProps} />)

      expect(screen.getByText('Settings & Locations')).toBeInTheDocument()
      expect(
        screen.getByText('Define locations and environments for your series')
      ).toBeInTheDocument()
    })

    it('renders the add setting button', () => {
      render(<SettingManager {...defaultProps} />)

      expect(screen.getByRole('button', { name: /add setting/i })).toBeInTheDocument()
    })

    it('renders mappin icon', () => {
      render(<SettingManager {...defaultProps} />)

      // Two mappin icons - one in header, one in empty state
      const icons = screen.getAllByTestId('mappin-icon')
      expect(icons.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no settings', () => {
      render(<SettingManager {...defaultProps} settings={[]} />)

      expect(screen.getByText('No settings defined yet')).toBeInTheDocument()
    })

    it('shows mappin icon in empty state', () => {
      render(<SettingManager {...defaultProps} settings={[]} />)

      // At least 2 mappin icons - header and empty state
      const icons = screen.getAllByTestId('mappin-icon')
      expect(icons.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ============================================================================
  // Settings List
  // ============================================================================
  describe('Settings List', () => {
    it('renders setting cards with names', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.getByText('City Street')).toBeInTheDocument()
    })

    it('renders setting descriptions', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      expect(screen.getByText('A cozy coffee shop with vintage decor')).toBeInTheDocument()
      expect(screen.getByText('Bustling downtown street with shops')).toBeInTheDocument()
    })

    it('shows environment type badges', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      expect(screen.getByText('interior')).toBeInTheDocument()
      expect(screen.getByText('exterior')).toBeInTheDocument()
    })

    it('shows time of day badges', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      expect(screen.getByText('morning')).toBeInTheDocument()
      expect(screen.getByText('afternoon')).toBeInTheDocument()
    })

    it('shows atmosphere text', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      expect(screen.getByText(/warm and inviting/)).toBeInTheDocument()
    })

    it('shows star icon for primary setting', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      // Only one star icon for the primary setting
      expect(screen.getByTestId('star-icon')).toBeInTheDocument()
    })

    it('renders edit buttons for each setting', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const editIcons = screen.getAllByTestId('edit-icon')
      expect(editIcons).toHaveLength(2)
    })

    it('renders delete buttons for each setting', () => {
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const trashIcons = screen.getAllByTestId('trash-icon')
      expect(trashIcons).toHaveLength(2)
    })
  })

  // ============================================================================
  // Add Setting Dialog
  // ============================================================================
  describe('Add Setting Dialog', () => {
    it('opens dialog when add button clicked', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      // Verify dialog is open by checking for unique description text
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByText('Define a location or environment for your series')
      ).toBeInTheDocument()
    })

    it('shows all form fields in dialog', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      expect(screen.getByLabelText(/Setting Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Environment Type/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Time of Day/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Atmosphere/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Mark as primary/)).toBeInTheDocument()
    })

    it('shows environment type options', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      const envSelect = screen.getByLabelText(/Environment Type/) as HTMLSelectElement
      const options = Array.from(envSelect.options).map((o) => o.value)

      expect(options).toContain('interior')
      expect(options).toContain('exterior')
      expect(options).toContain('mixed')
      expect(options).toContain('other')
    })

    it('has cancel button in dialog', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('has submit button in dialog', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      expect(screen.getByRole('button', { name: /add setting/i })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Add Setting Submission
  // ============================================================================
  describe('Add Setting Submission', () => {
    it('calls API with form data when submitted', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'new-setting',
            name: 'New Location',
            description: 'A new location',
            environment_type: 'interior',
            time_of_day: 'night',
            atmosphere: 'quiet',
            is_primary: false,
          }),
      })

      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      await user.type(screen.getByLabelText(/Setting Name/), 'New Location')
      await user.type(screen.getByLabelText(/Description/), 'A new location')
      await user.type(screen.getByLabelText(/Time of Day/), 'night')
      await user.type(screen.getByLabelText(/Atmosphere/), 'quiet')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /^add setting$/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/series/series-123/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      })
    })

    it('closes dialog after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'new-setting',
            name: 'New Location',
            description: 'Test desc',
            environment_type: 'interior',
            time_of_day: null,
            atmosphere: null,
            is_primary: false,
          }),
      })

      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      await user.type(screen.getByLabelText(/Setting Name/), 'New Location')
      await user.type(screen.getByLabelText(/Description/), 'Test desc')

      const submitButton = screen.getByRole('button', { name: /^add setting$/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Define a location or environment')).not.toBeInTheDocument()
      })
    })

    it('refreshes router after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'new-setting',
            name: 'New Location',
            description: 'Test',
            environment_type: 'interior',
            time_of_day: null,
            atmosphere: null,
            is_primary: false,
          }),
      })

      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      await user.type(screen.getByLabelText(/Setting Name/), 'New Location')
      await user.type(screen.getByLabelText(/Description/), 'Test')

      const submitButton = screen.getByRole('button', { name: /^add setting$/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('shows error when API fails', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Validation error' }),
      })

      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      await user.type(screen.getByLabelText(/Setting Name/), 'Test')
      await user.type(screen.getByLabelText(/Description/), 'Test')

      const submitButton = screen.getByRole('button', { name: /^add setting$/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Validation error')).toBeInTheDocument()
      })
    })

    it('shows loading state while submitting', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      await user.type(screen.getByLabelText(/Setting Name/), 'Test')
      await user.type(screen.getByLabelText(/Description/), 'Test')

      const submitButton = screen.getByRole('button', { name: /^add setting$/i })
      await user.click(submitButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()

      // Resolve to clean up
      resolvePromise!({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'new',
            name: 'Test',
            description: 'Test',
            environment_type: 'interior',
            time_of_day: null,
            atmosphere: null,
            is_primary: false,
          }),
      })
    })
  })

  // ============================================================================
  // Edit Setting
  // ============================================================================
  describe('Edit Setting', () => {
    it('opens dialog with existing data when edit clicked', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      // Click the first edit button
      const editButtons = screen.getAllByTestId('edit-icon')
      await user.click(editButtons[0].closest('button')!)

      expect(screen.getByText('Edit Setting')).toBeInTheDocument()
      expect(screen.getByLabelText(/Setting Name/)).toHaveValue('Coffee Shop')
      expect(screen.getByLabelText(/Description/)).toHaveValue(
        'A cozy coffee shop with vintage decor'
      )
    })

    it('shows Update Setting button when editing', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const editButtons = screen.getAllByTestId('edit-icon')
      await user.click(editButtons[0].closest('button')!)

      expect(screen.getByRole('button', { name: /update setting/i })).toBeInTheDocument()
    })

    it('calls PATCH API when updating existing setting', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockSettings[0],
            name: 'Updated Name',
          }),
      })

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const editButtons = screen.getAllByTestId('edit-icon')
      await user.click(editButtons[0].closest('button')!)

      await user.clear(screen.getByLabelText(/Setting Name/))
      await user.type(screen.getByLabelText(/Setting Name/), 'Updated Name')

      const updateButton = screen.getByRole('button', { name: /update setting/i })
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-123/settings/setting-1',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.any(String),
          }
        )
      })
    })
  })

  // ============================================================================
  // Delete Setting
  // ============================================================================
  describe('Delete Setting', () => {
    it('shows confirmation dialog when delete clicked', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(false)

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const deleteButtons = screen.getAllByTestId('trash-icon')
      await user.click(deleteButtons[0].closest('button')!)

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Delete Setting',
          expect.stringContaining('Coffee Shop'),
          expect.objectContaining({ variant: 'destructive' })
        )
      })
    })

    it('does not delete when confirmation cancelled', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(false)

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const deleteButtons = screen.getAllByTestId('trash-icon')
      await user.click(deleteButtons[0].closest('button')!)

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('calls DELETE API when confirmed', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(true)
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const deleteButtons = screen.getAllByTestId('trash-icon')
      await user.click(deleteButtons[0].closest('button')!)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/series/series-123/settings/setting-1',
          { method: 'DELETE' }
        )
      })
    })

    it('shows success toast after deletion', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(true)
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const deleteButtons = screen.getAllByTestId('trash-icon')
      await user.click(deleteButtons[0].closest('button')!)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Setting Deleted',
            description: expect.stringContaining('Coffee Shop'),
          })
        )
      })
    })

    it('shows error toast when deletion fails', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(true)
      mockFetch.mockResolvedValueOnce({ ok: false })

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      const deleteButtons = screen.getAllByTestId('trash-icon')
      await user.click(deleteButtons[0].closest('button')!)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Delete Failed',
            variant: 'destructive',
          })
        )
      })
    })

    it('removes setting from list after successful deletion', async () => {
      const user = userEvent.setup()
      mockShowConfirm.mockResolvedValueOnce(true)
      mockFetch.mockResolvedValueOnce({ ok: true })

      render(<SettingManager {...defaultProps} settings={mockSettings} />)

      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()

      const deleteButtons = screen.getAllByTestId('trash-icon')
      await user.click(deleteButtons[0].closest('button')!)

      await waitFor(() => {
        expect(screen.queryByText('Coffee Shop')).not.toBeInTheDocument()
      })

      // Other setting still present
      expect(screen.getByText('City Street')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Form Cancel
  // ============================================================================
  describe('Form Cancel', () => {
    it('closes dialog when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      // Dialog is open - check for description text
      expect(
        screen.getByText('Define a location or environment for your series')
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(
          screen.queryByText('Define a location or environment for your series')
        ).not.toBeInTheDocument()
      })
    })

    it('resets form data when dialog closed', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      await user.type(screen.getByLabelText(/Setting Name/), 'Typed Data')
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Wait for dialog to close
      await waitFor(() => {
        expect(
          screen.queryByText('Define a location or environment for your series')
        ).not.toBeInTheDocument()
      })

      // Reopen dialog
      await user.click(screen.getByRole('button', { name: /add setting/i }))

      expect(screen.getByLabelText(/Setting Name/)).toHaveValue('')
    })
  })

  // ============================================================================
  // Environment Type Badge Colors
  // ============================================================================
  describe('Environment Type Badge Colors', () => {
    it('applies correct color class for interior', () => {
      render(
        <SettingManager
          {...defaultProps}
          settings={[{ ...mockSettings[0], environment_type: 'interior' }]}
        />
      )

      const badge = screen.getByText('interior')
      expect(badge).toHaveClass('bg-blue-100')
    })

    it('applies correct color class for exterior', () => {
      render(
        <SettingManager
          {...defaultProps}
          settings={[{ ...mockSettings[0], environment_type: 'exterior' }]}
        />
      )

      const badge = screen.getByText('exterior')
      expect(badge).toHaveClass('bg-green-100')
    })

    it('applies correct color class for mixed', () => {
      render(
        <SettingManager
          {...defaultProps}
          settings={[{ ...mockSettings[0], environment_type: 'mixed' }]}
        />
      )

      const badge = screen.getByText('mixed')
      expect(badge).toHaveClass('bg-purple-100')
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles setting with null environment_type', () => {
      render(
        <SettingManager
          {...defaultProps}
          settings={[{ ...mockSettings[0], environment_type: null }]}
        />
      )

      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.queryByText('interior')).not.toBeInTheDocument()
    })

    it('handles setting with null time_of_day', () => {
      render(
        <SettingManager
          {...defaultProps}
          settings={[{ ...mockSettings[0], time_of_day: null }]}
        />
      )

      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.queryByText('morning')).not.toBeInTheDocument()
    })

    it('handles setting with null atmosphere', () => {
      render(
        <SettingManager
          {...defaultProps}
          settings={[{ ...mockSettings[0], atmosphere: null }]}
        />
      )

      expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
      expect(screen.queryByText(/Atmosphere:/)).not.toBeInTheDocument()
    })

    it('handles network error during submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))
      await user.type(screen.getByLabelText(/Setting Name/), 'Test')
      await user.type(screen.getByLabelText(/Description/), 'Test')

      const submitButton = screen.getByRole('button', { name: /^add setting$/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('updates primary checkbox correctly', async () => {
      const user = userEvent.setup()
      render(<SettingManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add setting/i }))

      const checkbox = screen.getByLabelText(/Mark as primary/)
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })
})
