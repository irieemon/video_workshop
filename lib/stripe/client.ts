'use client'

import { loadStripe, Stripe } from '@stripe/stripe-js'

/**
 * Client-side Stripe instance
 *
 * This is a singleton that loads Stripe only once.
 * Use this in client components for checkout flows.
 */
let stripePromise: Promise<Stripe | null>

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

/**
 * Redirect to Stripe Checkout using the session URL
 *
 * Modern approach: The checkout session URL is returned from the server
 * and we simply redirect to it.
 */
export function redirectToCheckoutUrl(url: string): void {
  window.location.href = url
}

/**
 * Legacy redirect to Stripe Checkout (deprecated)
 * Use redirectToCheckoutUrl instead with the session URL from the server.
 */
export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe()

  if (!stripe) {
    throw new Error('Failed to load Stripe')
  }

  // Use type assertion for legacy API compatibility
  const stripeWithLegacy = stripe as unknown as {
    redirectToCheckout: (options: { sessionId: string }) => Promise<{ error?: Error }>
  }

  if (typeof stripeWithLegacy.redirectToCheckout === 'function') {
    const { error } = await stripeWithLegacy.redirectToCheckout({ sessionId })
    if (error) {
      throw error
    }
  } else {
    // Fallback: construct checkout URL manually
    window.location.href = `https://checkout.stripe.com/c/pay/${sessionId}`
  }
}
