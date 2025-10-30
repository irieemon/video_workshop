import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

interface VideoData {
  title: string
  optimized_prompt: string
  sora_duration?: number
  hashtags?: string[]
}

export interface PerformanceInsights {
  strengths: string[]
  weaknesses: string[]
  traffic_insights: string
  patterns: string
  recommendations: string[]
  next_video_suggestions: string[]
}

interface AnalyzerResponse {
  insights: PerformanceInsights
  generated_at: string
}

/**
 * Analyzes video performance metrics using AI
 */
export async function analyzePerformance(
  videoData: VideoData,
  metrics: PerformanceMetric[]
): Promise<AnalyzerResponse> {
  if (metrics.length === 0) {
    throw new Error('No performance metrics to analyze')
  }

  // Calculate aggregates for context
  const totalViews = metrics.reduce((sum, m) => sum + m.views, 0)
  const totalLikes = metrics.reduce((sum, m) => sum + m.likes, 0)
  const totalComments = metrics.reduce((sum, m) => sum + m.comments, 0)
  const totalShares = metrics.reduce((sum, m) => sum + m.shares, 0)
  const avgEngagementRate = totalViews > 0
    ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
    : 0

  // Sort metrics by date
  const sortedMetrics = [...metrics].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )

  // Build detailed metrics history
  const metricsHistory = sortedMetrics.map((m) => {
    const engagementRate = m.views > 0
      ? ((m.likes + m.comments + m.shares) / m.views) * 100
      : 0

    return `
  Date: ${new Date(m.recorded_at).toLocaleDateString()}
  Platform: ${m.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
  Views: ${m.views.toLocaleString()}
  Likes: ${m.likes.toLocaleString()} (${engagementRate.toFixed(2)}% engagement)
  Comments: ${m.comments.toLocaleString()}
  Shares: ${m.shares.toLocaleString()}
  Saves: ${m.saves.toLocaleString()}${
    m.completion_rate !== null ? `
  Completion Rate: ${m.completion_rate.toFixed(1)}%` : ''
  }${
    m.traffic_source ? `
  Traffic Source: ${m.traffic_source}` : ''
  }`
  }).join('\n---')

  const analysisPrompt = `You are a social media video performance analyst with expertise in TikTok and Instagram algorithms. Analyze the following video performance data and provide actionable insights.

Video Information:
- Title: ${videoData.title}
- Optimized Sora Prompt: ${videoData.optimized_prompt}${
  videoData.sora_duration ? `
- Duration: ${videoData.sora_duration}s` : ''
}${
  videoData.hashtags && videoData.hashtags.length > 0 ? `
- Hashtags: ${videoData.hashtags.join(', ')}` : ''
}

Performance Summary:
- Total Views: ${totalViews.toLocaleString()}
- Total Engagement: ${(totalLikes + totalComments + totalShares).toLocaleString()}
- Average Engagement Rate: ${avgEngagementRate.toFixed(2)}%
- Number of Recordings: ${metrics.length}

Detailed Performance History:
${metricsHistory}

Analyze this data and provide insights in the following areas:

1. **Strengths**: What elements of this video are driving high performance? Consider the content, hashtags, timing, and platforms.

2. **Weaknesses**: What could be improved? Identify specific areas where performance could be better.

3. **Traffic Insights**: Analyze the traffic sources. Which sources are working best and why? What does this tell us about how the video is being discovered?

4. **Patterns**: What patterns emerge from the performance data over time? Are views growing or declining? How does engagement vary across platforms?

5. **Recommendations**: Provide 3-5 specific, actionable recommendations to improve this video's performance.

6. **Next Video Suggestions**: Based on this performance data, what should the creator focus on for their next video? Be specific about content, style, hashtags, platform choice, etc.

Format your response as valid JSON with the following structure:
{
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "weaknesses": ["specific weakness 1", "specific weakness 2", ...],
  "traffic_insights": "detailed analysis of traffic sources and discovery patterns",
  "patterns": "analysis of performance trends over time",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", ...],
  "next_video_suggestions": ["specific suggestion 1", "specific suggestion 2", ...]
}

Be specific, data-driven, and actionable in your analysis. Focus on insights that can directly inform content strategy.`

  try {
    // Use GPT-4 for structured JSON output (gpt-5-chat-latest doesn't support response_format)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media video performance analyst specializing in TikTok and Instagram. You provide data-driven, actionable insights to help creators improve their video performance. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const responseContent = completion.choices[0].message.content
    if (!responseContent) {
      throw new Error('No response from AI')
    }

    const insights: PerformanceInsights = JSON.parse(responseContent)

    // Validate response structure
    if (
      !insights.strengths ||
      !insights.weaknesses ||
      !insights.traffic_insights ||
      !insights.patterns ||
      !insights.recommendations ||
      !insights.next_video_suggestions
    ) {
      throw new Error('Invalid insights structure returned from AI')
    }

    return {
      insights,
      generated_at: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error('Error analyzing performance:', error)

    // Provide fallback insights if AI fails
    if (error.message?.includes('API') || error.message?.includes('OpenAI')) {
      throw new Error('AI service temporarily unavailable. Please try again later.')
    }

    throw error
  }
}

/**
 * Generates a cache key for insights
 */
export function getInsightsCacheKey(videoId: string): string {
  return `performance-insights:${videoId}`
}

/**
 * Checks if insights should be regenerated (older than 24 hours)
 */
export function shouldRegenerateInsights(generatedAt: string): boolean {
  const generated = new Date(generatedAt)
  const now = new Date()
  const hoursSinceGenerated = (now.getTime() - generated.getTime()) / (1000 * 60 * 60)

  return hoursSinceGenerated >= 24
}
