import Stripe from 'stripe'

/**
 * Server-side Stripe client
 *
 * Use this in API routes and server components.
 * NEVER import this on the client side.
 *
 * Lazy-initialized to avoid build-time errors when env vars aren't available.
 */
let _stripe: Stripe | null = null
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured')
      }
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
      })
    }
    return (_stripe as any)[prop]
  }
})

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession({
  priceId,
  userId,
  email,
  successUrl,
  cancelUrl,
}: {
  priceId: string
  userId: string
  email: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  // First, check if customer exists
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  let customerId = customers.data[0]?.id

  // Create customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        supabase_user_id: userId,
      },
    })
    customerId = customer.id
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      supabase_user_id: userId,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
      },
    },
    allow_promotion_codes: true,
  })

  return session
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
    expand: ['data.subscriptions'],
  })

  return customers.data[0] || null
}

/**
 * Get customer's active subscription
 */
export async function getActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })

  return subscriptions.data[0] || null
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Get subscription invoice history
 */
export async function getInvoiceHistory(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  })

  return invoices.data
}

/**
 * Construct event from webhook payload
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
