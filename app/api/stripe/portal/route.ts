import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession, getCustomerByEmail } from '@/lib/stripe/server'

/**
 * POST /api/stripe/portal
 *
 * Create a Stripe Customer Portal session for subscription management
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

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    // If no customer ID stored, try to find by email
    if (!customerId) {
      const customer = await getCustomerByEmail(user.email!)
      customerId = customer?.id
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 404 }
      )
    }

    // Get return URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${origin}/dashboard/settings`

    // Create portal session
    const session = await createPortalSession({
      customerId,
      returnUrl,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
