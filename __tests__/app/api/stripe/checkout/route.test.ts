jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: jest.fn(),
}))
jest.mock('@/lib/stripe/config', () => ({
  STRIPE_CONFIG: {
    prices: {
      premium_monthly: 'price_test_premium_monthly',
    },
  },
}))

import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/server'
import { POST } from '@/app/api/stripe/checkout/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/stripe/checkout', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/stripe/checkout', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: { tier: 'premium' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 for invalid tier', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: { tier: 'enterprise' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid tier')
    })

    it('creates checkout session with default price', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockSession = { id: 'cs_test123', url: 'https://checkout.stripe.com/test' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      ;(createCheckoutSession as jest.Mock).mockResolvedValue(mockSession)

      const request = createMockRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: { tier: 'premium' },
        headers: { origin: 'http://localhost:3000' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('cs_test123')
      expect(data.url).toBe('https://checkout.stripe.com/test')
      expect(createCheckoutSession).toHaveBeenCalledWith({
        priceId: 'price_test_premium_monthly',
        userId: 'test-user-id',
        email: 'test@example.com',
        successUrl: expect.stringContaining('checkout=success'),
        cancelUrl: expect.stringContaining('checkout=cancelled'),
      })
    })

    it('creates checkout session with custom price', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockSession = { id: 'cs_test456', url: 'https://checkout.stripe.com/yearly' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      ;(createCheckoutSession as jest.Mock).mockResolvedValue(mockSession)

      const request = createMockRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: { tier: 'premium', priceId: 'price_yearly_custom' },
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_yearly_custom',
        })
      )
    })

    it('returns 500 when checkout session creation fails', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      ;(createCheckoutSession as jest.Mock).mockRejectedValue(new Error('Stripe API error'))

      const request = createMockRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: { tier: 'premium' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create checkout session')
    })
  })
})
