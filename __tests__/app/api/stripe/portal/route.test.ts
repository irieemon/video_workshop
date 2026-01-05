jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe/server', () => ({
  createPortalSession: jest.fn(),
  getCustomerByEmail: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createPortalSession, getCustomerByEmail } from '@/lib/stripe/server'
import { POST } from '@/app/api/stripe/portal/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/stripe/portal', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/stripe/portal', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/stripe/portal', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 404 when no subscription found', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stripe_customer_id: null },
              error: null,
            }),
          }),
        }),
      })

      ;(getCustomerByEmail as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/stripe/portal', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('No subscription found')
    })

    it('creates portal session with customer ID from profile', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockSession = { url: 'https://billing.stripe.com/portal/test' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_stored123' },
              error: null,
            }),
          }),
        }),
      })

      ;(createPortalSession as jest.Mock).mockResolvedValue(mockSession)

      const request = createMockRequest('http://localhost:3000/api/stripe/portal', {
        method: 'POST',
        body: {},
        headers: { origin: 'http://localhost:3000' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://billing.stripe.com/portal/test')
      expect(createPortalSession).toHaveBeenCalledWith({
        customerId: 'cus_stored123',
        returnUrl: expect.stringContaining('/dashboard/settings'),
      })
      expect(getCustomerByEmail).not.toHaveBeenCalled()
    })

    it('finds customer by email when not in profile', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      const mockSession = { url: 'https://billing.stripe.com/portal/test' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stripe_customer_id: null },
              error: null,
            }),
          }),
        }),
      })

      ;(getCustomerByEmail as jest.Mock).mockResolvedValue({ id: 'cus_found_by_email' })
      ;(createPortalSession as jest.Mock).mockResolvedValue(mockSession)

      const request = createMockRequest('http://localhost:3000/api/stripe/portal', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(getCustomerByEmail).toHaveBeenCalledWith('test@example.com')
      expect(createPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cus_found_by_email',
        })
      )
    })

    it('returns 500 when portal session creation fails', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_test' },
              error: null,
            }),
          }),
        }),
      })

      ;(createPortalSession as jest.Mock).mockRejectedValue(new Error('Stripe error'))

      const request = createMockRequest('http://localhost:3000/api/stripe/portal', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create portal session')
    })
  })
})
