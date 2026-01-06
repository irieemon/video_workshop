/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserMenu } from '@/components/dashboard/user-menu'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignOut = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}))

// Store click handlers for testing
let menuItemHandlers: { [key: string]: () => void } = {}

// Mock Radix UI dropdown components for testability
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
    // Extract the text content to use as key
    const text = React.Children.toArray(children).find(
      (child) => typeof child === 'object' && 'type' in child && child.type === 'span'
    ) as React.ReactElement | undefined
    const label = text?.props?.children || 'item'
    if (onClick) menuItemHandlers[label] = onClick
    return (
      <div data-testid={`menu-item-${label}`} onClick={onClick} role="menuitem">
        {children}
      </div>
    )
  },
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}))

describe('UserMenu', () => {
  const defaultUser = {
    email: 'test@example.com',
    full_name: 'John Doe',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: null })
    menuItemHandlers = {} // Reset handlers between tests
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders the avatar button', () => {
      render(<UserMenu user={defaultUser} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('shows user initials from full_name', () => {
      render(<UserMenu user={defaultUser} />)

      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('shows email initials when full_name is null', () => {
      render(<UserMenu user={{ email: 'test@example.com', full_name: null }} />)

      expect(screen.getByText('TE')).toBeInTheDocument()
    })

    it('shows email initials when full_name is undefined', () => {
      render(<UserMenu user={{ email: 'user@test.com' }} />)

      expect(screen.getByText('US')).toBeInTheDocument()
    })

    it('handles single word full_name', () => {
      render(<UserMenu user={{ email: 'test@example.com', full_name: 'Alice' }} />)

      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('limits initials to 2 characters for long names', () => {
      render(
        <UserMenu
          user={{ email: 'test@example.com', full_name: 'John Michael Doe Smith' }}
        />
      )

      expect(screen.getByText('JM')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Dropdown Menu
  // ============================================================================
  describe('Dropdown Menu', () => {
    it('renders dropdown menu structure', () => {
      render(<UserMenu user={defaultUser} />)

      // With mocked dropdown, content is always visible
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
    })

    it('renders Settings menu item', () => {
      render(<UserMenu user={defaultUser} />)

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders Sign out menu item', () => {
      render(<UserMenu user={defaultUser} />)

      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })

    it('shows user full name in dropdown', () => {
      render(<UserMenu user={defaultUser} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('shows user email in dropdown', () => {
      render(<UserMenu user={defaultUser} />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('shows "User" when full_name is missing', () => {
      render(<UserMenu user={{ email: 'test@example.com' }} />)

      expect(screen.getByText('User')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Navigation
  // ============================================================================
  describe('Navigation', () => {
    it('navigates to settings when Settings is clicked', () => {
      render(<UserMenu user={defaultUser} />)

      const settingsItem = screen.getByTestId('menu-item-Settings')
      fireEvent.click(settingsItem)

      expect(mockPush).toHaveBeenCalledWith('/dashboard/settings')
    })
  })

  // ============================================================================
  // Sign Out
  // ============================================================================
  describe('Sign Out', () => {
    it('calls signOut when Sign out is clicked', async () => {
      render(<UserMenu user={defaultUser} />)

      const signOutItem = screen.getByTestId('menu-item-Sign out')
      fireEvent.click(signOutItem)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })
    })

    it('navigates to login after signing out', async () => {
      render(<UserMenu user={defaultUser} />)

      const signOutItem = screen.getByTestId('menu-item-Sign out')
      fireEvent.click(signOutItem)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('refreshes router after signing out', async () => {
      render(<UserMenu user={defaultUser} />)

      const signOutItem = screen.getByTestId('menu-item-Sign out')
      fireEvent.click(signOutItem)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Icons
  // ============================================================================
  describe('Icons', () => {
    it('renders Settings icon', () => {
      const { container } = render(<UserMenu user={defaultUser} />)

      // Icons are rendered as SVGs in menu items
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(2) // Settings and LogOut icons
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles empty email', () => {
      render(<UserMenu user={{ email: '' }} />)

      // Should still render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles email with single character', () => {
      render(<UserMenu user={{ email: 'a@b.com' }} />)

      expect(screen.getByText('A@')).toBeInTheDocument()
    })

    it('handles special characters in name', () => {
      render(
        <UserMenu
          user={{ email: 'test@example.com', full_name: "O'Brien Smith" }}
        />
      )

      expect(screen.getByText('OS')).toBeInTheDocument()
    })
  })
})
