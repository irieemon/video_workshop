'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AgentRoundtable } from '@/components/agents/agent-roundtable'
import { PromptOutput } from '@/components/videos/prompt-output'
import { SoraGenerationButton } from '@/components/videos/sora-generation-button'
import { PerformanceMetricsSection } from '@/components/performance/performance-metrics-section'
import { formatDistanceToNow } from 'date-fns'

interface VideoRoundtableClientProps {
  video: any
  agentDiscussion: any
  hashtagsArray: string[]
}

export function VideoRoundtableClient({
  video,
  agentDiscussion,
  hashtagsArray,
}: VideoRoundtableClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-start AI generation if no discussion exists
  useEffect(() => {
    if (!agentDiscussion && !isGenerating) {
      handleGenerateAI()
    }
  }, [])

  const handleGenerateAI = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Use streaming API for better UX
      const response = await fetch('/api/agent/roundtable/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: video.user_brief,
          platform: video.platform,
          seriesId: video.series_id,
          projectId: video.series_id, // Using series_id as projectId for compatibility
          selectedCharacters: video.series_characters_used || undefined,
          selectedSettings: video.series_settings_used || undefined,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to generate AI content')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Process streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      let discussion: any = null
      let optimizedPrompt = ''
      let detailedBreakdown: any = null
      let characterCount = 0
      let hashtags: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const event = JSON.parse(line)

            // Extract data from streaming events
            switch (event.type) {
              case 'message_complete':
                if (!discussion) {
                  discussion = { round1: [], round2: [] }
                }
                const round = event.data.isRound2 ? 'round2' : 'round1'
                discussion[round].push({
                  agent: event.data.agent,
                  response: event.data.conversationalResponse,
                  isChallenge: event.data.isChallenge,
                  respondingTo: event.data.respondingTo,
                  buildingOn: event.data.buildingOn,
                })
                break

              case 'synthesis_complete':
                optimizedPrompt = event.data.optimizedPrompt || ''
                characterCount = event.data.characterCount || 0
                break

              case 'breakdown_complete':
                detailedBreakdown = event.data.breakdown
                hashtags = event.data.breakdown?.hashtags || []
                break
            }
          } catch (e) {
            console.error('Error parsing streaming event:', e)
          }
        }
      }

      // Update the video with ALL AI-generated content including hashtags
      const updateResponse = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_discussion: JSON.stringify(discussion),
          optimized_prompt: optimizedPrompt,
          detailed_breakdown: JSON.stringify(detailedBreakdown),
          character_count: characterCount,
          hashtags: hashtags,
          status: 'generated',
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || 'Failed to update video')
      }

      // Refresh page to show results
      router.refresh()
    } catch (err: any) {
      console.error('Error generating AI content:', err)
      setError(err.message || 'Failed to generate AI content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/videos">
              <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Videos</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>

          <div className="flex gap-2">
            {!agentDiscussion && !isGenerating && error && (
              <Button
                onClick={handleGenerateAI}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Retry AI Generation
              </Button>
            )}
            {video.optimized_prompt && (
              <SoraGenerationButton
                videoId={video.id}
                videoTitle={video.title}
                finalPrompt={video.optimized_prompt}
              />
            )}
          </div>
        </div>
      </div>

      <div className="container py-4 md:py-8 px-4 md:px-8">
        {/* Video Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col gap-3 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">{video.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {video.platform}
              </Badge>
              {video.series && !video.series.is_system && (
                <Badge variant="secondary" className="text-xs">
                  Series: {video.series.name}
                </Badge>
              )}
              <span className="text-xs md:text-sm text-scenra-gray">
                Created {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* User Brief */}
          <div className="bg-scenra-dark-panel rounded-lg p-3 md:p-4 border border-scenra-amber/20">
            <h3 className="font-semibold text-sm mb-2 text-scenra-amber">Original Brief</h3>
            <p className="text-sm text-scenra-light leading-relaxed">
              {video.user_brief}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && !agentDiscussion && (
          <div className="mb-6 md:mb-8">
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">AI Film Crew Collaborating</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Our AI agents are analyzing your brief and creating an optimized prompt for Sora...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && !agentDiscussion && (
          <div className="mb-6 md:mb-8">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Generation Failed</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agent Discussion */}
        {agentDiscussion && (
          <div className="mb-6 md:mb-8">
            <AgentRoundtable discussion={agentDiscussion} />
          </div>
        )}

        {/* Sora Generated Video */}
        {video.sora_video_url && video.sora_generation_status === 'completed' && (
          <div className="mb-6 md:mb-8">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h3 className="font-semibold text-lg mb-4">Generated Video</h3>
              <div className="aspect-[9/16] max-w-md mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  src={video.sora_video_url}
                  controls
                  className="w-full h-full"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
                <span>Completed {formatDistanceToNow(new Date(video.sora_completed_at), { addSuffix: true })}</span>
                {video.sora_generation_cost && (
                  <span>Cost: ${video.sora_generation_cost.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sora Generation Status */}
        {video.sora_generation_status && video.sora_generation_status !== 'completed' && (
          <div className="mb-6 md:mb-8">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Video Generation Status</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {video.sora_generation_status}
                </Badge>
                {video.sora_generation_status === 'failed' && video.sora_error_message && (
                  <span className="text-sm text-red-600 dark:text-red-400">{video.sora_error_message}</span>
                )}
              </div>
              {(video.sora_generation_status === 'queued' || video.sora_generation_status === 'in_progress') && (
                <p className="text-sm text-muted-foreground mt-2">
                  Your video is being generated. This may take a few minutes. Refresh the page to check status.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {video.sora_video_url && video.sora_generation_status === 'completed' && (
          <div className="mb-6 md:mb-8">
            <PerformanceMetricsSection videoId={video.id} />
          </div>
        )}

        {/* Prompt Output */}
        {video.optimized_prompt && video.detailed_breakdown && (
          <PromptOutput
            detailedBreakdown={video.detailed_breakdown}
            optimizedPrompt={video.optimized_prompt}
            characterCount={video.character_count}
            hashtags={hashtagsArray}
          />
        )}
      </div>
    </div>
  )
}
