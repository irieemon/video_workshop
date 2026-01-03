'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlayCircle, Eye, CheckCircle2, Clock, Info, RotateCcw, AlertTriangle } from 'lucide-react'
import type { Database } from '@/lib/types/database.types'

type VideoSegment = Database['public']['Tables']['video_segments']['Row']

export interface SegmentWithStatus extends VideoSegment {
  hasVideo: boolean
  videoId?: string
  isGenerating?: boolean
  hasError?: boolean
}

interface SegmentCardProps {
  segment: SegmentWithStatus
  onViewDetails: (segment: SegmentWithStatus) => void
  onGenerate: (segmentId: string) => void
  onViewVideo: (videoId: string) => void
  onRetry?: (segmentId: string) => void
  compact?: boolean
}

/**
 * Reusable card component for displaying video segment information.
 * Handles different states: pending, generating, complete, error.
 */
export function SegmentCard({
  segment,
  onViewDetails,
  onGenerate,
  onViewVideo,
  onRetry,
  compact = false
}: SegmentCardProps) {
  const formatDuration = (duration: number) => {
    return Number(duration.toFixed(2))
  }

  const getStatusIcon = () => {
    if (segment.hasError) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (segment.hasVideo) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }
    if (segment.isGenerating) {
      return (
        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  const getCardClassName = () => {
    if (segment.hasError) return 'border-red-200 bg-red-50/50'
    if (segment.hasVideo) return 'border-green-200'
    if (segment.isGenerating) return 'border-primary/50 animate-pulse'
    return ''
  }

  return (
    <Card className={`transition-all ${getCardClassName()}`}>
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono shrink-0">
                #{segment.segment_number}
              </Badge>
              {getStatusIcon()}
              {segment.hasError && (
                <Badge variant="destructive" className="text-xs">
                  Failed
                </Badge>
              )}
              {segment.isGenerating && (
                <Badge variant="secondary" className="text-xs">
                  Generating...
                </Badge>
              )}
            </div>
            <CardTitle className="mt-2 text-base md:text-lg line-clamp-2">
              {segment.narrative_beat}
            </CardTitle>
            {!compact && segment.narrative_transition && (
              <CardDescription className="mt-1 line-clamp-1">
                Transition: {segment.narrative_transition}
              </CardDescription>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(segment)}
              className="hidden sm:inline-flex"
            >
              <Info className="h-4 w-4 mr-2" />
              Details
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onViewDetails(segment)}
              className="sm:hidden"
            >
              <Info className="h-4 w-4" />
            </Button>

            {segment.hasError && onRetry ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(segment.id)}
                className="text-red-600 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Retry</span>
              </Button>
            ) : segment.hasVideo ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewVideo(segment.videoId!)}
              >
                <Eye className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View</span>
              </Button>
            ) : !segment.isGenerating ? (
              <Button
                size="sm"
                onClick={() => onGenerate(segment.id)}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Generate</span>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      {!compact && (
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            {/* Dialogue */}
            {(segment.dialogue_lines as any)?.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Dialogue:</span>
                <div className="mt-1 space-y-1">
                  {(segment.dialogue_lines as any).slice(0, 2).map((line: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{line.character}:</span>{' '}
                      <span className="text-muted-foreground line-clamp-1">
                        {line.lines.join(' ')}
                      </span>
                    </div>
                  ))}
                  {(segment.dialogue_lines as any).length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{(segment.dialogue_lines as any).length - 2} more lines
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Beats */}
            {segment.action_beats && segment.action_beats.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Action:</span>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {segment.action_beats.slice(0, 2).map((action: string, idx: number) => (
                    <li key={idx} className="text-muted-foreground line-clamp-1">{action}</li>
                  ))}
                  {segment.action_beats.length > 2 && (
                    <li className="text-xs text-muted-foreground list-none ml-4">
                      +{segment.action_beats.length - 2} more actions
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Duration & Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t text-xs sm:text-sm">
              <span className="text-muted-foreground">
                Duration: <span className="font-medium text-foreground">
                  {formatDuration(segment.estimated_duration)}s
                </span>
              </span>
              {segment.characters_in_segment && segment.characters_in_segment.length > 0 && (
                <span className="text-muted-foreground">
                  Characters: <span className="font-medium text-foreground">
                    {segment.characters_in_segment.length}
                  </span>
                </span>
              )}
              {segment.visual_continuity_notes && (
                <Badge variant="outline" className="text-xs">
                  Has continuity notes
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Skeleton loading state for SegmentCard
 */
export function SegmentCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            {!compact && <Skeleton className="h-4 w-1/2" />}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-4 pt-2 border-t">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
