/**
 * Tests for Stripe Configuration
 *
 * Tests pricing tier definitions, quota lookups, and tier feature access.
 */

import {
  STRIPE_CONFIG,
  PRICING_TIERS,
  TIER_LIMITS,
  getQuotaForTier,
  tierHasFeature,
  getTierByPriceId,
  PricingTier,
} from '@/lib/stripe/config'

describe('Stripe Configuration', () => {
  describe('STRIPE_CONFIG', () => {
    it('defines price IDs for premium plans', () => {
      expect(STRIPE_CONFIG.prices).toBeDefined()
      expect(STRIPE_CONFIG.prices.premium_monthly).toBeDefined()
      expect(STRIPE_CONFIG.prices.premium_annual).toBeDefined()
    })

    it('has customer portal config ID field', () => {
      expect('customerPortalConfigId' in STRIPE_CONFIG).toBe(true)
    })
  })

  describe('PRICING_TIERS', () => {
    describe('Free Tier', () => {
      it('has correct tier name', () => {
        expect(PRICING_TIERS.free.name).toBe('Free')
      })

      it('has zero price', () => {
        expect(PRICING_TIERS.free.price).toBe(0)
      })

      it('has no price ID (not purchasable)', () => {
        expect(PRICING_TIERS.free.priceId).toBeNull()
      })

      it('has correct project limit', () => {
        expect(PRICING_TIERS.free.limits.projects).toBe(3)
      })

      it('has correct video limit', () => {
        expect(PRICING_TIERS.free.limits.videos_per_month).toBe(10)
      })

      it('has correct consultation limit', () => {
        expect(PRICING_TIERS.free.limits.consultations_per_month).toBe(10)
      })

      it('includes expected features', () => {
        expect(PRICING_TIERS.free.features).toContain('3 projects')
        expect(PRICING_TIERS.free.features).toContain('10 videos per month')
        expect(PRICING_TIERS.free.features).toContain('Community support')
      })

      it('does not include premium features', () => {
        expect(PRICING_TIERS.free.features).not.toContain('Sora video generation')
        expect(PRICING_TIERS.free.features).not.toContain('Unlimited projects')
      })
    })

    describe('Premium Tier', () => {
      it('has correct tier name', () => {
        expect(PRICING_TIERS.premium.name).toBe('Premium')
      })

      it('has positive price', () => {
        expect(PRICING_TIERS.premium.price).toBe(29)
      })

      it('has valid price ID', () => {
        expect(PRICING_TIERS.premium.priceId).toBeDefined()
        expect(typeof PRICING_TIERS.premium.priceId).toBe('string')
      })

      it('is marked as popular', () => {
        expect(PRICING_TIERS.premium.popular).toBe(true)
      })

      it('has very high project limit (effectively unlimited)', () => {
        expect(PRICING_TIERS.premium.limits.projects).toBe(999999)
      })

      it('has higher video limit than free', () => {
        expect(PRICING_TIERS.premium.limits.videos_per_month).toBe(100)
        expect(PRICING_TIERS.premium.limits.videos_per_month).toBeGreaterThan(
          PRICING_TIERS.free.limits.videos_per_month
        )
      })

      it('has very high consultation limit (effectively unlimited)', () => {
        expect(PRICING_TIERS.premium.limits.consultations_per_month).toBe(999999)
      })

      it('includes premium features', () => {
        expect(PRICING_TIERS.premium.features).toContain('Sora video generation')
        expect(PRICING_TIERS.premium.features).toContain('Unlimited projects')
        expect(PRICING_TIERS.premium.features).toContain('Character consistency')
        expect(PRICING_TIERS.premium.features).toContain('Priority support')
      })
    })
  })

  describe('TIER_LIMITS', () => {
    it('matches free tier limits from PRICING_TIERS', () => {
      expect(TIER_LIMITS.free).toEqual(PRICING_TIERS.free.limits)
    })

    it('matches premium tier limits from PRICING_TIERS', () => {
      expect(TIER_LIMITS.premium).toEqual(PRICING_TIERS.premium.limits)
    })

    it('has consistent structure across tiers', () => {
      const freeKeys = Object.keys(TIER_LIMITS.free).sort()
      const premiumKeys = Object.keys(TIER_LIMITS.premium).sort()
      expect(freeKeys).toEqual(premiumKeys)
    })
  })

  describe('getQuotaForTier', () => {
    it('returns free tier limits', () => {
      const quota = getQuotaForTier('free')
      expect(quota).toEqual(PRICING_TIERS.free.limits)
    })

    it('returns premium tier limits', () => {
      const quota = getQuotaForTier('premium')
      expect(quota).toEqual(PRICING_TIERS.premium.limits)
    })

    it('returns correct projects limit for each tier', () => {
      expect(getQuotaForTier('free').projects).toBe(3)
      expect(getQuotaForTier('premium').projects).toBe(999999)
    })

    it('returns correct videos_per_month limit for each tier', () => {
      expect(getQuotaForTier('free').videos_per_month).toBe(10)
      expect(getQuotaForTier('premium').videos_per_month).toBe(100)
    })
  })

  describe('tierHasFeature', () => {
    describe('Free Tier Features', () => {
      it('has basic features', () => {
        expect(tierHasFeature('free', '3 projects')).toBe(true)
        expect(tierHasFeature('free', '10 videos per month')).toBe(true)
        expect(tierHasFeature('free', 'Basic AI agents')).toBe(true)
        expect(tierHasFeature('free', 'Community support')).toBe(true)
      })

      it('does not have premium features', () => {
        expect(tierHasFeature('free', 'Sora video generation')).toBe(false)
        expect(tierHasFeature('free', 'Priority support')).toBe(false)
        expect(tierHasFeature('free', 'Character consistency')).toBe(false)
      })
    })

    describe('Premium Tier Features', () => {
      it('has premium features', () => {
        expect(tierHasFeature('premium', 'Sora video generation')).toBe(true)
        expect(tierHasFeature('premium', 'Priority support')).toBe(true)
        expect(tierHasFeature('premium', 'Character consistency')).toBe(true)
        expect(tierHasFeature('premium', 'Unlimited projects')).toBe(true)
      })

      it('does not have non-existent features', () => {
        expect(tierHasFeature('premium', 'Non-existent feature')).toBe(false)
      })
    })

    it('returns false for unknown features', () => {
      expect(tierHasFeature('free', 'Unknown Feature XYZ')).toBe(false)
      expect(tierHasFeature('premium', 'Unknown Feature XYZ')).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(tierHasFeature('premium', 'Priority support')).toBe(true)
      expect(tierHasFeature('premium', 'priority support')).toBe(false)
      expect(tierHasFeature('premium', 'PRIORITY SUPPORT')).toBe(false)
    })
  })

  describe('getTierByPriceId', () => {
    it('returns premium for monthly price ID', () => {
      const tier = getTierByPriceId(STRIPE_CONFIG.prices.premium_monthly)
      expect(tier).toBe('premium')
    })

    it('returns premium for annual price ID', () => {
      const tier = getTierByPriceId(STRIPE_CONFIG.prices.premium_annual)
      expect(tier).toBe('premium')
    })

    it('returns null for unknown price ID', () => {
      expect(getTierByPriceId('price_unknown')).toBeNull()
      expect(getTierByPriceId('')).toBeNull()
      expect(getTierByPriceId('invalid')).toBeNull()
    })

    it('returns null for free tier (no price ID)', () => {
      // Free tier has no price ID, so no price ID should map to it
      expect(getTierByPriceId('price_free')).toBeNull()
    })
  })

  describe('Type Safety', () => {
    it('PricingTier type covers all tiers', () => {
      // Type check: ensure we can assign tier names to PricingTier type
      const tiers: PricingTier[] = ['free', 'premium']
      expect(tiers).toHaveLength(2)
    })

    it('all tier limits have same shape', () => {
      const tierKeys = Object.keys(PRICING_TIERS) as PricingTier[]

      for (const tier of tierKeys) {
        expect(PRICING_TIERS[tier]).toHaveProperty('name')
        expect(PRICING_TIERS[tier]).toHaveProperty('description')
        expect(PRICING_TIERS[tier]).toHaveProperty('price')
        expect(PRICING_TIERS[tier]).toHaveProperty('features')
        expect(PRICING_TIERS[tier]).toHaveProperty('limits')
        expect(PRICING_TIERS[tier].limits).toHaveProperty('projects')
        expect(PRICING_TIERS[tier].limits).toHaveProperty('videos_per_month')
        expect(PRICING_TIERS[tier].limits).toHaveProperty('consultations_per_month')
      }
    })
  })
})
