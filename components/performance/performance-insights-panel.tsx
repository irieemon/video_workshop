'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface PerformanceInsights {
  strengths: string[]
  weaknesses: string[]
  traffic_insights: string
  patterns: string
  recommendations: string[]
  next_video_suggestions: string[]
}

interface InsightsResponse {
  insights: PerformanceInsights
  generated_at: string
  cached: boolean
}

interface PerformanceInsightsPanelProps {
  videoId: string
}

export function PerformanceInsightsPanel({ videoId }: PerformanceInsightsPanelProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const {
    data: insightsData,
    isLoading,
    error,
    refetch,
  } = useQuery<InsightsResponse>({
    queryKey: ['performance-insights', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${videoId}/performance/insights`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch insights')
      }
      return response.json()
    },
    retry: 1,
  })

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      // Clear cache first
      await fetch(`/api/videos/${videoId}/performance/insights`, {
        method: 'DELETE',
      })
      // Refetch to generate new insights
      await refetch()
    } catch (error) {
      console.error('Error regenerating insights:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Performance Insights
          </CardTitle>
          <CardDescription>Analyzing your video performance...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'Failed to generate insights. Please try again later.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!insightsData) {
    return null
  }

  const { insights, generated_at, cached } = insightsData

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Performance Insights
            </CardTitle>
            <CardDescription>
              Generated {new Date(generated_at).toLocaleDateString()} at{' '}
              {new Date(generated_at).toLocaleTimeString()}
              {cached && <Badge variant="secondary" className="ml-2">Cached</Badge>}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strengths */}
        {insights.strengths.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              What's Working Well
            </h3>
            <ul className="space-y-2">
              {insights.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {insights.weaknesses.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {insights.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Traffic Insights */}
        {insights.traffic_insights && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Traffic Source Analysis
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insights.traffic_insights}
            </p>
          </div>
        )}

        {/* Patterns */}
        {insights.patterns && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Performance Patterns</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insights.patterns}
            </p>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-purple-600" />
              Actionable Recommendations
            </h3>
            <ul className="space-y-2">
              {insights.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Video Suggestions */}
        {insights.next_video_suggestions.length > 0 && (
          <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <Sparkles className="h-4 w-4" />
              Ideas for Your Next Video
            </h3>
            <ul className="space-y-2">
              {insights.next_video_suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                  <span className="text-purple-900 dark:text-purple-100">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
