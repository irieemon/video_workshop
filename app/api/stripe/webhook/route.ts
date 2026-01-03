import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { constructWebhookEvent, stripe } from '@/lib/stripe/server'
import { getQuotaForTier, getTierByPriceId } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'

// Use service role client for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/stripe/webhook
 *
 * Handle Stripe webhook events for subscription lifecycle
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout session completion
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id
  const customerId = session.customer as string

  if (!userId) {
    console.error('No user ID in checkout session metadata')
    return
  }

  // Update user profile with Stripe customer ID
  await supabaseAdmin
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
    })
    .eq('id', userId)

  console.log(`Checkout completed for user ${userId}`)
}

/**
 * Handle subscription creation or update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id
  const customerId = subscription.customer as string

  // If no userId in subscription metadata, try to find by customer
  let targetUserId = userId
  if (!targetUserId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    targetUserId = profile?.id
  }

  if (!targetUserId) {
    console.error('Cannot find user for subscription update')
    return
  }

  // Determine the tier from the price
  const priceId = subscription.items.data[0]?.price.id
  const tier = priceId ? getTierByPriceId(priceId) : null
  const newTier = tier || (subscription.status === 'active' ? 'premium' : 'free')

  // Get quota for the tier
  const quota = getQuotaForTier(newTier)

  // Calculate subscription expiry (type assertion for period property)
  const subData = subscription as unknown as { current_period_end?: number }
  const expiresAt = subData.current_period_end
    ? new Date(subData.current_period_end * 1000).toISOString()
    : null

  // Update user profile
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: newTier,
      subscription_expires_at: expiresAt,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      usage_quota: quota,
    })
    .eq('id', targetUserId)

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  console.log(`Subscription updated for user ${targetUserId}: ${newTier} (${subscription.status})`)
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('Cannot find user for subscription deletion')
    return
  }

  // Reset to free tier
  const freeQuota = getQuotaForTier('free')

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_expires_at: null,
      stripe_subscription_id: null,
      subscription_status: 'cancelled',
      usage_quota: freeQuota,
    })
    .eq('id', profile.id)

  if (error) {
    console.error('Error resetting profile to free tier:', error)
    throw error
  }

  console.log(`Subscription cancelled for user ${profile.id}`)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('Cannot find user for payment failure')
    return
  }

  // Update subscription status
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id)

  // TODO: Send email notification about payment failure
  console.log(`Payment failed for user ${profile.id}`)
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  // Type assertion for invoice subscription property
  const invoiceData = invoice as unknown as { subscription?: string | null }
  const subscriptionId = invoiceData.subscription

  if (!subscriptionId) return

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Update subscription status and expiry (type assertion for period property)
  const subData = subscription as unknown as { current_period_end?: number }
  const expiresAt = subData.current_period_end
    ? new Date(subData.current_period_end * 1000).toISOString()
    : null

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_expires_at: expiresAt,
    })
    .eq('id', profile.id)

  console.log(`Payment succeeded for user ${profile.id}`)
}
