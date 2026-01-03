import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/server'
import { STRIPE_CONFIG } from '@/lib/stripe/config'

/**
 * POST /api/stripe/checkout
 *
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { priceId, tier } = body

    // Validate tier
    if (tier !== 'premium') {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      )
    }

    // Use provided priceId or default from config
    const stripePriceId = priceId || STRIPE_CONFIG.prices.premium_monthly

    // Get return URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${origin}/dashboard/settings?checkout=success`
    const cancelUrl = `${origin}/dashboard/upgrade?checkout=cancelled`

    // Create checkout session
    const session = await createCheckoutSession({
      priceId: stripePriceId,
      userId: user.id,
      email: user.email!,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
