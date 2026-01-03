/**
 * Stripe Configuration
 *
 * Defines pricing tiers and Stripe product configuration.
 * Update these values after creating products in Stripe Dashboard.
 */

export const STRIPE_CONFIG = {
  // Price IDs from Stripe Dashboard
  // These should be set in environment variables for production
  prices: {
    premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || 'price_premium_annual',
  },

  // Portal configuration ID (create in Stripe Dashboard)
  customerPortalConfigId: process.env.STRIPE_CUSTOMER_PORTAL_CONFIG_ID,
} as const

/**
 * Pricing tier definitions
 */
export const PRICING_TIERS = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    priceId: null,
    features: [
      '3 projects',
      '10 videos per month',
      '10 AI consultations per month',
      'Basic AI agents',
      'Community support',
    ],
    limits: {
      projects: 3,
      videos_per_month: 10,
      consultations_per_month: 10,
    },
  },
  premium: {
    name: 'Premium',
    description: 'For professional creators',
    price: 29,
    priceId: STRIPE_CONFIG.prices.premium_monthly,
    popular: true,
    features: [
      'Unlimited projects',
      '100 videos per month',
      'Unlimited AI consultations',
      'Advanced AI agents',
      'Sora video generation',
      'Series management',
      'Priority support',
      'Character consistency',
    ],
    limits: {
      projects: 999999,
      videos_per_month: 100,
      consultations_per_month: 999999,
    },
  },
} as const

export type PricingTier = keyof typeof PRICING_TIERS

/**
 * Tier limits for quick access (matches usage_quota structure in database)
 */
export const TIER_LIMITS = {
  free: {
    projects: 3,
    videos_per_month: 10,
    consultations_per_month: 10,
  },
  premium: {
    projects: 999999,
    videos_per_month: 100,
    consultations_per_month: 999999,
  },
} as const

/**
 * Get quota for a subscription tier
 */
export function getQuotaForTier(tier: PricingTier) {
  return PRICING_TIERS[tier].limits
}

/**
 * Check if a tier has access to a feature
 */
export function tierHasFeature(tier: PricingTier, feature: string): boolean {
  return (PRICING_TIERS[tier].features as readonly string[]).includes(feature)
}

/**
 * Get tier by Stripe price ID
 */
export function getTierByPriceId(priceId: string): PricingTier | null {
  if (priceId === STRIPE_CONFIG.prices.premium_monthly ||
      priceId === STRIPE_CONFIG.prices.premium_annual) {
    return 'premium'
  }
  return null
}
