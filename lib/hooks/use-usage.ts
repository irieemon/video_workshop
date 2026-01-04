'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'

export interface UsageData {
  videos: {
    current: number
    limit: number
    remaining: number
    percentUsed: number
    nearLimit: boolean
    atLimit: boolean
  }
  consultations: {
    current: number
    limit: number
    remaining: number
    percentUsed: number
    nearLimit: boolean
    atLimit: boolean
  }
  projects: {
    current: number
    limit: number
    remaining: number
    percentUsed: number
    nearLimit: boolean
    atLimit: boolean
  }
  tier: string
  upgradeRequired: boolean
  nextResetDate: Date | null
}

interface UsageResponse {
  tier: string
  nextResetDate?: string
  usage: {
    quota: {
      projects: number
      videos_per_month: number
      consultations_per_month: number
    }
    current: {
      projects: number
      videos_this_month: number
      consultations_this_month: number
    }
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch usage')
  return res.json()
}

function calculateUsage(current: number, limit: number) {
  const remaining = Math.max(0, limit - current)
  const percentUsed = limit > 0 ? (current / limit) * 100 : 0
  return {
    current,
    limit,
    remaining,
    percentUsed,
    nearLimit: percentUsed >= 80 && percentUsed < 100,
    atLimit: current >= limit
  }
}

/**
 * Hook for accessing user's usage data and quota status
 *
 * Features:
 * - Auto-refresh on window focus
 * - Real-time limit warnings
 * - Upgrade prompts when at limit
 */
export function useUsage() {
  const { data, error, isLoading, mutate } = useSWR<UsageResponse>(
    '/api/stripe/subscription',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  const usage: UsageData | null = data ? {
    videos: calculateUsage(
      data.usage?.current?.videos_this_month ?? 0,
      data.usage?.quota?.videos_per_month ?? 10
    ),
    consultations: calculateUsage(
      data.usage?.current?.consultations_this_month ?? 0,
      data.usage?.quota?.consultations_per_month ?? 10
    ),
    projects: calculateUsage(
      data.usage?.current?.projects ?? 0,
      data.usage?.quota?.projects ?? 3
    ),
    tier: data.tier || 'free',
    upgradeRequired: data.tier === 'free',
    nextResetDate: data.nextResetDate ? new Date(data.nextResetDate) : null,
  } : null

  // Determine if any resource is near or at limit
  const hasWarnings = usage ? (
    usage.videos.nearLimit ||
    usage.consultations.nearLimit ||
    usage.projects.nearLimit
  ) : false

  const hasLimitsReached = usage ? (
    usage.videos.atLimit ||
    usage.consultations.atLimit ||
    usage.projects.atLimit
  ) : false

  // Format reset date for display
  const getResetDateString = useCallback((): string | null => {
    if (!usage?.nextResetDate) return null
    const resetDate = usage.nextResetDate
    const now = new Date()
    const diffTime = resetDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays <= 7) return `in ${diffDays} days`

    return resetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }, [usage?.nextResetDate])

  // Get the most critical warning message
  const getWarningMessage = useCallback((): string | null => {
    if (!usage) return null

    if (usage.videos.atLimit) {
      return `You've reached your monthly video limit (${usage.videos.limit}). Upgrade for more videos.`
    }
    if (usage.consultations.atLimit) {
      return `You've reached your AI consultation limit (${usage.consultations.limit}). Upgrade for unlimited consultations.`
    }
    if (usage.projects.atLimit) {
      return `You've reached your project limit (${usage.projects.limit}). Upgrade for unlimited projects.`
    }
    if (usage.videos.nearLimit) {
      return `You're approaching your video limit (${usage.videos.current}/${usage.videos.limit}).`
    }
    if (usage.consultations.nearLimit) {
      return `You're approaching your AI consultation limit (${usage.consultations.current}/${usage.consultations.limit}).`
    }
    if (usage.projects.nearLimit) {
      return `You're approaching your project limit (${usage.projects.current}/${usage.projects.limit}).`
    }

    return null
  }, [usage])

  return {
    usage,
    isLoading,
    error,
    hasWarnings,
    hasLimitsReached,
    getWarningMessage,
    getResetDateString,
    refresh: mutate,
  }
}

/**
 * Hook for checking if a specific action can be performed
 */
export function useCanPerformAction(resource: 'videos' | 'consultations' | 'projects') {
  const { usage, isLoading } = useUsage()

  return {
    canPerform: usage ? !usage[resource].atLimit : true,
    remaining: usage ? usage[resource].remaining : 0,
    percentUsed: usage ? usage[resource].percentUsed : 0,
    isLoading
  }
}
