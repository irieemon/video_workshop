/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BillingSettings } from '@/components/settings/billing-settings'

// Mock Next.js router and searchParams
const mockReplace = jest.fn()
const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

// Mock confetti hook
const mockSuccessBurst = jest.fn()
const mockCelebrate = jest.fn()

jest.mock('@/lib/hooks/use-confetti', () => ({
  useConfetti: () => ({
    successBurst: mockSuccessBurst,
    celebrate: mockCelebrate,
  }),
}))

// Mock motion components
jest.mock('@/components/ui/motion', () => ({
  Fade: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Scale: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') {
      return 'Jan 15, 2024'
    }
    return date.toString()
  }),
}))

const mockFreeSubscription = {
  tier: 'free',
  status: 'active',
  expiresAt: null,
  hasActiveSubscription: false,
  usage: {
    quota: {
      projects: 3,
      videos_per_month: 10,
      consultations_per_month: 10,
    },
    current: {
      projects: 1,
      videos_this_month: 5,
      consultations_this_month: 3,
    },
  },
}

const mockPremiumSubscription = {
  tier: 'premium',
  status: 'active',
  expiresAt: null,
  hasActiveSubscription: true,
  usage: {
    quota: {
      projects: 999999,
      videos_per_month: 999999,
      consultations_per_month: 999999,
    },
    current: {
      projects: 10,
      videos_this_month: 50,
      consultations_this_month: 25,
    },
  },
  subscription: {
    id: 'sub_123',
    status: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '2024-02-15T00:00:00Z',
    currentPeriodStart: '2024-01-15T00:00:00Z',
  },
  recentInvoices: [
    {
      id: 'inv_123',
      amount: 1999,
      currency: 'usd',
      status: 'paid',
      date: '2024-01-15T00:00:00Z',
      url: 'https://stripe.com/invoice/123',
    },
    {
      id: 'inv_122',
      amount: 1999,
      currency: 'usd',
      status: 'paid',
      date: '2023-12-15T00:00:00Z',
      url: 'https://stripe.com/invoice/122',
    },
  ],
}

describe('BillingSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
    global.fetch = jest.fn()
  })

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading spinner while fetching data', async () => {
      // Never resolve the fetch to keep loading state
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<BillingSettings />)

      expect(screen.getByText('Billing & Subscription')).toBeInTheDocument()
      expect(screen.getByText('Manage your subscription and billing')).toBeInTheDocument()
    })

    it('shows card title while loading', () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<BillingSettings />)

      expect(screen.getByText('Billing & Subscription')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Free Plan Display
  // ============================================================================
  describe('Free Plan Display', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFreeSubscription,
      })
    })

    it('displays Free Plan badge for free users', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Free Plan')).toBeInTheDocument()
      })
    })

    it('shows upgrade button for free users', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Upgrade to Premium/i })).toBeInTheDocument()
      })
    })

    it('shows usage statistics', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Usage This Month')).toBeInTheDocument()
        expect(screen.getByText('Videos')).toBeInTheDocument()
        expect(screen.getByText('AI Consultations')).toBeInTheDocument()
      })
    })

    it('displays current video usage', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('5 / 10')).toBeInTheDocument() // videos
      })
    })

    it('displays current consultation usage', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('3 / 10')).toBeInTheDocument() // consultations
      })
    })
  })

  // ============================================================================
  // Premium Plan Display
  // ============================================================================
  describe('Premium Plan Display', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPremiumSubscription,
      })
    })

    it('displays Premium Plan badge for premium users', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument()
      })
    })

    it('shows Active badge for premium users', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    it('shows Manage Billing button for premium users', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Manage Billing/i })).toBeInTheDocument()
      })
    })

    it('shows renewal date for active subscription', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText(/Renews on/)).toBeInTheDocument()
      })
    })

    it('displays unlimited quota as infinity for videos', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        // Premium has unlimited (999999) videos, displayed as ∞
        // Look for the usage text pattern with infinity
        const videoUsage = screen.getByText(/50 \/ ∞/)
        expect(videoUsage).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Invoice History
  // ============================================================================
  describe('Invoice History', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPremiumSubscription,
      })
    })

    it('displays Recent Invoices section for premium users', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Recent Invoices')).toBeInTheDocument()
      })
    })

    it('displays invoice table headers', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Invoice')).toBeInTheDocument()
      })
    })

    it('displays invoice amounts correctly', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        // $19.99 formatted from 1999 cents
        expect(screen.getAllByText('$19.99 USD').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows paid status badge', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getAllByText('paid').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // ============================================================================
  // Checkout Success Flow
  // ============================================================================
  describe('Checkout Success Flow', () => {
    beforeEach(() => {
      mockGet.mockReturnValue('success')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPremiumSubscription,
      })
    })

    it('shows success message when checkout=success', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to Premium/)).toBeInTheDocument()
      })
    })

    it('triggers confetti on checkout success', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(mockCelebrate).toHaveBeenCalled()
      })
    })

    it('clears URL parameter after checkout success', async () => {
      render(<BillingSettings />)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard/settings', { scroll: false })
      })
    })
  })

  // ============================================================================
  // Manage Billing
  // ============================================================================
  describe('Manage Billing', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPremiumSubscription,
      })
    })

    it('calls billing portal API when Manage Billing is clicked', async () => {
      // First call returns subscription, second returns portal URL
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPremiumSubscription,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://stripe.com/portal' }),
        })

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument()
      })

      const manageBillingButton = screen.getByRole('button', { name: /Manage Billing/i })
      fireEvent.click(manageBillingButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/stripe/portal', {
          method: 'POST',
        })
      })
    })

    it('shows loading state while opening billing portal', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPremiumSubscription,
        })
        .mockImplementationOnce(() => new Promise(() => {})) // Never resolve

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument()
      })

      const manageBillingButton = screen.getByRole('button', { name: /Manage Billing/i })
      fireEvent.click(manageBillingButton)

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load subscription')).toBeInTheDocument()
      })
    })

    it('displays error when billing portal fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPremiumSubscription,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Portal creation failed' }),
        })

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument()
      })

      const manageBillingButton = screen.getByRole('button', { name: /Manage Billing/i })
      fireEvent.click(manageBillingButton)

      await waitFor(() => {
        expect(screen.getByText('Portal creation failed')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Usage Warning States
  // ============================================================================
  describe('Usage Warning States', () => {
    it('shows approaching limit warning when usage is high', async () => {
      const highUsageSubscription = {
        ...mockFreeSubscription,
        usage: {
          ...mockFreeSubscription.usage,
          current: {
            ...mockFreeSubscription.usage.current,
            videos_this_month: 9, // 90% of 10
          },
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => highUsageSubscription,
      })

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText(/Approaching limit/)).toBeInTheDocument()
      })
    })

    it('shows limit reached warning when at 100%', async () => {
      const maxUsageSubscription = {
        ...mockFreeSubscription,
        usage: {
          ...mockFreeSubscription.usage,
          current: {
            ...mockFreeSubscription.usage.current,
            videos_this_month: 10, // 100% of 10
          },
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => maxUsageSubscription,
      })

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText(/Limit reached/)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Cancellation State
  // ============================================================================
  describe('Cancellation State', () => {
    it('shows cancellation date when subscription is set to cancel', async () => {
      const cancellingSubscription = {
        ...mockPremiumSubscription,
        subscription: {
          ...mockPremiumSubscription.subscription!,
          cancelAtPeriodEnd: true,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => cancellingSubscription,
      })

      render(<BillingSettings />)

      await waitFor(() => {
        expect(screen.getByText(/Cancels on/)).toBeInTheDocument()
      })
    })
  })
})
