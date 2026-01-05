/**
 * Stripe SDK Mock Utilities
 *
 * Centralized Stripe SDK mocking for consistent, reusable test patterns.
 * Provides type-safe mocks for all Stripe operations used in the application.
 *
 * Usage in test files:
 * ```typescript
 * import { createStripeMockFactory, getStripeMocks, mockCustomer } from '../helpers/stripe-mock'
 *
 * // At top of file, before any imports that use Stripe
 * jest.mock('stripe', () => require('../helpers/stripe-mock').createStripeMockFactory())
 *
 * // In tests
 * const { mockCustomersList, mockCheckoutCreate } = getStripeMocks()
 * mockCustomersList.mockResolvedValue({ data: [mockCustomer()] })
 * ```
 */

import Stripe from 'stripe'

// ============================================================================
// Types
// ============================================================================

export interface StripeMockInstance {
  mockCustomersList: jest.Mock
  mockCustomersCreate: jest.Mock
  mockCheckoutSessionsCreate: jest.Mock
  mockBillingPortalSessionsCreate: jest.Mock
  mockSubscriptionsList: jest.Mock
  mockSubscriptionsUpdate: jest.Mock
  mockInvoicesList: jest.Mock
  mockWebhooksConstructEvent: jest.Mock
}

export interface MockCustomerOptions {
  id?: string
  email?: string
  name?: string
  metadata?: Record<string, string>
}

export interface MockSubscriptionOptions {
  id?: string
  customerId?: string
  status?: Stripe.Subscription.Status
  priceId?: string
  currentPeriodStart?: number
  currentPeriodEnd?: number
  cancelAtPeriodEnd?: boolean
}

export interface MockCheckoutSessionOptions {
  id?: string
  customerId?: string
  mode?: 'subscription' | 'payment' | 'setup'
  url?: string
  status?: 'open' | 'complete' | 'expired'
}

export interface MockInvoiceOptions {
  id?: string
  customerId?: string
  status?: Stripe.Invoice.Status
  amountDue?: number
  amountPaid?: number
  currency?: string
  created?: number
  hostedInvoiceUrl?: string
}

// ============================================================================
// Mock Factory
// ============================================================================

// Singleton mock functions accessible across test files
const mockFunctions = {
  mockCustomersList: jest.fn(),
  mockCustomersCreate: jest.fn(),
  mockCheckoutSessionsCreate: jest.fn(),
  mockBillingPortalSessionsCreate: jest.fn(),
  mockSubscriptionsList: jest.fn(),
  mockSubscriptionsUpdate: jest.fn(),
  mockInvoicesList: jest.fn(),
  mockWebhooksConstructEvent: jest.fn(),
}

/**
 * Creates the Stripe mock factory for jest.mock()
 *
 * @example
 * ```typescript
 * jest.mock('stripe', () => require('../helpers/stripe-mock').createStripeMockFactory())
 * ```
 */
export function createStripeMockFactory() {
  return jest.fn().mockImplementation(() => ({
    customers: {
      list: mockFunctions.mockCustomersList,
      create: mockFunctions.mockCustomersCreate,
    },
    checkout: {
      sessions: {
        create: mockFunctions.mockCheckoutSessionsCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: mockFunctions.mockBillingPortalSessionsCreate,
      },
    },
    subscriptions: {
      list: mockFunctions.mockSubscriptionsList,
      update: mockFunctions.mockSubscriptionsUpdate,
    },
    invoices: {
      list: mockFunctions.mockInvoicesList,
    },
    webhooks: {
      constructEvent: mockFunctions.mockWebhooksConstructEvent,
    },
  }))
}

/**
 * Get the mock functions for configuring in tests
 */
export function getStripeMocks(): StripeMockInstance {
  return mockFunctions
}

/**
 * Reset all Stripe mocks between tests
 */
export function resetStripeMocks(): void {
  Object.values(mockFunctions).forEach((mock) => mock.mockReset())
}

/**
 * Clear all Stripe mocks (keeps implementations)
 */
export function clearStripeMocks(): void {
  Object.values(mockFunctions).forEach((mock) => mock.mockClear())
}

// ============================================================================
// Mock Data Builders
// ============================================================================

/**
 * Create a mock Stripe Customer object
 */
export function mockCustomer(options: MockCustomerOptions = {}): Stripe.Customer {
  const {
    id = `cus_${Date.now()}`,
    email = 'test@example.com',
    name = 'Test User',
    metadata = {},
  } = options

  return {
    id,
    object: 'customer',
    email,
    name,
    metadata,
    address: null,
    balance: 0,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    invoice_prefix: id.substring(0, 8).toUpperCase(),
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    next_invoice_sequence: 1,
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
  } as Stripe.Customer
}

/**
 * Create a mock Stripe Subscription object
 */
export function mockSubscription(options: MockSubscriptionOptions = {}): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000)
  const {
    id = `sub_${Date.now()}`,
    customerId = `cus_${Date.now()}`,
    status = 'active',
    priceId = 'price_premium_monthly',
    currentPeriodStart = now,
    currentPeriodEnd = now + 30 * 24 * 60 * 60,
    cancelAtPeriodEnd = false,
  } = options

  return {
    id,
    object: 'subscription',
    application: null,
    application_fee_percent: null,
    automatic_tax: { enabled: false, liability: null },
    billing_cycle_anchor: currentPeriodStart,
    billing_cycle_anchor_config: null,
    billing_thresholds: null,
    cancel_at: null,
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: null,
    cancellation_details: null,
    collection_method: 'charge_automatically',
    created: currentPeriodStart,
    currency: 'usd',
    current_period_end: currentPeriodEnd,
    current_period_start: currentPeriodStart,
    customer: customerId,
    days_until_due: null,
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    discounts: [],
    ended_at: null,
    invoice_settings: { issuer: { type: 'self' } },
    items: {
      object: 'list',
      data: [
        {
          id: `si_${Date.now()}`,
          object: 'subscription_item',
          billing_thresholds: null,
          created: currentPeriodStart,
          discounts: [],
          metadata: {},
          plan: {
            id: priceId,
            object: 'plan',
            active: true,
            amount: 2999,
            amount_decimal: '2999',
            billing_scheme: 'per_unit',
            created: currentPeriodStart,
            currency: 'usd',
            interval: 'month',
            interval_count: 1,
            livemode: false,
            metadata: {},
            meter: null,
            nickname: 'Premium Monthly',
            product: 'prod_premium',
            tiers_mode: null,
            transform_usage: null,
            trial_period_days: null,
            usage_type: 'licensed',
          } as Stripe.Plan,
          price: {
            id: priceId,
            object: 'price',
            active: true,
            billing_scheme: 'per_unit',
            created: currentPeriodStart,
            currency: 'usd',
            livemode: false,
            lookup_key: null,
            metadata: {},
            nickname: 'Premium Monthly',
            product: 'prod_premium',
            recurring: {
              interval: 'month',
              interval_count: 1,
              usage_type: 'licensed',
            },
            tax_behavior: 'unspecified',
            type: 'recurring',
            unit_amount: 2999,
            unit_amount_decimal: '2999',
          } as Stripe.Price,
          quantity: 1,
          subscription: id,
          tax_rates: [],
        } as unknown as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: `/v1/subscription_items?subscription=${id}`,
    },
    latest_invoice: null,
    livemode: false,
    metadata: {},
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: null,
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    schedule: null,
    start_date: currentPeriodStart,
    status,
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: null,
    trial_start: null,
  } as unknown as Stripe.Subscription
}

/**
 * Create a mock Stripe Checkout Session object
 */
export function mockCheckoutSession(options: MockCheckoutSessionOptions = {}): Stripe.Checkout.Session {
  const {
    id = `cs_test_${Date.now()}`,
    customerId = `cus_${Date.now()}`,
    mode = 'subscription',
    url = 'https://checkout.stripe.com/test-session',
    status = 'open',
  } = options

  return {
    id,
    object: 'checkout.session',
    after_expiration: null,
    allow_promotion_codes: null,
    amount_subtotal: 2999,
    amount_total: 2999,
    automatic_tax: { enabled: false, liability: null, status: null },
    billing_address_collection: null,
    cancel_url: 'https://example.com/cancel',
    client_reference_id: null,
    client_secret: null,
    consent: null,
    consent_collection: null,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    currency_conversion: null,
    custom_fields: [],
    custom_text: { after_submit: null, shipping_address: null, submit: null, terms_of_service_acceptance: null },
    customer: customerId,
    customer_creation: null,
    customer_details: null,
    customer_email: null,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    invoice: null,
    invoice_creation: null,
    livemode: false,
    locale: null,
    metadata: {},
    mode,
    payment_intent: null,
    payment_link: null,
    payment_method_collection: 'always',
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ['card'],
    payment_status: 'unpaid',
    phone_number_collection: { enabled: false },
    recovered_from: null,
    redirect_on_completion: 'always',
    return_url: null,
    saved_payment_method_options: null,
    setup_intent: null,
    shipping_address_collection: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    status,
    submit_type: null,
    subscription: null,
    success_url: 'https://example.com/success',
    tax_id_collection: null,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
    ui_mode: 'hosted',
    url,
  } as unknown as Stripe.Checkout.Session
}

/**
 * Create a mock Stripe Invoice object
 */
export function mockInvoice(options: MockInvoiceOptions = {}): Stripe.Invoice {
  const {
    id = `in_${Date.now()}`,
    customerId = `cus_${Date.now()}`,
    status = 'paid',
    amountDue = 2999,
    amountPaid = 2999,
    currency = 'usd',
    created = Math.floor(Date.now() / 1000),
    hostedInvoiceUrl = 'https://invoice.stripe.com/test',
  } = options

  return {
    id,
    object: 'invoice',
    account_country: 'US',
    account_name: 'Test Company',
    account_tax_ids: null,
    amount_due: amountDue,
    amount_paid: amountPaid,
    amount_remaining: amountDue - amountPaid,
    amount_shipping: 0,
    application: null,
    application_fee_amount: null,
    attempt_count: 1,
    attempted: true,
    auto_advance: false,
    automatic_tax: { enabled: false, liability: null, status: null },
    billing_reason: 'subscription_cycle',
    charge: null,
    collection_method: 'charge_automatically',
    created,
    currency,
    custom_fields: null,
    customer: customerId,
    customer_address: null,
    customer_email: 'test@example.com',
    customer_name: 'Test User',
    customer_phone: null,
    customer_shipping: null,
    customer_tax_exempt: 'none',
    customer_tax_ids: [],
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    discounts: [],
    due_date: null,
    effective_at: created,
    ending_balance: 0,
    footer: null,
    from_invoice: null,
    hosted_invoice_url: hostedInvoiceUrl,
    invoice_pdf: `${hostedInvoiceUrl}/pdf`,
    issuer: { type: 'self' },
    last_finalization_error: null,
    latest_revision: null,
    lines: { object: 'list', data: [], has_more: false, url: `/v1/invoices/${id}/lines` },
    livemode: false,
    metadata: {},
    next_payment_attempt: null,
    number: `INV-${Date.now()}`,
    on_behalf_of: null,
    paid: status === 'paid',
    paid_out_of_band: false,
    payment_intent: null,
    payment_settings: { default_mandate: null, payment_method_options: null, payment_method_types: null },
    period_end: created,
    period_start: created - 30 * 24 * 60 * 60,
    post_payment_credit_notes_amount: 0,
    pre_payment_credit_notes_amount: 0,
    quote: null,
    receipt_number: null,
    rendering: null,
    shipping_cost: null,
    shipping_details: null,
    starting_balance: 0,
    statement_descriptor: null,
    status,
    status_transitions: {
      finalized_at: created,
      marked_uncollectible_at: null,
      paid_at: status === 'paid' ? created : null,
      voided_at: null,
    },
    subscription: null,
    subscription_details: null,
    subtotal: amountDue,
    subtotal_excluding_tax: amountDue,
    tax: null,
    test_clock: null,
    total: amountDue,
    total_discount_amounts: [],
    total_excluding_tax: amountDue,
    total_tax_amounts: [],
    transfer_data: null,
    webhooks_delivered_at: null,
  } as unknown as Stripe.Invoice
}

/**
 * Create a mock Stripe Billing Portal Session
 */
export function mockPortalSession(url = 'https://billing.stripe.com/session/test'): Stripe.BillingPortal.Session {
  return {
    id: `bps_${Date.now()}`,
    object: 'billing_portal.session',
    configuration: `bpc_${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    customer: `cus_${Date.now()}`,
    flow: null,
    livemode: false,
    locale: null,
    on_behalf_of: null,
    return_url: 'https://example.com/settings',
    url,
  } as unknown as Stripe.BillingPortal.Session
}

// ============================================================================
// Webhook Event Helpers
// ============================================================================

/**
 * Create a mock Stripe webhook event
 */
export function mockWebhookEvent<T extends object>(
  type: string,
  data: T
): Stripe.Event {
  return {
    id: `evt_${Date.now()}`,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data as Stripe.Event.Data['object'],
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: `req_${Date.now()}`,
      idempotency_key: null,
    },
    type,
  } as Stripe.Event
}

/**
 * Common webhook event types
 */
export const WebhookEvents = {
  CHECKOUT_COMPLETED: 'checkout.session.completed',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
} as const

// ============================================================================
// Convenience Setup Functions
// ============================================================================

/**
 * Configure mocks for a successful checkout flow
 */
export function setupSuccessfulCheckoutFlow(customerId: string, email: string): void {
  const { mockCustomersList, mockCustomersCreate, mockCheckoutSessionsCreate } = getStripeMocks()

  // No existing customer
  mockCustomersList.mockResolvedValue({ data: [] })

  // Create new customer
  mockCustomersCreate.mockResolvedValue(mockCustomer({ id: customerId, email }))

  // Create checkout session
  mockCheckoutSessionsCreate.mockResolvedValue(mockCheckoutSession({ customerId }))
}

/**
 * Configure mocks for an existing customer checkout
 */
export function setupExistingCustomerCheckout(customerId: string, email: string): void {
  const { mockCustomersList, mockCheckoutSessionsCreate } = getStripeMocks()

  // Existing customer found
  mockCustomersList.mockResolvedValue({
    data: [mockCustomer({ id: customerId, email })],
  })

  // Create checkout session
  mockCheckoutSessionsCreate.mockResolvedValue(mockCheckoutSession({ customerId }))
}

/**
 * Configure mocks for active subscription lookup
 */
export function setupActiveSubscription(customerId: string): Stripe.Subscription {
  const { mockCustomersList, mockSubscriptionsList } = getStripeMocks()

  mockCustomersList.mockResolvedValue({
    data: [mockCustomer({ id: customerId })],
  })

  const subscription = mockSubscription({ customerId, status: 'active' })
  mockSubscriptionsList.mockResolvedValue({ data: [subscription] })

  return subscription
}

/**
 * Configure mocks for no active subscription
 */
export function setupNoSubscription(customerId: string): void {
  const { mockCustomersList, mockSubscriptionsList } = getStripeMocks()

  mockCustomersList.mockResolvedValue({
    data: [mockCustomer({ id: customerId })],
  })

  mockSubscriptionsList.mockResolvedValue({ data: [] })
}
