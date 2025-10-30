'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  Trash2,
  Clock,
} from 'lucide-react'

interface PerformanceMetric {
  id: string
  platform: 'tiktok' | 'instagram'
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  watch_time_seconds: number | null
  completion_rate: number | null
  traffic_source: 'fyp' | 'profile' | 'hashtag' | 'share' | 'other' | null
  recorded_at: string
}

interface PerformanceMetricsListProps {
  videoId: string
  metrics: PerformanceMetric[]
  onDelete?: () => void
}

export function PerformanceMetricsList({
  videoId,
  metrics,
  onDelete,
}: PerformanceMetricsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()

  const handleDelete = async (metricId: string) => {
    try {
      const response = await fetch(
        `/api/videos/${videoId}/performance/${metricId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete metric')
      }

      toast({
        title: 'Metric deleted',
        description: 'Performance metric has been removed',
      })

      onDelete?.()
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete performance metric',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
      setShowDeleteDialog(false)
    }
  }

  const calculateEngagementRate = (metric: PerformanceMetric) => {
    if (metric.views === 0) return 0
    return (
      ((metric.likes + metric.comments + metric.shares) / metric.views) *
      100
    ).toFixed(2)
  }

  const getTrafficSourceLabel = (source: string | null) => {
    if (!source) return null
    const labels: Record<string, string> = {
      fyp: 'For You Page',
      profile: 'Profile',
      hashtag: 'Hashtag',
      share: 'Shared',
      other: 'Other',
    }
    return labels[source] || source
  }

  const getPlatformColor = (platform: string) => {
    return platform === 'tiktok' ? 'bg-black text-white' : 'bg-pink-500 text-white'
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No performance data yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first performance metrics to start tracking how your video is performing.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {metrics.map((metric) => (
        <Card key={metric.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getPlatformColor(metric.platform)}>
                  {metric.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(metric.recorded_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeletingId(metric.id)
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Views */}
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Views</div>
                  <div className="text-xl font-semibold">
                    {metric.views.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Likes */}
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Likes</div>
                  <div className="text-xl font-semibold">
                    {metric.likes.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Comments</div>
                  <div className="text-xl font-semibold">
                    {metric.comments.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Shares */}
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Shares</div>
                  <div className="text-xl font-semibold">
                    {metric.shares.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              {/* Engagement Rate */}
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Engagement:</span>{' '}
                  <span className="font-semibold">
                    {calculateEngagementRate(metric)}%
                  </span>
                </span>
              </div>

              {/* Saves (if available) */}
              {metric.saves > 0 && (
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Saves:</span>{' '}
                    <span className="font-semibold">
                      {metric.saves.toLocaleString()}
                    </span>
                  </span>
                </div>
              )}

              {/* Completion Rate */}
              {metric.completion_rate !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    <span className="text-muted-foreground">Completion:</span>{' '}
                    <span className="font-semibold">
                      {metric.completion_rate.toFixed(1)}%
                    </span>
                  </span>
                </div>
              )}

              {/* Traffic Source */}
              {metric.traffic_source && (
                <Badge variant="secondary">
                  {getTrafficSourceLabel(metric.traffic_source)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Performance Metric?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this performance metric. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
