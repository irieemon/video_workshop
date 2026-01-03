'use client'

import { useRouter } from 'next/navigation'
import { Crown, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useUsage } from '@/lib/hooks/use-usage'
import { cn } from '@/lib/utils'

interface UsageIndicatorProps {
  variant?: 'compact' | 'detailed'
  className?: string
  showUpgradeButton?: boolean
}

/**
 * Compact usage indicator for sidebar/header.
 * Shows quick overview of usage status with tooltip details.
 */
export function UsageIndicator({
  variant = 'compact',
  className,
  showUpgradeButton = true
}: UsageIndicatorProps) {
  const router = useRouter()
  const { usage, isLoading, hasWarnings, hasLimitsReached } = useUsage()

  if (isLoading || !usage) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    )
  }

  const isPremium = usage.tier === 'premium'

  // Calculate overall status
  const maxPercentUsed = Math.max(
    usage.videos.percentUsed,
    usage.consultations.percentUsed,
    usage.projects.percentUsed
  )

  const statusColor = hasLimitsReached
    ? 'text-destructive'
    : hasWarnings
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-muted-foreground'

  const StatusIcon = hasLimitsReached
    ? AlertTriangle
    : hasWarnings
      ? TrendingUp
      : isPremium
        ? Crown
        : TrendingUp

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 h-8 px-2',
                hasLimitsReached && 'text-destructive hover:text-destructive',
                hasWarnings && !hasLimitsReached && 'text-yellow-600 dark:text-yellow-400',
                className
              )}
              onClick={() => router.push('/dashboard/settings')}
            >
              <StatusIcon className="h-4 w-4" />
              {isPremium ? (
                <Badge variant="secondary" className="bg-scenra-amber/20 text-scenra-amber text-xs py-0">
                  Pro
                </Badge>
              ) : (
                <span className="text-xs">
                  {Math.round(maxPercentUsed)}%
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64 p-4">
            <UsageTooltipContent usage={usage} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed variant
  return (
    <div className={cn('space-y-4 p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-4 w-4', statusColor)} />
          <span className="text-sm font-medium">
            {isPremium ? 'Premium' : 'Free'} Plan
          </span>
        </div>
        {!isPremium && showUpgradeButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/dashboard/upgrade')}
            className="h-7 text-xs"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <UsageBar
          label="Videos"
          current={usage.videos.current}
          limit={usage.videos.limit}
          percentUsed={usage.videos.percentUsed}
        />
        <UsageBar
          label="AI Consultations"
          current={usage.consultations.current}
          limit={usage.consultations.limit}
          percentUsed={usage.consultations.percentUsed}
        />
        <UsageBar
          label="Projects"
          current={usage.projects.current}
          limit={usage.projects.limit}
          percentUsed={usage.projects.percentUsed}
        />
      </div>

      {!isPremium && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/dashboard/settings')}
        >
          <span>View billing details</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function UsageBar({
  label,
  current,
  limit,
  percentUsed
}: {
  label: string
  current: number
  limit: number
  percentUsed: number
}) {
  const isAtLimit = current >= limit
  const isNearLimit = percentUsed >= 80 && !isAtLimit
  const isUnlimited = limit >= 999999

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn(isAtLimit && 'text-destructive font-medium')}>
          {label}
        </span>
        <span className="text-muted-foreground">
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <Progress
        value={isUnlimited ? 0 : Math.min(percentUsed, 100)}
        className={cn(
          'h-1.5',
          isAtLimit && '[&>div]:bg-destructive',
          isNearLimit && '[&>div]:bg-yellow-500'
        )}
      />
    </div>
  )
}

function UsageTooltipContent({ usage }: { usage: NonNullable<ReturnType<typeof useUsage>['usage']> }) {
  const isPremium = usage.tier === 'premium'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {isPremium ? 'Premium' : 'Free'} Plan
        </span>
        {isPremium && (
          <Badge className="bg-scenra-amber text-scenra-dark text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <UsageBar
          label="Videos this month"
          current={usage.videos.current}
          limit={usage.videos.limit}
          percentUsed={usage.videos.percentUsed}
        />
        <UsageBar
          label="AI Consultations"
          current={usage.consultations.current}
          limit={usage.consultations.limit}
          percentUsed={usage.consultations.percentUsed}
        />
        <UsageBar
          label="Projects"
          current={usage.projects.current}
          limit={usage.projects.limit}
          percentUsed={usage.projects.percentUsed}
        />
      </div>

      {!isPremium && (
        <p className="text-xs text-muted-foreground pt-1 border-t">
          Upgrade for unlimited access →
        </p>
      )}
    </div>
  )
}
