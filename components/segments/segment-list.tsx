'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlayCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SegmentDetailDrawer } from './segment-detail-drawer'
import { SegmentCard, SegmentCardSkeleton, type SegmentWithStatus } from './segment-card'
import type { Database } from '@/lib/types/database.types'

type VideoSegment = Database['public']['Tables']['video_segments']['Row']
type SegmentGroup = Database['public']['Tables']['segment_groups']['Row']

interface SegmentListProps {
  episodeId: string
  seriesId: string
  refreshTrigger: number
  onBatchGenerate: () => void
}

export function SegmentList({
  episodeId,
  seriesId,
  refreshTrigger,
  onBatchGenerate
}: SegmentListProps) {
  const [segments, setSegments] = useState<SegmentWithStatus[]>([])
  const [segmentGroup, setSegmentGroup] = useState<SegmentGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<VideoSegment | null>(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)

  const loadSegments = useCallback(async () => {
    const supabase = createClient()
    try {
      setLoading(true)
      setError(null)

      // Fetch segment group
      const { data: groupData, error: groupError } = await supabase
        .from('segment_groups')
        .select('*')
        .eq('episode_id', episodeId)
        .maybeSingle()

      // Only throw if there's an actual error (not just no data)
      if (groupError && groupError.code !== 'PGRST116') {
        console.error('Segment group error:', groupError)
        throw new Error(`Failed to fetch segment group: ${groupError.message}`)
      }

      setSegmentGroup(groupData)

      // Fetch segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('video_segments')
        .select('*')
        .eq('episode_id', episodeId)
        .order('segment_number', { ascending: true })

      // Only throw if there's an actual error (not just no data)
      if (segmentsError) {
        console.error('Segments fetch error:', segmentsError)
        throw new Error(`Failed to fetch segments: ${segmentsError.message}`)
      }

      // Fetch videos to check generation status
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id, segment_id')
        .eq('episode_id', episodeId)
        .eq('is_segment', true)

      if (videosError) {
        console.error('Videos fetch error:', videosError)
        // Don't throw - just log and continue with empty video map
      }

      const videoMap = new Map(
        videosData?.map(v => [v.segment_id, v.id]) || []
      )

      const segmentsWithStatus: SegmentWithStatus[] = (segmentsData || []).map(seg => ({
        ...seg,
        hasVideo: videoMap.has(seg.id),
        videoId: videoMap.get(seg.id)
      }))

      setSegments(segmentsWithStatus)
    } catch (err) {
      console.error('Error loading segments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load segments')
    } finally {
      setLoading(false)
    }
  }, [episodeId])

  useEffect(() => {
    loadSegments()
  }, [loadSegments, refreshTrigger])

  const handleViewSegmentDetail = (segment: SegmentWithStatus) => {
    setSelectedSegment(segment)
    setDetailDrawerOpen(true)
  }

  const handleGenerateSingle = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId)
    if (segment) {
      handleViewSegmentDetail(segment)
    }
  }

  const handleViewVideo = (videoId: string) => {
    window.location.href = `/dashboard/videos/${videoId}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted animate-pulse rounded" />
                <div className="h-4 w-56 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-8 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Skeleton Segment Cards */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SegmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="py-8 md:py-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Failed to Load Segments
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 max-w-md">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSegments}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="rounded-full bg-muted p-3">
              <PlayCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">No Segments Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create segments from your episode screenplay to get started
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const completedCount = segments.filter(s => s.hasVideo).length
  const progressPercentage = (completedCount / segments.length) * 100

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      {segmentGroup && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generation Progress</CardTitle>
                <CardDescription>
                  {completedCount} of {segments.length} segments generated
                </CardDescription>
              </div>
              <Badge variant={segmentGroup.status === 'complete' ? 'default' : 'secondary'}>
                {getStatusLabel(segmentGroup.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Cards */}
      <div className="space-y-3">
        {segments.map((segment) => (
          <SegmentCard
            key={segment.id}
            segment={segment}
            onViewDetails={handleViewSegmentDetail}
            onGenerate={handleGenerateSingle}
            onViewVideo={handleViewVideo}
          />
        ))}
      </div>

      {/* Segment Detail Drawer */}
      <SegmentDetailDrawer
        segment={selectedSegment}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        seriesId={seriesId}
        episodeId={episodeId}
        onGenerate={loadSegments}
        isPremium={false} // TODO: Get from user subscription status
      />
    </div>
  )
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'generating':
      return 'Generating'
    case 'partial':
      return 'In Progress'
    case 'complete':
      return 'Complete'
    case 'error':
      return 'Error'
    default:
      return status || 'Unknown'
  }
}
