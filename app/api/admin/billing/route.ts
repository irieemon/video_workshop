import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAPILogger, LOG_MESSAGES } from '@/lib/logger'
import Stripe from 'stripe'

// Lazy-initialize Stripe to avoid build-time errors
let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  }
  return _stripe
}

/**
 * GET /api/admin/billing
 * Get billing statistics and revenue metrics
 * Admin only
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/admin/billing', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    logger.warn('Non-admin attempted to access billing API', { userId: user.id })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get subscription tier breakdown from database
    const { data: tierBreakdown } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')

    const tiers = {
      free: 0,
      premium: 0,
      trial: 0,
      cancelled: 0
    }

    tierBreakdown?.forEach(p => {
      if (p.subscription_tier === 'free') tiers.free++
      else if (p.subscription_tier === 'premium') {
        if (p.subscription_status === 'trialing') tiers.trial++
        else if (p.subscription_status === 'cancelled') tiers.cancelled++
        else tiers.premium++
      }
    })

    // Get payment history from our database
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const startOfLastMonth = new Date(startOfMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

    const { data: recentPayments } = await supabase
      .from('payment_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: thisMonthPayments } = await supabase
      .from('payment_history')
      .select('amount_paid')
      .eq('status', 'paid')
      .gte('created_at', startOfMonth.toISOString())

    const { data: lastMonthPayments } = await supabase
      .from('payment_history')
      .select('amount_paid')
      .eq('status', 'paid')
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())

    // Calculate revenue
    const revenueThisMonth = thisMonthPayments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0
    const revenueLastMonth = lastMonthPayments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0
    const revenueGrowth = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0

    // Calculate MRR based on active premium subscriptions
    // Premium is $29/month
    const activePremiumCount = tiers.premium
    const mrr = activePremiumCount * 2900 // in cents

    // Try to get more accurate data from Stripe if possible
    let stripeStats = null
    const stripe = getStripe()
    if (stripe) try {
      // Get balance from Stripe
      const balance = await stripe.balance.retrieve()
      const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0)
      const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0)

      // Get recent charges
      const charges = await stripe.charges.list({
        limit: 100,
        created: {
          gte: Math.floor(startOfMonth.getTime() / 1000)
        }
      })

      const stripeRevenueThisMonth = charges.data
        .filter(c => c.paid && !c.refunded)
        .reduce((sum, c) => sum + c.amount, 0)

      stripeStats = {
        availableBalance,
        pendingBalance,
        chargesThisMonth: charges.data.length,
        stripeRevenueThisMonth
      }
    } catch (stripeError) {
      console.error('Error fetching Stripe stats:', stripeError)
      // Continue without Stripe stats
    }

    const stats = {
      // Subscription breakdown
      subscriptions: {
        free: tiers.free,
        premium: tiers.premium,
        trial: tiers.trial,
        cancelled: tiers.cancelled,
        total: tierBreakdown?.length || 0
      },

      // Revenue metrics
      revenue: {
        mrr: mrr, // in cents
        revenueThisMonth: stripeStats?.stripeRevenueThisMonth || revenueThisMonth,
        revenueLastMonth: revenueLastMonth,
        growth: Math.round(revenueGrowth * 100) / 100
      },

      // Stripe balance (if available)
      stripe: stripeStats ? {
        availableBalance: stripeStats.availableBalance,
        pendingBalance: stripeStats.pendingBalance,
        chargesThisMonth: stripeStats.chargesThisMonth
      } : null,

      // Recent transactions
      recentPayments: (recentPayments || []).map(p => ({
        id: p.id,
        amount: p.amount_paid,
        currency: p.currency,
        status: p.status,
        description: p.description,
        date: p.created_at
      })),

      // Conversion metrics
      conversion: {
        freeToTrialRate: 0, // Would need historical data
        trialToPaidRate: 0, // Would need historical data
        churnRate: tiers.cancelled > 0 && (tiers.premium + tiers.cancelled) > 0
          ? (tiers.cancelled / (tiers.premium + tiers.cancelled)) * 100
          : 0
      }
    }

    logger.info('Admin fetched billing stats')

    return NextResponse.json(stats)
  } catch (error) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
