'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MotionCard, StaggerItem } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface AnimatedVideoCardProps {
  children: ReactNode
  className?: string
  /** Whether to use the stagger animation (for lists) */
  staggered?: boolean
  /** Whether to show hover effects */
  interactive?: boolean
}

/**
 * Animated wrapper for video cards with hover effects and stagger support.
 *
 * Use `staggered` when the card is inside a StaggerContainer.
 * Use `interactive` for clickable cards with hover/tap feedback.
 */
export function AnimatedVideoCard({
  children,
  className,
  staggered = false,
  interactive = true,
}: AnimatedVideoCardProps) {
  const content = (
    <MotionCard
      className={cn(
        'h-full transition-colors',
        interactive && 'cursor-pointer',
        className
      )}
      disableHover={!interactive}
    >
      {children}
    </MotionCard>
  )

  if (staggered) {
    return <StaggerItem>{content}</StaggerItem>
  }

  return content
}

// ==========================================
// Pre-built Video Card Variants
// ==========================================

interface VideoCardData {
  id: string
  title: string
  user_brief?: string
  platform?: string
  status: string
  created_at: string
  series?: {
    id: string
    name: string
    is_system?: boolean
  } | null
}

interface VideoCardProps {
  video: VideoCardData
  /** Whether to use stagger animation */
  staggered?: boolean
  /** Render prop for action buttons overlay */
  actions?: ReactNode
  className?: string
}

/**
 * Complete animated video card with status badge and metadata.
 * Can be used standalone or in a staggered list.
 */
export function VideoCard({
  video,
  staggered = false,
  actions,
  className,
}: VideoCardProps) {
  const isStandalone = video.series?.is_system

  const cardContent = (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base">
            {video.title}
          </CardTitle>
          <Badge
            variant={
              video.status === 'published'
                ? 'default'
                : video.status === 'generated'
                ? 'secondary'
                : 'outline'
            }
          >
            {video.status}
          </Badge>
        </div>
        {video.user_brief && (
          <CardDescription className="line-clamp-3">
            {video.user_brief}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {isStandalone ? (
              <Badge variant="outline" className="text-xs">
                Standalone
              </Badge>
            ) : video.series ? (
              <Badge variant="secondary" className="text-xs">
                {video.series.name}
              </Badge>
            ) : null}
          </div>
          {video.platform && (
            <Badge variant="outline" className="text-xs capitalize">
              {video.platform}
            </Badge>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {new Date(video.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )

  const animatedCard = (
    <MotionCard className="h-full" disableHover={false}>
      {cardContent}
    </MotionCard>
  )

  if (staggered) {
    return (
      <StaggerItem className="relative group">
        {animatedCard}
        {actions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {actions}
          </div>
        )}
      </StaggerItem>
    )
  }

  return (
    <div className="relative group">
      {animatedCard}
      {actions && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {actions}
        </div>
      )}
    </div>
  )
}

// ==========================================
// Skeleton Loader
// ==========================================

interface VideoCardSkeletonProps {
  className?: string
}

/**
 * Skeleton loader for video cards, matching the layout.
 */
export function VideoCardSkeleton({ className }: VideoCardSkeletonProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-2 mt-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="mt-2 h-3 w-24 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}
