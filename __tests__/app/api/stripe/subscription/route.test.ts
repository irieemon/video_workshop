jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe/server', () => ({
  getActiveSubscription: jest.fn(),
  getInvoiceHistory: jest.fn(),
  getCustomerByEmail: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription, getInvoiceHistory } from '@/lib/stripe/server'
import { GET } from '@/app/api/stripe/subscription/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/stripe/subscription', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/stripe/subscription', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 404 when profile not found', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Profile not found')
    })

    it('returns basic subscription info for free user', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockProfile = {
        subscription_tier: 'free',
        subscription_expires_at: null,
        subscription_status: 'none',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        usage_quota: { videos: 5, concepts: 3 },
        usage_current: { videos: 2, concepts: 1 },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tier).toBe('free')
      expect(data.status).toBe('none')
      expect(data.hasActiveSubscription).toBe(false)
      expect(data.usage.quota).toEqual({ videos: 5, concepts: 3 })
      expect(data.nextResetDate).toBeDefined()
    })

    it('returns full subscription info for premium user', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockProfile = {
        subscription_tier: 'premium',
        subscription_expires_at: '2025-02-01T00:00:00Z',
        subscription_status: 'active',
        stripe_customer_id: 'cus_test123',
        stripe_subscription_id: 'sub_test123',
        usage_quota: { videos: 100, concepts: 50 },
        usage_current: { videos: 10, concepts: 5 },
      }

      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1738368000, // Feb 1, 2025
        current_period_start: 1735689600, // Jan 1, 2025
      }

      const mockInvoices = [
        {
          id: 'in_test1',
          amount_paid: 2900,
          currency: 'usd',
          status: 'paid',
          created: 1735689600,
          hosted_invoice_url: 'https://invoice.stripe.com/1',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      ;(getActiveSubscription as jest.Mock).mockResolvedValue(mockSubscription)
      ;(getInvoiceHistory as jest.Mock).mockResolvedValue(mockInvoices)

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tier).toBe('premium')
      expect(data.status).toBe('active')
      expect(data.hasActiveSubscription).toBe(true)
      expect(data.subscription).toBeDefined()
      expect(data.subscription.id).toBe('sub_test123')
      expect(data.subscription.cancelAtPeriodEnd).toBe(false)
      expect(data.recentInvoices).toHaveLength(1)
      expect(data.recentInvoices[0].amount).toBe(2900)
    })

    it('handles Stripe API errors gracefully', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockProfile = {
        subscription_tier: 'premium',
        subscription_status: 'active',
        stripe_customer_id: 'cus_test123',
        usage_quota: { videos: 100 },
        usage_current: { videos: 10 },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      // Stripe API fails
      ;(getActiveSubscription as jest.Mock).mockRejectedValue(new Error('Stripe unavailable'))

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)
      const data = await response.json()

      // Should still return 200 with basic info
      expect(response.status).toBe(200)
      expect(data.tier).toBe('premium')
      expect(data.subscription).toBeUndefined() // Stripe details not available
    })

    it('returns trialing status as active subscription', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockProfile = {
        subscription_tier: 'premium',
        subscription_status: 'trialing',
        stripe_customer_id: null,
        usage_quota: { videos: 100 },
        usage_current: { videos: 0 },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasActiveSubscription).toBe(true)
    })

    it('returns 500 on unexpected error', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to get subscription')
    })
  })
})
