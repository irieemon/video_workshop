'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PerformanceMetricsForm } from './performance-metrics-form'
import { PerformanceMetricsList } from './performance-metrics-list'
import { PerformanceStatsCards } from './performance-stats-cards'
import { PerformanceChartViews } from './performance-chart-views'
import { PerformanceChartEngagement } from './performance-chart-engagement'
import { PerformanceInsightsPanel } from './performance-insights-panel'
import { Plus, TrendingUp } from 'lucide-react'

interface PerformanceMetricsSectionProps {
  videoId: string
}

export function PerformanceMetricsSection({
  videoId,
}: PerformanceMetricsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch performance metrics
  const {
    data: metricsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['performance-metrics', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${videoId}/performance`)
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics')
      }
      return response.json()
    },
  })

  const handleSuccess = () => {
    setDialogOpen(false)
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header Card with Add Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Track how your video performs across different platforms
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metrics
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Performance Metrics</DialogTitle>
                  <DialogDescription>
                    Record performance data from TikTok or Instagram to track your
                    video's success.
                  </DialogDescription>
                </DialogHeader>
                <PerformanceMetricsForm
                  videoId={videoId}
                  onSuccess={handleSuccess}
                  onCancel={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading metrics...
        </div>
      ) : metricsData?.metrics && metricsData.metrics.length > 0 ? (
        <>
          {/* Stats Cards */}
          <PerformanceStatsCards metrics={metricsData.metrics} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChartViews metrics={metricsData.metrics} />
            <PerformanceChartEngagement metrics={metricsData.metrics} />
          </div>

          {/* AI Insights */}
          <PerformanceInsightsPanel videoId={videoId} />

          {/* Metrics List */}
          <PerformanceMetricsList
            videoId={videoId}
            metrics={metricsData.metrics}
            onDelete={refetch}
          />
        </>
      ) : (
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
      )}
    </div>
  )
}
