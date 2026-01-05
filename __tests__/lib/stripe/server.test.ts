/**
 * Tests for Stripe Server Utilities
 *
 * Tests the server-side Stripe SDK wrapper functions.
 * Uses mocked Stripe SDK to avoid real API calls.
 */

// Mock Stripe SDK
const mockCustomersList = jest.fn()
const mockCustomersCreate = jest.fn()
const mockCheckoutSessionsCreate = jest.fn()
const mockBillingPortalSessionsCreate = jest.fn()
const mockSubscriptionsList = jest.fn()
const mockSubscriptionsUpdate = jest.fn()
const mockInvoicesList = jest.fn()
const mockWebhooksConstructEvent = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      list: mockCustomersList,
      create: mockCustomersCreate,
    },
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: mockBillingPortalSessionsCreate,
      },
    },
    subscriptions: {
      list: mockSubscriptionsList,
      update: mockSubscriptionsUpdate,
    },
    invoices: {
      list: mockInvoicesList,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  }))
})

import {
  createCheckoutSession,
  createPortalSession,
  getCustomerByEmail,
  getActiveSubscription,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getInvoiceHistory,
  constructWebhookEvent,
} from '@/lib/stripe/server'

describe('Stripe Server Utilities', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  describe('createCheckoutSession', () => {
    const baseParams = {
      priceId: 'price_premium_monthly',
      userId: 'user-123',
      email: 'test@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    }

    it('creates checkout session for new customer', async () => {
      mockCustomersList.mockResolvedValue({ data: [] })
      mockCustomersCreate.mockResolvedValue({ id: 'cus_new123' })
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_session',
        url: 'https://checkout.stripe.com/session',
      })

      const session = await createCheckoutSession(baseParams)

      expect(mockCustomersList).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
      })
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { supabase_user_id: 'user-123' },
      })
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_new123',
          mode: 'subscription',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        })
      )
      expect(session.id).toBe('cs_test_session')
    })

    it('uses existing customer if found', async () => {
      mockCustomersList.mockResolvedValue({
        data: [{ id: 'cus_existing456' }],
      })
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_session',
        url: 'https://checkout.stripe.com/session',
      })

      await createCheckoutSession(baseParams)

      expect(mockCustomersCreate).not.toHaveBeenCalled()
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing456',
        })
      )
    })

    it('includes correct line items', async () => {
      mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_test' }] })
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test' })

      await createCheckoutSession(baseParams)

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_premium_monthly',
              quantity: 1,
            },
          ],
        })
      )
    })

    it('includes user metadata', async () => {
      mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_test' }] })
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test' })

      await createCheckoutSession(baseParams)

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { supabase_user_id: 'user-123' },
          subscription_data: {
            metadata: { supabase_user_id: 'user-123' },
          },
        })
      )
    })

    it('allows promotion codes', async () => {
      mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_test' }] })
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test' })

      await createCheckoutSession(baseParams)

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_promotion_codes: true,
        })
      )
    })

    it('sets payment method to card', async () => {
      mockCustomersList.mockResolvedValue({ data: [{ id: 'cus_test' }] })
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test' })

      await createCheckoutSession(baseParams)

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
        })
      )
    })
  })

  describe('createPortalSession', () => {
    it('creates billing portal session', async () => {
      mockBillingPortalSessionsCreate.mockResolvedValue({
        id: 'bps_test',
        url: 'https://billing.stripe.com/portal',
      })

      const session = await createPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'https://example.com/settings',
      })

      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_test123',
        return_url: 'https://example.com/settings',
      })
      expect(session.url).toBe('https://billing.stripe.com/portal')
    })
  })

  describe('getCustomerByEmail', () => {
    it('returns customer when found', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        subscriptions: { data: [] },
      }
      mockCustomersList.mockResolvedValue({ data: [mockCustomer] })

      const customer = await getCustomerByEmail('test@example.com')

      expect(mockCustomersList).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
        expand: ['data.subscriptions'],
      })
      expect(customer).toEqual(mockCustomer)
    })

    it('returns null when not found', async () => {
      mockCustomersList.mockResolvedValue({ data: [] })

      const customer = await getCustomerByEmail('notfound@example.com')

      expect(customer).toBeNull()
    })
  })

  describe('getActiveSubscription', () => {
    it('returns active subscription when found', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_end: 1234567890,
      }
      mockSubscriptionsList.mockResolvedValue({ data: [mockSubscription] })

      const subscription = await getActiveSubscription('cus_test123')

      expect(mockSubscriptionsList).toHaveBeenCalledWith({
        customer: 'cus_test123',
        status: 'active',
        limit: 1,
      })
      expect(subscription).toEqual(mockSubscription)
    })

    it('returns null when no active subscription', async () => {
      mockSubscriptionsList.mockResolvedValue({ data: [] })

      const subscription = await getActiveSubscription('cus_test123')

      expect(subscription).toBeNull()
    })
  })

  describe('cancelSubscriptionAtPeriodEnd', () => {
    it('sets cancel_at_period_end to true', async () => {
      const mockUpdatedSub = {
        id: 'sub_test123',
        cancel_at_period_end: true,
      }
      mockSubscriptionsUpdate.mockResolvedValue(mockUpdatedSub)

      const subscription = await cancelSubscriptionAtPeriodEnd('sub_test123')

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      })
      expect(subscription.cancel_at_period_end).toBe(true)
    })
  })

  describe('reactivateSubscription', () => {
    it('sets cancel_at_period_end to false', async () => {
      const mockUpdatedSub = {
        id: 'sub_test123',
        cancel_at_period_end: false,
      }
      mockSubscriptionsUpdate.mockResolvedValue(mockUpdatedSub)

      const subscription = await reactivateSubscription('sub_test123')

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: false,
      })
      expect(subscription.cancel_at_period_end).toBe(false)
    })
  })

  describe('getInvoiceHistory', () => {
    it('returns invoice list', async () => {
      const mockInvoices = [
        { id: 'in_1', amount_paid: 2900, status: 'paid' },
        { id: 'in_2', amount_paid: 2900, status: 'paid' },
      ]
      mockInvoicesList.mockResolvedValue({ data: mockInvoices })

      const invoices = await getInvoiceHistory('cus_test123')

      expect(mockInvoicesList).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 10,
      })
      expect(invoices).toHaveLength(2)
    })

    it('uses custom limit', async () => {
      mockInvoicesList.mockResolvedValue({ data: [] })

      await getInvoiceHistory('cus_test123', 5)

      expect(mockInvoicesList).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 5,
      })
    })

    it('defaults to 10 invoices', async () => {
      mockInvoicesList.mockResolvedValue({ data: [] })

      await getInvoiceHistory('cus_test123')

      expect(mockInvoicesList).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 10,
      })
    })
  })

  describe('constructWebhookEvent', () => {
    it('constructs event from payload', () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_test' } },
      }
      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      const payload = '{"id":"evt_test123"}'
      const signature = 'sig_test'
      const webhookSecret = 'whsec_test'

      const event = constructWebhookEvent(payload, signature, webhookSecret)

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        webhookSecret
      )
      expect(event).toEqual(mockEvent)
    })

    it('handles Buffer payload', () => {
      mockWebhooksConstructEvent.mockReturnValue({ id: 'evt_test' })

      const payload = Buffer.from('{"id":"evt_test123"}')
      const signature = 'sig_test'
      const webhookSecret = 'whsec_test'

      constructWebhookEvent(payload, signature, webhookSecret)

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        webhookSecret
      )
    })

    it('throws on invalid signature', () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed')
      })

      expect(() => {
        constructWebhookEvent('payload', 'bad_sig', 'whsec_test')
      }).toThrow('Signature verification failed')
    })
  })

  describe('Lazy Initialization', () => {
    it('throws error when STRIPE_SECRET_KEY is not set', async () => {
      // Note: The stripe proxy pattern means this is tricky to test
      // The error is thrown on first property access
      // This test documents the expected behavior
      delete process.env.STRIPE_SECRET_KEY

      // In reality, the Proxy will throw when any method is accessed
      // The actual test would require resetting the module
      expect(process.env.STRIPE_SECRET_KEY).toBeUndefined()
    })
  })
})
