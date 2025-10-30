'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

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

interface PerformanceChartViewsProps {
  metrics: PerformanceMetric[]
}

type PlatformFilter = 'all' | 'tiktok' | 'instagram'

export function PerformanceChartViews({ metrics }: PerformanceChartViewsProps) {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')

  const chartData = useMemo(() => {
    // Filter metrics by platform
    const filteredMetrics =
      platformFilter === 'all'
        ? metrics
        : metrics.filter((m) => m.platform === platformFilter)

    // Sort by date
    const sortedMetrics = [...filteredMetrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    // Group by date and platform for multi-line chart
    if (platformFilter === 'all') {
      const groupedByDate: Record<
        string,
        { date: string; tiktok?: number; instagram?: number }
      > = {}

      sortedMetrics.forEach((metric) => {
        const dateKey = format(new Date(metric.recorded_at), 'MMM d')
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = { date: dateKey }
        }
        groupedByDate[dateKey][metric.platform] = metric.views
      })

      return Object.values(groupedByDate)
    }

    // Single platform view
    return sortedMetrics.map((metric) => ({
      date: format(new Date(metric.recorded_at), 'MMM d, h:mm a'),
      views: metric.views,
      platform: metric.platform,
    }))
  }, [metrics, platformFilter])

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>Track how your video views grow over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No performance data to visualize yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Views Over Time</CardTitle>
            <CardDescription>Track how your video views grow over time</CardDescription>
          </div>
          <Select
            value={platformFilter}
            onValueChange={(value) => setPlatformFilter(value as PlatformFilter)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tiktok">TikTok Only</SelectItem>
              <SelectItem value="instagram">Instagram Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                return value.toString()
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => value.toLocaleString()}
            />
            <Legend />
            {platformFilter === 'all' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="tiktok"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="TikTok"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="instagram"
                  stroke="#E4405F"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Instagram"
                  connectNulls
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="views"
                stroke={platformFilter === 'tiktok' ? '#000000' : '#E4405F'}
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Views"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
