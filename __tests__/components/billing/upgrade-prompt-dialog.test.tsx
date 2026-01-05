/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { UpgradePromptDialog, useUpgradePrompt } from '@/components/billing/upgrade-prompt-dialog'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  resource: 'videos' as const,
}

describe('UpgradePromptDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders dialog when open', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<UpgradePromptDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows Premium badge', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByText('Premium')).toBeInTheDocument()
    })

    it('shows upgrade button', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Upgrade to Premium/i })).toBeInTheDocument()
    })

    it('shows maybe later button', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Maybe later/i })).toBeInTheDocument()
    })

    it('shows pricing', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByText('$29')).toBeInTheDocument()
      expect(screen.getByText('/month')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Video Resource Type
  // ============================================================================
  describe('Video Resource Type', () => {
    it('shows video limit title', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="videos" />)

      expect(screen.getByText('Video Generation Limit Reached')).toBeInTheDocument()
    })

    it('shows video limit description', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="videos" />)

      expect(screen.getByText(/You've used all your video generations for this month/)).toBeInTheDocument()
    })

    it('shows premium video limit', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="videos" />)

      expect(screen.getByText(/100 videos\/month/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Consultations Resource Type
  // ============================================================================
  describe('Consultations Resource Type', () => {
    it('shows consultation limit title', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="consultations" />)

      expect(screen.getByText('AI Consultation Limit Reached')).toBeInTheDocument()
    })

    it('shows consultation limit description', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="consultations" />)

      expect(screen.getByText(/You've used all your AI roundtable consultations for this month/)).toBeInTheDocument()
    })

    it('shows unlimited for consultations', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="consultations" />)

      // "Unlimited" appears multiple times (in premium features), so use getAllByText
      expect(screen.getAllByText(/Unlimited/).length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // Projects Resource Type
  // ============================================================================
  describe('Projects Resource Type', () => {
    it('shows project limit title', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="projects" />)

      expect(screen.getByText('Project Limit Reached')).toBeInTheDocument()
    })

    it('shows project limit description', () => {
      render(<UpgradePromptDialog {...defaultProps} resource="projects" />)

      expect(screen.getByText(/You've reached the maximum number of projects for your plan/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Usage Display
  // ============================================================================
  describe('Usage Display', () => {
    it('shows usage fraction when provided', () => {
      render(<UpgradePromptDialog {...defaultProps} currentUsage={8} limit={10} />)

      expect(screen.getByText('(8/10 used)')).toBeInTheDocument()
    })

    it('does not show usage when not provided', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.queryByText(/used\)/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Reset Date Display
  // ============================================================================
  describe('Reset Date Display', () => {
    it('shows reset date when provided', () => {
      render(<UpgradePromptDialog {...defaultProps} resetDateString="in 5 days" />)

      expect(screen.getByText(/Your limit resets in 5 days/)).toBeInTheDocument()
    })

    it('shows default reset text when no date provided', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByText(/Your limit resets at the start of each billing cycle/)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Premium Features
  // ============================================================================
  describe('Premium Features', () => {
    it('displays premium features list', () => {
      render(<UpgradePromptDialog {...defaultProps} />)

      expect(screen.getByText('100 video generations per month')).toBeInTheDocument()
      expect(screen.getByText('Unlimited AI consultations')).toBeInTheDocument()
      expect(screen.getByText('Unlimited projects')).toBeInTheDocument()
      expect(screen.getByText('Advanced AI agents')).toBeInTheDocument()
      expect(screen.getByText('Sora video generation')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // User Interactions
  // ============================================================================
  describe('User Interactions', () => {
    it('navigates to upgrade page when upgrade clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()

      render(<UpgradePromptDialog {...defaultProps} onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: /Upgrade to Premium/i }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(mockPush).toHaveBeenCalledWith('/dashboard/upgrade')
    })

    it('closes dialog when maybe later clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()

      render(<UpgradePromptDialog {...defaultProps} onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: /Maybe later/i }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})

// ============================================================================
// useUpgradePrompt Hook Tests
// ============================================================================
describe('useUpgradePrompt Hook', () => {
  it('initializes with closed state', () => {
    const { result } = renderHook(() => useUpgradePrompt())

    expect(result.current.open).toBe(false)
    expect(result.current.resource).toBe('videos')
  })

  it('showPrompt opens dialog with parameters', () => {
    const { result } = renderHook(() => useUpgradePrompt())

    act(() => {
      result.current.showPrompt('consultations', 5, 10, 'in 3 days')
    })

    expect(result.current.open).toBe(true)
    expect(result.current.resource).toBe('consultations')
    expect(result.current.currentUsage).toBe(5)
    expect(result.current.limit).toBe(10)
    expect(result.current.resetDateString).toBe('in 3 days')
  })

  it('hidePrompt closes dialog', () => {
    const { result } = renderHook(() => useUpgradePrompt())

    act(() => {
      result.current.showPrompt('videos')
    })

    expect(result.current.open).toBe(true)

    act(() => {
      result.current.hidePrompt()
    })

    expect(result.current.open).toBe(false)
  })

  it('setOpen updates open state directly', () => {
    const { result } = renderHook(() => useUpgradePrompt())

    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.open).toBe(true)

    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)
  })

  it('preserves resource when hiding', () => {
    const { result } = renderHook(() => useUpgradePrompt())

    act(() => {
      result.current.showPrompt('projects')
    })

    act(() => {
      result.current.hidePrompt()
    })

    expect(result.current.resource).toBe('projects')
  })
})
