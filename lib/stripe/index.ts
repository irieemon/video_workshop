/**
 * Stripe Module
 *
 * Provides Stripe integration for subscription management.
 *
 * @example
 * // Client-side (checkout redirect)
 * import { getStripe, redirectToCheckout } from '@/lib/stripe/client'
 *
 * @example
 * // Server-side (API routes)
 * import { stripe, createCheckoutSession } from '@/lib/stripe/server'
 *
 * @example
 * // Configuration
 * import { PRICING_TIERS, getQuotaForTier } from '@/lib/stripe/config'
 */

// Configuration exports
export {
  STRIPE_CONFIG,
  PRICING_TIERS,
  TIER_LIMITS,
  getQuotaForTier,
  tierHasFeature,
  getTierByPriceId,
  type PricingTier,
} from './config'

// Usage enforcement exports
export {
  checkQuota,
  incrementUsage,
  decrementUsage,
  getFullUsageStatus,
  enforceQuota,
  createQuotaExceededResponse,
  type ResourceType,
  type UsageStatus,
  type QuotaCheckResult,
} from './usage'
