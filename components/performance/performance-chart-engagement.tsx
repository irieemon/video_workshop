'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

interface PerformanceChartEngagementProps {
  metrics: PerformanceMetric[]
}

export function PerformanceChartEngagement({ metrics }: PerformanceChartEngagementProps) {
  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement Breakdown</CardTitle>
          <CardDescription>Compare likes, comments, shares, and saves</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No engagement data to visualize yet
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by date and prepare data
  const chartData = [...metrics]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((metric) => ({
      date: format(new Date(metric.recorded_at), 'MMM d'),
      platform: metric.platform === 'tiktok' ? 'TikTok' : 'Instagram',
      likes: metric.likes,
      comments: metric.comments,
      shares: metric.shares,
      saves: metric.saves,
      engagementRate: metric.views > 0
        ? (((metric.likes + metric.comments + metric.shares) / metric.views) * 100).toFixed(2)
        : '0.00',
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Breakdown</CardTitle>
        <CardDescription>
          Compare likes, comments, shares, and saves across recordings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
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
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `${label} (${payload[0].payload.platform})`
                }
                return label
              }}
            />
            <Legend />
            <Bar dataKey="likes" fill="#ef4444" name="Likes" />
            <Bar dataKey="comments" fill="#22c55e" name="Comments" />
            <Bar dataKey="shares" fill="#8b5cf6" name="Shares" />
            <Bar dataKey="saves" fill="#f59e0b" name="Saves" />
          </BarChart>
        </ResponsiveContainer>

        {/* Engagement Rate Summary */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Engagement Rate Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {chartData.map((data, index) => (
              <div key={index} className="text-sm">
                <span className="text-muted-foreground">{data.date}:</span>{' '}
                <span className="font-semibold">{data.engagementRate}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
