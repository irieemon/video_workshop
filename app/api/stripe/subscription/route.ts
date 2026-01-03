import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription, getInvoiceHistory, getCustomerByEmail } from '@/lib/stripe/server'

/**
 * GET /api/stripe/subscription
 *
 * Get the current user's subscription status and details
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        subscription_tier,
        subscription_expires_at,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        usage_quota,
        usage_current
      `)
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Build response
    const response: any = {
      tier: profile.subscription_tier || 'free',
      status: profile.subscription_status || 'none',
      expiresAt: profile.subscription_expires_at,
      usage: {
        quota: profile.usage_quota,
        current: profile.usage_current,
      },
      hasActiveSubscription: profile.subscription_tier === 'premium' &&
        (profile.subscription_status === 'active' || profile.subscription_status === 'trialing'),
    }

    // If they have a Stripe customer, fetch additional details
    if (profile.stripe_customer_id) {
      try {
        // Get active subscription details from Stripe
        const subscription = await getActiveSubscription(profile.stripe_customer_id)

        if (subscription) {
          // Type assertion for subscription period properties
          const sub = subscription as unknown as {
            id: string
            status: string
            cancel_at_period_end: boolean
            current_period_end: number
            current_period_start: number
          }
          response.subscription = {
            id: sub.id,
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          }
        }

        // Get recent invoices
        const invoices = await getInvoiceHistory(profile.stripe_customer_id, 5)
        response.recentInvoices = invoices.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
          url: invoice.hosted_invoice_url,
        }))
      } catch (stripeError) {
        console.error('Error fetching Stripe details:', stripeError)
        // Continue with basic info if Stripe fetch fails
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error getting subscription:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
