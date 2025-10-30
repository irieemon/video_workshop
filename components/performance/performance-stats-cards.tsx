'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Heart, TrendingUp, Award, ArrowUp, ArrowDown, Minus } from 'lucide-react'

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

interface PerformanceStatsCardsProps {
  metrics: PerformanceMetric[]
}

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  description?: string
}

function StatCard({ title, value, change, icon, description }: StatCardProps) {
  const getChangeIcon = () => {
    if (change === undefined || change === null) return null
    if (change > 0) return <ArrowUp className="h-3 w-3" />
    if (change < 0) return <ArrowDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getChangeColor = () => {
    if (change === undefined || change === null) return 'text-muted-foreground'
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change !== undefined && change !== null && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${getChangeColor()}`}>
            {getChangeIcon()}
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-muted-foreground">vs previous</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function PerformanceStatsCards({ metrics }: PerformanceStatsCardsProps) {
  if (metrics.length === 0) {
    return null
  }

  // Calculate aggregates
  const totalViews = metrics.reduce((sum, m) => sum + m.views, 0)
  const totalLikes = metrics.reduce((sum, m) => sum + m.likes, 0)
  const totalComments = metrics.reduce((sum, m) => sum + m.comments, 0)
  const totalShares = metrics.reduce((sum, m) => sum + m.shares, 0)

  // Average engagement rate
  const avgEngagementRate =
    totalViews > 0
      ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
      : 0

  // Best platform by views
  const platformViews: Record<string, number> = {}
  metrics.forEach((m) => {
    platformViews[m.platform] = (platformViews[m.platform] || 0) + m.views
  })
  const bestPlatform =
    Object.keys(platformViews).length > 0
      ? Object.keys(platformViews).reduce((a, b) =>
          platformViews[a] > platformViews[b] ? a : b
        )
      : null

  // Average completion rate
  const completionRates = metrics.filter((m) => m.completion_rate !== null)
  const avgCompletionRate =
    completionRates.length > 0
      ? completionRates.reduce((sum, m) => sum + (m.completion_rate || 0), 0) /
        completionRates.length
      : null

  // Calculate change for total views (compare most recent half to earlier half)
  let viewsChange: number | undefined
  if (metrics.length >= 4) {
    const sortedByDate = [...metrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
    const midpoint = Math.floor(sortedByDate.length / 2)
    const earlierHalf = sortedByDate.slice(0, midpoint)
    const recentHalf = sortedByDate.slice(midpoint)

    const earlierViews = earlierHalf.reduce((sum, m) => sum + m.views, 0)
    const recentViews = recentHalf.reduce((sum, m) => sum + m.views, 0)

    if (earlierViews > 0) {
      viewsChange = ((recentViews - earlierViews) / earlierViews) * 100
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Views"
        value={formatNumber(totalViews)}
        change={viewsChange}
        icon={<Eye className="h-4 w-4" />}
        description={`Across ${metrics.length} recording${metrics.length > 1 ? 's' : ''}`}
      />
      <StatCard
        title="Avg Engagement"
        value={`${avgEngagementRate.toFixed(2)}%`}
        icon={<Heart className="h-4 w-4" />}
        description="Likes + Comments + Shares / Views"
      />
      <StatCard
        title="Best Platform"
        value={
          bestPlatform
            ? bestPlatform === 'tiktok'
              ? 'TikTok'
              : 'Instagram'
            : 'N/A'
        }
        icon={<Award className="h-4 w-4" />}
        description={
          bestPlatform ? `${formatNumber(platformViews[bestPlatform])} views` : undefined
        }
      />
      <StatCard
        title="Avg Completion"
        value={avgCompletionRate !== null ? `${avgCompletionRate.toFixed(1)}%` : 'N/A'}
        icon={<TrendingUp className="h-4 w-4" />}
        description={
          avgCompletionRate !== null
            ? `From ${completionRates.length} recording${
                completionRates.length > 1 ? 's' : ''
              }`
            : 'No completion data yet'
        }
      />
    </div>
  )
}
