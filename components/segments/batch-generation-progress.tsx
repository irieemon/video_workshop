'use client'

import { useEffect, useState, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pause,
  RotateCcw,
  PartyPopper
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type GenerationStatus = 'idle' | 'pending' | 'generating' | 'complete' | 'error' | 'paused'

export interface GenerationProgress {
  current: number
  total: number
  status: GenerationStatus
  currentSegmentName?: string
  estimatedTimeRemaining?: number // in seconds
  errorMessage?: string
}

interface BatchGenerationProgressProps {
  progress: GenerationProgress
  onRetry?: () => void
  onCancel?: () => void
  showEstimatedTime?: boolean
  compact?: boolean
  className?: string
}

/**
 * Reusable progress indicator for batch operations.
 * Shows current/total progress, status, and estimated time remaining.
 */
export function BatchGenerationProgress({
  progress,
  onRetry,
  onCancel,
  showEstimatedTime = true,
  compact = false,
  className
}: BatchGenerationProgressProps) {
  const [displayedProgress, setDisplayedProgress] = useState(0)

  // Smooth progress animation
  useEffect(() => {
    const targetProgress = progress.total > 0
      ? (progress.current / progress.total) * 100
      : 0

    // Animate to target
    const step = (targetProgress - displayedProgress) / 10
    if (Math.abs(targetProgress - displayedProgress) > 0.5) {
      const timer = setTimeout(() => {
        setDisplayedProgress(prev => prev + step)
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setDisplayedProgress(targetProgress)
    }
  }, [progress.current, progress.total, displayedProgress])

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
  }

  const getStatusConfig = () => {
    switch (progress.status) {
      case 'complete':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
          label: 'Complete',
          badgeVariant: 'default' as const,
          progressClass: 'bg-green-600'
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-600" />,
          label: 'Error',
          badgeVariant: 'destructive' as const,
          progressClass: 'bg-red-600'
        }
      case 'generating':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
          label: 'Generating',
          badgeVariant: 'secondary' as const,
          progressClass: ''
        }
      case 'paused':
        return {
          icon: <Pause className="h-4 w-4 text-yellow-600" />,
          label: 'Paused',
          badgeVariant: 'secondary' as const,
          progressClass: 'bg-yellow-600'
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
          label: 'Pending',
          badgeVariant: 'outline' as const,
          progressClass: ''
        }
      default:
        return {
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
          label: 'Idle',
          badgeVariant: 'outline' as const,
          progressClass: ''
        }
    }
  }

  const config = getStatusConfig()

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {config.icon}
        <Progress
          value={displayedProgress}
          className="h-2 flex-1"
        />
        <Badge variant={config.badgeVariant} className="text-xs">
          {progress.current}/{progress.total}
        </Badge>
      </div>
    )
  }

  return (
    <div className={cn(
      "space-y-4 p-4 rounded-lg border",
      progress.status === 'error' ? 'border-red-200 bg-red-50/50' :
      progress.status === 'complete' ? 'border-green-200 bg-green-50/50' :
      'bg-muted/50',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-medium">
            {progress.status === 'complete'
              ? 'Generation Complete!'
              : progress.status === 'error'
              ? 'Generation Failed'
              : progress.status === 'generating'
              ? 'Generating Segments...'
              : config.label
            }
          </span>
          {progress.status === 'complete' && (
            <PartyPopper className="h-4 w-4 text-yellow-500" />
          )}
        </div>
        <Badge variant={config.badgeVariant}>
          {progress.current} / {progress.total}
        </Badge>
      </div>

      {/* Progress Bar */}
      <Progress value={displayedProgress} className="h-2" />

      {/* Details */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-muted-foreground">
          {progress.status === 'complete' ? (
            `Successfully generated ${progress.total} video segments`
          ) : progress.status === 'error' ? (
            <span className="text-red-600">
              {progress.errorMessage || `Failed at segment ${progress.current + 1}`}
            </span>
          ) : progress.currentSegmentName ? (
            <span>
              Processing: <span className="font-medium text-foreground">{progress.currentSegmentName}</span>
            </span>
          ) : (
            `Processing segment ${progress.current + 1} of ${progress.total}...`
          )}
        </div>

        {/* Time remaining */}
        {showEstimatedTime &&
         progress.status === 'generating' &&
         progress.estimatedTimeRemaining &&
         progress.estimatedTimeRemaining > 0 && (
          <span className="text-muted-foreground text-xs">
            ~{formatTimeRemaining(progress.estimatedTimeRemaining)} remaining
          </span>
        )}
      </div>

      {/* Actions */}
      {(progress.status === 'error' && onRetry) ||
       (progress.status === 'generating' && onCancel) ? (
        <div className="flex gap-2 pt-2 border-t">
          {progress.status === 'error' && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Failed
            </Button>
          )}
          {progress.status === 'generating' && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Skeleton loading state for BatchGenerationProgress
 */
export function BatchGenerationProgressSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-2 flex-1" />
        <Skeleton className="h-5 w-12" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}

/**
 * Hook for managing batch generation progress with polling
 */
export function useBatchGenerationProgress(
  segmentGroupId: string | null,
  isActive: boolean,
  pollInterval = 2000
) {
  const [progress, setProgress] = useState<GenerationProgress>({
    current: 0,
    total: 0,
    status: 'idle'
  })

  const fetchProgress = useCallback(async () => {
    if (!segmentGroupId) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data, error } = await supabase
        .from('segment_groups')
        .select('status, completed_segments, total_segments')
        .eq('id', segmentGroupId)
        .single()

      if (error) throw error

      if (data) {
        setProgress({
          current: data.completed_segments || 0,
          total: data.total_segments || 0,
          status: data.status as GenerationStatus,
          estimatedTimeRemaining: data.total_segments && data.completed_segments
            ? (data.total_segments - data.completed_segments) * 45 // ~45s per segment
            : undefined
        })
      }
    } catch (err) {
      console.error('Error fetching progress:', err)
    }
  }, [segmentGroupId])

  useEffect(() => {
    if (!segmentGroupId || !isActive) return

    // Initial fetch
    fetchProgress()

    // Set up polling
    const interval = setInterval(fetchProgress, pollInterval)

    return () => clearInterval(interval)
  }, [segmentGroupId, isActive, pollInterval, fetchProgress])

  // Stop polling when complete or error
  useEffect(() => {
    if (progress.status === 'complete' || progress.status === 'error') {
      // Could emit an event or call a callback here
    }
  }, [progress.status])

  return { progress, refetch: fetchProgress }
}
