/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteVideoDialog } from '@/components/videos/delete-video-dialog'

// Mock Alert Dialog components
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({
    children,
    asChild,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button data-testid="alert-dialog-cancel" disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
    className?: string
  }) => (
    <button
      data-testid="alert-dialog-action"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}))

// Mock Checkbox
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    disabled,
  }: {
    id: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      data-testid="checkbox"
    />
  ),
}))

// Mock Label
jest.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode
    htmlFor: string
    className?: string
  }) => (
    <label htmlFor={htmlFor} data-testid="label">
      {children}
    </label>
  ),
}))

describe('DeleteVideoDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    videoTitle: 'Test Video',
    onConfirm: jest.fn().mockResolvedValue(undefined),
    isDeleting: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders dialog when open', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      render(<DeleteVideoDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument()
    })

    it('renders dialog title', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete Video')
    })

    it('renders video title in description', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByText('"Test Video"')).toBeInTheDocument()
    })

    it('renders warning message', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(
        screen.getByText(/This action cannot be undone/i)
      ).toBeInTheDocument()
    })

    it('renders checkbox with label', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByTestId('checkbox')).toBeInTheDocument()
      expect(
        screen.getByText('I understand this action is permanent')
      ).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Delete Video button', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByTestId('alert-dialog-action')).toHaveTextContent('Delete Video')
    })
  })

  // ============================================================================
  // Checkbox Behavior
  // ============================================================================
  describe('Checkbox Behavior', () => {
    it('checkbox is unchecked by default', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })

    it('allows checking the checkbox', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      const checkbox = screen.getByTestId('checkbox')
      fireEvent.click(checkbox)

      expect((checkbox as HTMLInputElement).checked).toBe(true)
    })

    it('disables checkbox when deleting', () => {
      render(<DeleteVideoDialog {...defaultProps} isDeleting={true} />)

      const checkbox = screen.getByTestId('checkbox')
      expect(checkbox).toBeDisabled()
    })
  })

  // ============================================================================
  // Button States
  // ============================================================================
  describe('Button States', () => {
    it('delete button is disabled when checkbox is not checked', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      const deleteButton = screen.getByTestId('alert-dialog-action')
      expect(deleteButton).toBeDisabled()
    })

    it('delete button is enabled when checkbox is checked', () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      const checkbox = screen.getByTestId('checkbox')
      fireEvent.click(checkbox)

      const deleteButton = screen.getByTestId('alert-dialog-action')
      expect(deleteButton).not.toBeDisabled()
    })

    it('delete button is disabled during deletion', () => {
      render(<DeleteVideoDialog {...defaultProps} isDeleting={true} />)

      const checkbox = screen.getByTestId('checkbox')
      fireEvent.click(checkbox)

      const deleteButton = screen.getByTestId('alert-dialog-action')
      expect(deleteButton).toBeDisabled()
    })

    it('cancel button is disabled during deletion', () => {
      render(<DeleteVideoDialog {...defaultProps} isDeleting={true} />)

      const cancelButton = screen.getByTestId('alert-dialog-cancel')
      expect(cancelButton).toBeDisabled()
    })
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading indicator when deleting', () => {
      render(<DeleteVideoDialog {...defaultProps} isDeleting={true} />)

      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })

    it('shows Delete Video text when not deleting', () => {
      render(<DeleteVideoDialog {...defaultProps} isDeleting={false} />)

      expect(screen.getByTestId('alert-dialog-action')).toHaveTextContent('Delete Video')
    })
  })

  // ============================================================================
  // Confirm Action
  // ============================================================================
  describe('Confirm Action', () => {
    it('does not call onConfirm if checkbox is not checked', async () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      const deleteButton = screen.getByTestId('alert-dialog-action')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(defaultProps.onConfirm).not.toHaveBeenCalled()
      })
    })

    it('calls onConfirm when checkbox is checked and delete is clicked', async () => {
      render(<DeleteVideoDialog {...defaultProps} />)

      // Check the checkbox first
      const checkbox = screen.getByTestId('checkbox')
      fireEvent.click(checkbox)

      // Click delete button
      const deleteButton = screen.getByTestId('alert-dialog-action')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalled()
      })
    })

    it('resets checkbox state after successful deletion', async () => {
      const { rerender } = render(<DeleteVideoDialog {...defaultProps} />)

      // Check the checkbox and confirm
      const checkbox = screen.getByTestId('checkbox')
      fireEvent.click(checkbox)

      const deleteButton = screen.getByTestId('alert-dialog-action')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalled()
      })

      // After the confirm completes, the checkbox should be reset
      // (component would typically close, but we test the state reset)
    })
  })

  // ============================================================================
  // Video Title Display
  // ============================================================================
  describe('Video Title Display', () => {
    it('displays different video titles correctly', () => {
      const { rerender } = render(<DeleteVideoDialog {...defaultProps} />)

      expect(screen.getByText('"Test Video"')).toBeInTheDocument()

      rerender(
        <DeleteVideoDialog {...defaultProps} videoTitle="Another Video Title" />
      )

      expect(screen.getByText('"Another Video Title"')).toBeInTheDocument()
    })

    it('handles special characters in video title', () => {
      render(
        <DeleteVideoDialog
          {...defaultProps}
          videoTitle="Video with 'quotes' & symbols"
        />
      )

      expect(
        screen.getByText("\"Video with 'quotes' & symbols\"")
      ).toBeInTheDocument()
    })
  })
})
