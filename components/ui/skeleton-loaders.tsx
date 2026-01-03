'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Shimmer, StaggerContainer, StaggerItem } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

// ==========================================
// Base Skeletons
// ==========================================

interface SkeletonProps {
  className?: string
}

/**
 * Text line skeleton with shimmer effect
 */
export function SkeletonText({ className }: SkeletonProps) {
  return (
    <Shimmer
      className={cn('h-4 rounded', className)}
      width="100%"
    />
  )
}

/**
 * Circle skeleton (avatars, icons)
 */
export function SkeletonCircle({ className }: SkeletonProps) {
  return (
    <Shimmer
      className={cn('rounded-full', className)}
      width={40}
      height={40}
    />
  )
}

/**
 * Rectangle skeleton for images/thumbnails
 */
export function SkeletonImage({ className }: SkeletonProps) {
  return (
    <Shimmer
      className={cn('rounded-lg aspect-video', className)}
      width="100%"
    />
  )
}

// ==========================================
// Composite Skeletons
// ==========================================

/**
 * Skeleton for stat cards (like dashboard metrics)
 */
export function StatCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Shimmer height={16} width={100} className="rounded" />
        <Shimmer height={16} width={16} className="rounded" />
      </CardHeader>
      <CardContent>
        <Shimmer height={28} width={60} className="rounded mb-1" />
        <Shimmer height={12} width={80} className="rounded" />
      </CardContent>
    </Card>
  )
}

/**
 * Grid of stat card skeletons
 */
export function StatCardGridSkeleton({
  count = 3,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for video cards
 */
export function VideoCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Shimmer height={20} className="rounded flex-1" />
          <Shimmer height={20} width={60} className="rounded" />
        </div>
        <div className="space-y-2 mt-2">
          <Shimmer height={16} className="rounded" />
          <Shimmer height={16} width="66%" className="rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Shimmer height={20} width={80} className="rounded" />
          <Shimmer height={20} width={60} className="rounded" />
        </div>
        <Shimmer height={12} width={100} className="rounded mt-2" />
      </CardContent>
    </Card>
  )
}

/**
 * Grid of video card skeletons with stagger animation
 */
export function VideoCardGridSkeleton({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const colsClass =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
      ? 'md:grid-cols-2 lg:grid-cols-4'
      : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <StaggerContainer className={cn('grid grid-cols-1 gap-4', colsClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StaggerItem key={i}>
          <VideoCardSkeleton />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

/**
 * Skeleton for series cards
 */
export function SeriesCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <Shimmer height={20} width="80%" className="rounded" />
        <div className="space-y-2 mt-2">
          <Shimmer height={14} className="rounded" />
          <Shimmer height={14} width="50%" className="rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shimmer height={16} width={16} className="rounded" />
            <Shimmer height={14} width={60} className="rounded" />
          </div>
          <Shimmer height={20} width={50} className="rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid of series card skeletons
 */
export function SeriesCardGridSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <StaggerContainer
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StaggerItem key={i}>
          <SeriesCardSkeleton />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

/**
 * Skeleton for list items
 */
export function ListItemSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border rounded-lg',
        className
      )}
    >
      <Shimmer height={40} width={40} className="rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer height={16} width="60%" className="rounded" />
        <Shimmer height={12} width="40%" className="rounded" />
      </div>
      <Shimmer height={32} width={80} className="rounded" />
    </div>
  )
}

/**
 * List of list item skeletons
 */
export function ListSkeleton({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <StaggerContainer className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StaggerItem key={i}>
          <ListItemSkeleton />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

/**
 * Full dashboard page skeleton
 */
export function DashboardPageSkeleton() {
  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer height={32} width={200} className="rounded" />
          <Shimmer height={16} width={300} className="rounded" />
        </div>
        <Shimmer height={40} width={120} className="rounded" />
      </div>

      {/* Stats */}
      <StatCardGridSkeleton />

      {/* Videos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer height={28} width={150} className="rounded" />
          <Shimmer height={36} width={120} className="rounded" />
        </div>
        <VideoCardGridSkeleton count={6} />
      </div>

      {/* Series Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer height={28} width={130} className="rounded" />
          <Shimmer height={36} width={120} className="rounded" />
        </div>
        <SeriesCardGridSkeleton count={4} />
      </div>
    </div>
  )
}

/**
 * Segment list skeleton
 */
export function SegmentListSkeleton({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress card skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Shimmer height={20} width={150} className="rounded" />
            <Shimmer height={20} width={60} className="rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <Shimmer height={8} className="rounded-full" />
        </CardContent>
      </Card>

      {/* Segment cards */}
      <StaggerContainer className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <StaggerItem key={i}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shimmer height={20} width={30} className="rounded" />
                      <Shimmer height={20} width={80} className="rounded" />
                    </div>
                    <Shimmer height={16} className="rounded" />
                    <Shimmer height={16} width="80%" className="rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Shimmer height={32} width={32} className="rounded" />
                    <Shimmer height={32} width={32} className="rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}
