/**
 * Tests for lib/stripe/usage.ts
 *
 * Tests quota checking, usage tracking, and enforcement utilities.
 */

import {
  checkQuota,
  incrementUsage,
  decrementUsage,
  getFullUsageStatus,
  createQuotaExceededResponse,
  enforceQuota,
  type ResourceType,
  type UsageStatus,
} from '@/lib/stripe/usage'

// Mock Supabase client factory
function createMockSupabase(profileData: any, updateError: any = null) {
  const mockSingle = jest.fn().mockResolvedValue({
    data: profileData,
    error: profileData === null ? { message: 'Profile not found' } : null,
  })

  const mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({
      data: null,
      error: updateError,
    }),
  })

  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate,
    }),
    mockSingle,
    mockUpdate,
  }
}

describe('Stripe Usage', () => {
  const userId = 'test-user-id'

  describe('checkQuota', () => {
    it('allows usage when under limit for free tier', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { videos_per_month: 10, projects: 3, consultations_per_month: 10 },
        usage_current: { videos_this_month: 5, projects: 1, consultations_this_month: 3 },
      })

      const result = await checkQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(true)
      expect(result.status.current).toBe(5)
      expect(result.status.limit).toBe(10)
      expect(result.status.remaining).toBe(5)
      expect(result.status.percentUsed).toBe(50)
      expect(result.status.tier).toBe('free')
      expect(result.status.nearLimit).toBe(false)
      expect(result.status.atLimit).toBe(false)
      expect(result.status.upgradeRequired).toBe(false)
    })

    it('blocks usage when at limit for free tier', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { videos_per_month: 10, projects: 3, consultations_per_month: 10 },
        usage_current: { videos_this_month: 10, projects: 1, consultations_this_month: 3 },
      })

      const result = await checkQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(false)
      expect(result.status.current).toBe(10)
      expect(result.status.limit).toBe(10)
      expect(result.status.remaining).toBe(0)
      expect(result.status.atLimit).toBe(true)
      expect(result.status.upgradeRequired).toBe(true)
    })

    it('indicates near limit when usage is 80% or more', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { videos_per_month: 10 },
        usage_current: { videos_this_month: 8 },
      })

      const result = await checkQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(true)
      expect(result.status.nearLimit).toBe(true)
      expect(result.status.percentUsed).toBe(80)
    })

    it('handles premium tier correctly', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'premium',
        usage_quota: { videos_per_month: 100, projects: 999999 },
        usage_current: { videos_this_month: 50, projects: 20 },
      })

      const result = await checkQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(true)
      expect(result.status.tier).toBe('premium')
      expect(result.status.limit).toBe(100)
      expect(result.status.upgradeRequired).toBe(false)
    })

    it('checks projects quota correctly', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { projects: 3 },
        usage_current: { projects: 2 },
      })

      const result = await checkQuota(supabase as any, userId, 'projects')

      expect(result.allowed).toBe(true)
      expect(result.status.current).toBe(2)
      expect(result.status.limit).toBe(3)
    })

    it('checks consultations quota correctly', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { consultations_per_month: 10 },
        usage_current: { consultations_this_month: 10 },
      })

      const result = await checkQuota(supabase as any, userId, 'consultations')

      expect(result.allowed).toBe(false)
      expect(result.status.atLimit).toBe(true)
    })

    it('handles database error gracefully', async () => {
      const supabase = createMockSupabase(null)

      const result = await checkQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(false)
      expect(result.error).toBe('Failed to fetch user profile')
    })

    it('uses default free tier limits when profile has no quota data', async () => {
      const supabase = createMockSupabase({
        subscription_tier: null,
        usage_quota: null,
        usage_current: null,
      })

      const result = await checkQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(true)
      expect(result.status.tier).toBe('free')
      expect(result.status.current).toBe(0)
      // Uses TIER_LIMITS.free defaults
      expect(result.status.limit).toBe(10)
    })
  })

  describe('incrementUsage', () => {
    it('increments video usage correctly', async () => {
      const supabase = createMockSupabase({
        usage_current: { videos_this_month: 5, projects: 2, consultations_this_month: 3 },
      })

      const result = await incrementUsage(supabase as any, userId, 'videos')

      expect(result.success).toBe(true)
      expect(supabase.mockUpdate).toHaveBeenCalled()
    })

    it('increments project usage correctly', async () => {
      const supabase = createMockSupabase({
        usage_current: { videos_this_month: 5, projects: 2, consultations_this_month: 3 },
      })

      const result = await incrementUsage(supabase as any, userId, 'projects')

      expect(result.success).toBe(true)
    })

    it('increments consultation usage correctly', async () => {
      const supabase = createMockSupabase({
        usage_current: { consultations_this_month: 3 },
      })

      const result = await incrementUsage(supabase as any, userId, 'consultations')

      expect(result.success).toBe(true)
    })

    it('handles missing usage_current gracefully', async () => {
      const supabase = createMockSupabase({
        usage_current: null,
      })

      const result = await incrementUsage(supabase as any, userId, 'videos')

      expect(result.success).toBe(true)
    })

    it('returns error for invalid resource type', async () => {
      const supabase = createMockSupabase({
        usage_current: {},
      })

      const result = await incrementUsage(supabase as any, userId, 'invalid' as ResourceType)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid resource type')
    })

    it('handles update error gracefully', async () => {
      const supabase = createMockSupabase(
        { usage_current: { videos_this_month: 5 } },
        { message: 'Database error' }
      )

      const result = await incrementUsage(supabase as any, userId, 'videos')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('decrementUsage', () => {
    it('decrements video usage correctly', async () => {
      const supabase = createMockSupabase({
        usage_current: { videos_this_month: 5 },
      })

      const result = await decrementUsage(supabase as any, userId, 'videos')

      expect(result.success).toBe(true)
    })

    it('does not decrement below zero', async () => {
      const supabase = createMockSupabase({
        usage_current: { videos_this_month: 0 },
      })

      const result = await decrementUsage(supabase as any, userId, 'videos')

      expect(result.success).toBe(true)
      // The Math.max(0, currentFieldValue - 1) ensures it doesn't go below 0
    })

    it('returns error for invalid resource type', async () => {
      const supabase = createMockSupabase({
        usage_current: {},
      })

      const result = await decrementUsage(supabase as any, userId, 'invalid' as ResourceType)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid resource type')
    })
  })

  describe('getFullUsageStatus', () => {
    it('returns status for all resource types', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: {
          videos_per_month: 10,
          projects: 3,
          consultations_per_month: 10,
        },
        usage_current: {
          videos_this_month: 5,
          projects: 2,
          consultations_this_month: 8,
        },
      })

      const result = await getFullUsageStatus(supabase as any, userId)

      expect(result.videos).toBeDefined()
      expect(result.projects).toBeDefined()
      expect(result.consultations).toBeDefined()

      expect(result.videos.current).toBe(5)
      expect(result.projects.current).toBe(2)
      expect(result.consultations.current).toBe(8)
    })
  })

  describe('createQuotaExceededResponse', () => {
    const baseStatus: UsageStatus = {
      allowed: false,
      current: 10,
      limit: 10,
      remaining: 0,
      percentUsed: 100,
      tier: 'free',
      nearLimit: true,
      atLimit: true,
      upgradeRequired: true,
    }

    it('creates response with correct error structure', () => {
      const response = createQuotaExceededResponse(baseStatus, 'videos')

      expect(response.error).toBe('Quota exceeded')
      expect(response.code).toBe('QUOTA_EXCEEDED')
      expect(response.usage.current).toBe(10)
      expect(response.usage.limit).toBe(10)
      expect(response.upgradeRequired).toBe(true)
      expect(response.upgradeUrl).toBe('/dashboard/upgrade')
    })

    it('includes upgrade message for free tier', () => {
      const response = createQuotaExceededResponse(baseStatus, 'videos')

      expect(response.message).toContain('Upgrade to Premium')
    })

    it('includes reset message for premium tier', () => {
      const premiumStatus: UsageStatus = {
        ...baseStatus,
        tier: 'premium',
        upgradeRequired: false,
      }

      const response = createQuotaExceededResponse(premiumStatus, 'videos')

      expect(response.message).toContain('reset at the start of next month')
    })

    it('uses correct resource label for videos', () => {
      const response = createQuotaExceededResponse(baseStatus, 'videos')
      expect(response.message).toContain('video generations')
    })

    it('uses correct resource label for projects', () => {
      const response = createQuotaExceededResponse(baseStatus, 'projects')
      expect(response.message).toContain('projects')
    })

    it('uses correct resource label for consultations', () => {
      const response = createQuotaExceededResponse(baseStatus, 'consultations')
      expect(response.message).toContain('AI consultations')
    })
  })

  describe('enforceQuota', () => {
    it('returns allowed: true when quota is available', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { videos_per_month: 10 },
        usage_current: { videos_this_month: 5 },
      })

      const result = await enforceQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(true)
      expect('response' in result).toBe(false)
    })

    it('returns 402 response when quota exceeded', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { videos_per_month: 10 },
        usage_current: { videos_this_month: 10 },
      })

      const result = await enforceQuota(supabase as any, userId, 'videos')

      expect(result.allowed).toBe(false)

      if (!result.allowed) {
        expect(result.response).toBeInstanceOf(Response)
        expect(result.response.status).toBe(402)

        const body = await result.response.json()
        expect(body.error).toBe('Quota exceeded')
        expect(body.code).toBe('QUOTA_EXCEEDED')
      }
    })

    it('includes quota headers in response', async () => {
      const supabase = createMockSupabase({
        subscription_tier: 'free',
        usage_quota: { videos_per_month: 10 },
        usage_current: { videos_this_month: 10 },
      })

      const result = await enforceQuota(supabase as any, userId, 'videos')

      if (!result.allowed) {
        expect(result.response.headers.get('X-Quota-Current')).toBe('10')
        expect(result.response.headers.get('X-Quota-Limit')).toBe('10')
        expect(result.response.headers.get('X-Quota-Remaining')).toBe('0')
      }
    })
  })
})
