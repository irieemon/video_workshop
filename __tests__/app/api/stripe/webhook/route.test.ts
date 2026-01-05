// Must mock at module scope BEFORE any imports
// The mock returns a proxy object that defers to the configurable global
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      const config = (global as any).__mockSupabaseFromConfig
      if (config && typeof config === 'function') {
        return config(table)
      }
      return config || {}
    }),
  })),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

jest.mock('@/lib/stripe/server', () => ({
  constructWebhookEvent: jest.fn(),
  stripe: {
    subscriptions: {
      retrieve: jest.fn(),
    },
  },
}))

jest.mock('@/lib/stripe/config', () => ({
  getTierByPriceId: jest.fn(),
  getQuotaForTier: jest.fn(),
}))

import { headers } from 'next/headers'
import { constructWebhookEvent, stripe } from '@/lib/stripe/server'
import { getTierByPriceId, getQuotaForTier } from '@/lib/stripe/config'
import { POST } from '@/app/api/stripe/webhook/route'

describe('/api/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the mock config between tests
    ;(global as any).__mockSupabaseFromConfig = null
    ;(getQuotaForTier as jest.Mock).mockReturnValue({
      videos: 10,
      concepts: 5,
      episodes: 20,
    })
  })

  const createMockRequest = (body: string) => ({
    text: () => Promise.resolve(body),
  }) as unknown as Request

  // Helper to create standard update chain mock
  const createUpdateChainMock = () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null })
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock })
    return { updateMock, eqMock }
  }

  // Helper to create select->single chain mock
  const createSelectSingleMock = (data: any) => {
    const singleMock = jest.fn().mockResolvedValue({ data, error: null })
    const selectEqMock = jest.fn().mockReturnValue({ single: singleMock })
    const selectMock = jest.fn().mockReturnValue({ eq: selectEqMock })
    return { selectMock, selectEqMock, singleMock }
  }

  // Helper to configure the supabase mock for a test
  const configureMock = (config: any) => {
    ;(global as any).__mockSupabaseFromConfig = config
  }

  describe('POST /api/stripe/webhook', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(null),
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing stripe-signature')
    })

    it('returns 400 when webhook signature verification fails', async () => {
      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('signature verification failed')
    })

    it('handles checkout.session.completed event', async () => {
      // Checkout with userId in metadata only needs update
      const mockSession = {
        metadata: { supabase_user_id: 'user-123' },
        customer: 'cus_test123',
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: mockSession },
      })

      const { updateMock, eqMock } = createUpdateChainMock()
      configureMock({ update: updateMock })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(updateMock).toHaveBeenCalledWith({
        stripe_customer_id: 'cus_test123',
      })
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    })

    it('handles customer.subscription.created event', async () => {
      // Subscription with userId in metadata only needs update
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        metadata: { supabase_user_id: 'user-123' },
        items: { data: [{ price: { id: 'price_premium' } }] },
        current_period_end: 1735689600,
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'customer.subscription.created',
        data: { object: mockSubscription },
      })
      ;(getTierByPriceId as jest.Mock).mockReturnValue('premium')

      const { updateMock, eqMock } = createUpdateChainMock()
      configureMock({ update: updateMock })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(getTierByPriceId).toHaveBeenCalledWith('price_premium')
      expect(updateMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    })

    it('handles customer.subscription.updated event with customer lookup', async () => {
      // Subscription without userId needs select first, then update
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        metadata: {}, // No user ID - triggers customer lookup
        items: { data: [{ price: { id: 'price_premium' } }] },
        current_period_end: 1735689600,
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      })
      ;(getTierByPriceId as jest.Mock).mockReturnValue('premium')

      const { selectMock } = createSelectSingleMock({ id: 'user-123' })
      const { updateMock, eqMock } = createUpdateChainMock()

      configureMock({
        select: selectMock,
        update: updateMock,
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(selectMock).toHaveBeenCalledWith('id')
      expect(updateMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    })

    it('handles customer.subscription.deleted event', async () => {
      // Subscription deleted needs select by customer_id, then update
      const mockSubscription = {
        customer: 'cus_test123',
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      })

      const { selectMock } = createSelectSingleMock({ id: 'user-123' })
      const { updateMock, eqMock } = createUpdateChainMock()

      configureMock({
        select: selectMock,
        update: updateMock,
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(selectMock).toHaveBeenCalledWith('id')
      expect(updateMock).toHaveBeenCalledWith({
        subscription_tier: 'free',
        subscription_expires_at: null,
        stripe_subscription_id: null,
        subscription_status: 'cancelled',
        usage_quota: expect.any(Object),
      })
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    })

    it('handles invoice.payment_failed event', async () => {
      // Payment failed needs select (id, email) then update
      const mockInvoice = {
        customer: 'cus_test123',
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'invoice.payment_failed',
        data: { object: mockInvoice },
      })

      const { selectMock } = createSelectSingleMock({ id: 'user-123', email: 'test@example.com' })
      const { updateMock, eqMock } = createUpdateChainMock()

      configureMock({
        select: selectMock,
        update: updateMock,
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(selectMock).toHaveBeenCalledWith('id, email')
      expect(updateMock).toHaveBeenCalledWith({
        subscription_status: 'past_due',
      })
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    })

    it('handles invoice.payment_succeeded event', async () => {
      // Payment succeeded calls stripe API, then select, then update
      const mockInvoice = {
        customer: 'cus_test123',
        subscription: 'sub_test123',
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice },
      })
      ;(stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        current_period_end: 1735689600,
      })

      const { selectMock } = createSelectSingleMock({ id: 'user-123' })
      const { updateMock, eqMock } = createUpdateChainMock()

      configureMock({
        select: selectMock,
        update: updateMock,
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123')
      expect(selectMock).toHaveBeenCalledWith('id')
      expect(updateMock).toHaveBeenCalledWith({
        subscription_status: 'active',
        subscription_expires_at: expect.any(String),
      })
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123')
    })

    it('handles unrecognized event types gracefully', async () => {
      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })

    it('returns 500 when webhook processing fails', async () => {
      // Subscription update that fails due to database error
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        metadata: { supabase_user_id: 'user-123' },
        items: { data: [{ price: { id: 'price_premium' } }] },
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      })
      ;(getTierByPriceId as jest.Mock).mockReturnValue('premium')

      // Mock update to return an error
      const eqMock = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock })
      configureMock({ update: updateMock })

      const request = createMockRequest('{}')
      const response = await POST(request as any)

      expect(response.status).toBe(500)
    })

    it('handles checkout without user ID in metadata', async () => {
      // Checkout without userId should return success but not update anything
      const mockSession = {
        metadata: {},
        customer: 'cus_test123',
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: mockSession },
      })

      const request = createMockRequest('{}')
      const response = await POST(request as any)
      const data = await response.json()

      // Should still return 200 (webhook received) but not update anything
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })

    it('handles subscription deleted when profile not found', async () => {
      // Subscription deleted where customer lookup returns no profile
      const mockSubscription = {
        customer: 'cus_unknown',
      }

      ;(headers as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue('sig_test123'),
      })
      ;(constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      })

      // Mock select to return null (no profile found)
      const { selectMock } = createSelectSingleMock(null)
      configureMock({ select: selectMock })

      const request = createMockRequest('{}')
      const response = await POST(request as any)

      // Should still return 200 even if profile not found
      expect(response.status).toBe(200)
    })
  })
})
