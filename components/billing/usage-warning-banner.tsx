'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useUsage } from '@/lib/hooks/use-usage'
import { cn } from '@/lib/utils'

interface UsageWarningBannerProps {
  className?: string
  dismissible?: boolean
}

/**
 * Warning banner that appears when user is approaching usage limits.
 * Shows at the top of the dashboard/pages.
 */
export function UsageWarningBanner({
  className,
  dismissible = true
}: UsageWarningBannerProps) {
  const router = useRouter()
  const { usage, hasWarnings, hasLimitsReached, getWarningMessage, getResetDateString } = useUsage()
  const [isDismissed, setIsDismissed] = useState(false)

  // Reset dismissed state when limits change
  useEffect(() => {
    if (hasLimitsReached) {
      setIsDismissed(false)
    }
  }, [hasLimitsReached])

  // Don't show if no warnings or dismissed (unless at limit)
  if (!hasWarnings && !hasLimitsReached) return null
  if (isDismissed && !hasLimitsReached) return null

  const message = getWarningMessage()
  const isAtLimit = hasLimitsReached
  // Show upgrade for free users or if tier is not explicitly 'premium'
  const canUpgrade = !usage?.tier || usage.tier === 'free' || usage.tier !== 'premium'
  const resetDateStr = getResetDateString()

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2',
        isAtLimit
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
        className
      )}
    >
      <div className="flex-shrink-0">
        {isAtLimit ? (
          <AlertTriangle className="h-5 w-5" />
        ) : (
          <TrendingUp className="h-5 w-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>

        {/* Show reset date when at limit */}
        {isAtLimit && resetDateStr && (
          <p className="text-xs mt-1 opacity-80">
            Limits reset {resetDateStr}.{' '}
            {canUpgrade && (
              <button
                onClick={() => router.push('/dashboard/upgrade')}
                className="underline hover:no-underline font-medium"
              >
                Upgrade for more
              </button>
            )}
          </p>
        )}

        {/* Show mini progress bars for resources near limit */}
        {usage && (hasWarnings || hasLimitsReached) && (
          <div className="flex gap-4 mt-2">
            {(usage.videos.nearLimit || usage.videos.atLimit) && (
              <div className="flex items-center gap-2 text-xs">
                <span>Videos:</span>
                <Progress
                  value={usage.videos.percentUsed}
                  className={cn(
                    'w-16 h-1.5',
                    usage.videos.atLimit && '[&>div]:bg-destructive'
                  )}
                />
                <span>{usage.videos.current}/{usage.videos.limit}</span>
              </div>
            )}
            {(usage.consultations.nearLimit || usage.consultations.atLimit) && (
              <div className="flex items-center gap-2 text-xs">
                <span>AI:</span>
                <Progress
                  value={usage.consultations.percentUsed}
                  className={cn(
                    'w-16 h-1.5',
                    usage.consultations.atLimit && '[&>div]:bg-destructive'
                  )}
                />
                <span>{usage.consultations.current}/{usage.consultations.limit}</span>
              </div>
            )}
            {(usage.projects.nearLimit || usage.projects.atLimit) && (
              <div className="flex items-center gap-2 text-xs">
                <span>Projects:</span>
                <Progress
                  value={usage.projects.percentUsed}
                  className={cn(
                    'w-16 h-1.5',
                    usage.projects.atLimit && '[&>div]:bg-destructive'
                  )}
                />
                <span>{usage.projects.current}/{usage.projects.limit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {canUpgrade && (
          <Button
            size="sm"
            onClick={() => router.push('/dashboard/upgrade')}
            className={cn(
              isAtLimit
                ? 'bg-destructive hover:bg-destructive/90 text-white'
                : 'bg-scenra-amber text-scenra-dark hover:bg-yellow-500'
            )}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}

        {dismissible && !isAtLimit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
