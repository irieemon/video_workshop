/**
 * Usage Enforcement Utilities
 *
 * Provides server-side quota checking and usage tracking for subscription-based limits.
 * Integrates with Supabase profile data and database functions.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { PRICING_TIERS, TIER_LIMITS } from './config'

export type ResourceType = 'videos' | 'projects' | 'consultations'

export interface UsageStatus {
  allowed: boolean
  current: number
  limit: number
  remaining: number
  percentUsed: number
  tier: string
  nearLimit: boolean // 80% or more used
  atLimit: boolean
  upgradeRequired: boolean
}

export interface QuotaCheckResult {
  allowed: boolean
  status: UsageStatus
  error?: string
}

/**
 * Check if user has quota remaining for a specific resource
 */
export async function checkQuota(
  supabase: SupabaseClient,
  userId: string,
  resource: ResourceType
): Promise<QuotaCheckResult> {
  try {
    // Get user profile with quota info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, usage_quota, usage_current')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        allowed: false,
        error: 'Failed to fetch user profile',
        status: createEmptyStatus()
      }
    }

    const tier = profile.subscription_tier || 'free'
    const quota = profile.usage_quota || TIER_LIMITS.free
    const current = profile.usage_current || { projects: 0, videos_this_month: 0, consultations_this_month: 0 }

    // Map resource type to quota/current fields
    let currentValue: number
    let limitValue: number

    switch (resource) {
      case 'videos':
        currentValue = current.videos_this_month || 0
        limitValue = quota.videos_per_month || TIER_LIMITS.free.videos_per_month
        break
      case 'projects':
        currentValue = current.projects || 0
        limitValue = quota.projects || TIER_LIMITS.free.projects
        break
      case 'consultations':
        currentValue = current.consultations_this_month || 0
        limitValue = quota.consultations_per_month || TIER_LIMITS.free.consultations_per_month
        break
      default:
        return {
          allowed: false,
          error: 'Invalid resource type',
          status: createEmptyStatus()
        }
    }

    const remaining = Math.max(0, limitValue - currentValue)
    const percentUsed = limitValue > 0 ? (currentValue / limitValue) * 100 : 0
    const nearLimit = percentUsed >= 80
    const atLimit = currentValue >= limitValue
    const upgradeRequired = atLimit && tier === 'free'

    const status: UsageStatus = {
      allowed: currentValue < limitValue,
      current: currentValue,
      limit: limitValue,
      remaining,
      percentUsed,
      tier,
      nearLimit,
      atLimit,
      upgradeRequired
    }

    return {
      allowed: status.allowed,
      status
    }
  } catch (error: any) {
    console.error('Error checking quota:', error)
    return {
      allowed: false,
      error: error.message || 'Quota check failed',
      status: createEmptyStatus()
    }
  }
}

/**
 * Increment usage counter after a successful operation
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  resource: ResourceType
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('usage_current')
      .eq('id', userId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    const current = profile?.usage_current || {
      projects: 0,
      videos_this_month: 0,
      consultations_this_month: 0
    }

    // Update the appropriate counter
    let updateField: string
    let newValue: number

    switch (resource) {
      case 'videos':
        updateField = 'videos_this_month'
        newValue = (current.videos_this_month || 0) + 1
        break
      case 'projects':
        updateField = 'projects'
        newValue = (current.projects || 0) + 1
        break
      case 'consultations':
        updateField = 'consultations_this_month'
        newValue = (current.consultations_this_month || 0) + 1
        break
      default:
        return { success: false, error: 'Invalid resource type' }
    }

    const updatedCurrent = {
      ...current,
      [updateField]: newValue
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ usage_current: updatedCurrent })
      .eq('id', userId)

    if (updateError) {
      throw updateError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error incrementing usage:', error)
    return { success: false, error: error.message || 'Failed to increment usage' }
  }
}

/**
 * Decrement usage counter (for rollbacks, deletions, etc.)
 */
export async function decrementUsage(
  supabase: SupabaseClient,
  userId: string,
  resource: ResourceType
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('usage_current')
      .eq('id', userId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    const current = profile?.usage_current || {
      projects: 0,
      videos_this_month: 0,
      consultations_this_month: 0
    }

    let updateField: string
    let currentFieldValue: number

    switch (resource) {
      case 'videos':
        updateField = 'videos_this_month'
        currentFieldValue = current.videos_this_month || 0
        break
      case 'projects':
        updateField = 'projects'
        currentFieldValue = current.projects || 0
        break
      case 'consultations':
        updateField = 'consultations_this_month'
        currentFieldValue = current.consultations_this_month || 0
        break
      default:
        return { success: false, error: 'Invalid resource type' }
    }

    const newValue = Math.max(0, currentFieldValue - 1)

    const updatedCurrent = {
      ...current,
      [updateField]: newValue
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ usage_current: updatedCurrent })
      .eq('id', userId)

    if (updateError) {
      throw updateError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error decrementing usage:', error)
    return { success: false, error: error.message || 'Failed to decrement usage' }
  }
}

/**
 * Get full usage status for all resources
 */
export async function getFullUsageStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  videos: UsageStatus
  projects: UsageStatus
  consultations: UsageStatus
}> {
  const [videos, projects, consultations] = await Promise.all([
    checkQuota(supabase, userId, 'videos'),
    checkQuota(supabase, userId, 'projects'),
    checkQuota(supabase, userId, 'consultations')
  ])

  return {
    videos: videos.status,
    projects: projects.status,
    consultations: consultations.status
  }
}

/**
 * Create a quota exceeded error response
 */
export function createQuotaExceededResponse(status: UsageStatus, resource: ResourceType) {
  const resourceLabels: Record<ResourceType, string> = {
    videos: 'video generations',
    projects: 'projects',
    consultations: 'AI consultations'
  }

  return {
    error: 'Quota exceeded',
    code: 'QUOTA_EXCEEDED',
    message: `You have reached your monthly limit of ${status.limit} ${resourceLabels[resource]}. ${
      status.tier === 'free'
        ? 'Upgrade to Premium for unlimited access.'
        : 'Your quota will reset at the start of next month.'
    }`,
    usage: {
      current: status.current,
      limit: status.limit,
      remaining: status.remaining,
      percentUsed: status.percentUsed
    },
    upgradeRequired: status.upgradeRequired,
    upgradeUrl: '/dashboard/upgrade'
  }
}

/**
 * Create empty status (for error cases)
 */
function createEmptyStatus(): UsageStatus {
  return {
    allowed: false,
    current: 0,
    limit: 0,
    remaining: 0,
    percentUsed: 0,
    tier: 'free',
    nearLimit: false,
    atLimit: true,
    upgradeRequired: true
  }
}

/**
 * Middleware helper to check quota and return appropriate response
 * Use this in API routes for consistent quota enforcement
 */
export async function enforceQuota(
  supabase: SupabaseClient,
  userId: string,
  resource: ResourceType
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const result = await checkQuota(supabase, userId, resource)

  if (!result.allowed) {
    const errorResponse = createQuotaExceededResponse(result.status, resource)
    return {
      allowed: false,
      response: new Response(JSON.stringify(errorResponse), {
        status: 402, // Payment Required - appropriate for quota exceeded
        headers: {
          'Content-Type': 'application/json',
          'X-Quota-Current': String(result.status.current),
          'X-Quota-Limit': String(result.status.limit),
          'X-Quota-Remaining': String(result.status.remaining)
        }
      })
    }
  }

  return { allowed: true }
}
