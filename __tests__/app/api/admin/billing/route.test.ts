jest.mock('@/lib/supabase/server')
jest.mock('@/lib/logger', () => ({
  createAPILogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  LOG_MESSAGES: {
    AUTH_UNAUTHORIZED: 'Unauthorized',
    API_REQUEST_ERROR: 'API error',
  },
}))

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/admin/billing/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/admin/billing', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    // Clear any Stripe key
    delete process.env.STRIPE_SECRET_KEY
  })

  describe('GET /api/admin/billing', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: false },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('returns billing statistics for admin users', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        // First call: admin check (profiles)
        if (callCount === 1 && table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: tier breakdown (profiles)
        if (callCount === 2 && table === 'profiles') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { subscription_tier: 'free', subscription_status: 'active' },
                { subscription_tier: 'free', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'trialing' },
                { subscription_tier: 'premium', subscription_status: 'cancelled' },
              ],
              error: null,
            }),
          }
        }

        // Payment history queries
        if (table === 'payment_history') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: 'pay-1', amount_paid: 2900, currency: 'usd', status: 'paid', description: 'Premium', created_at: new Date().toISOString() },
                  ],
                  error: null,
                }),
              }),
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockResolvedValue({
                    data: [{ amount_paid: 2900 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('subscriptions')
      expect(data.subscriptions).toHaveProperty('free')
      expect(data.subscriptions).toHaveProperty('premium')
      expect(data.subscriptions).toHaveProperty('trial')
      expect(data.subscriptions).toHaveProperty('cancelled')
      expect(data).toHaveProperty('revenue')
      expect(data.revenue).toHaveProperty('mrr')
      expect(data).toHaveProperty('conversion')
    })

    it('calculates subscription tier breakdown correctly', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1 && table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2 && table === 'profiles') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { subscription_tier: 'free', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'trialing' },
                { subscription_tier: 'premium', subscription_status: 'cancelled' },
              ],
              error: null,
            }),
          }
        }

        if (table === 'payment_history') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscriptions.free).toBe(1)
      expect(data.subscriptions.premium).toBe(2) // Active premium only
      expect(data.subscriptions.trial).toBe(1) // Trialing
      expect(data.subscriptions.cancelled).toBe(1)
      expect(data.subscriptions.total).toBe(5)
    })

    it('calculates MRR based on active premium subscriptions', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1 && table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2 && table === 'profiles') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { subscription_tier: 'premium', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'active' },
                { subscription_tier: 'premium', subscription_status: 'active' },
              ],
              error: null,
            }),
          }
        }

        if (table === 'payment_history') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // 3 premium users * $29 (2900 cents) = 8700 cents MRR
      expect(data.revenue.mrr).toBe(8700)
    })

    it('returns stripe: null when Stripe is not configured', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1 && table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2 && table === 'profiles') {
          return {
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
        }

        if (table === 'payment_history') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stripe).toBeNull()
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        throw new Error('Database connection failed')
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('handles empty payment history gracefully', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1 && table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        if (callCount === 2 && table === 'profiles') {
          return {
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
        }

        if (table === 'payment_history') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/billing')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.revenue.revenueThisMonth).toBe(0)
      expect(data.revenue.revenueLastMonth).toBe(0)
      expect(data.recentPayments).toEqual([])
    })
  })
})
