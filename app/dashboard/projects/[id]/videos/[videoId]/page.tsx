import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AgentRoundtable } from '@/components/agents/agent-roundtable'
import { PromptOutput } from '@/components/videos/prompt-output'
import { SoraGenerationButton } from '@/components/videos/sora-generation-button'
import { PerformanceMetricsSection } from '@/components/performance/performance-metrics-section'
import { formatDistanceToNow } from 'date-fns'

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>
}) {
  const { id: projectId, videoId } = await params
  const supabase = await createClient()

  // Fetch video with all details including hashtags
  const { data: video, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      project:projects(*),
      series:series!videos_series_id_fkey(*),
      hashtags:hashtags(tag)
    `
    )
    .eq('id', videoId)
    .single()

  if (error || !video) {
    notFound()
  }

  // Transform hashtags from array of objects to array of strings
  const hashtagsArray = video.hashtags?.map((h: any) => h.tag) || []

  // Parse agent_discussion if it's a string (stored as JSON in database)
  let agentDiscussion = null
  try {
    const parsed = typeof video.agent_discussion === 'string'
      ? JSON.parse(video.agent_discussion)
      : video.agent_discussion

    // Validate that the parsed discussion has the required structure
    if (parsed && typeof parsed === 'object' && parsed.round1 && parsed.round2) {
      agentDiscussion = parsed
    }
  } catch (error) {
    console.error('Failed to parse agent_discussion:', error)
    // agentDiscussion remains null, component won't render
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Project</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>

          {video.optimized_prompt && (
            <SoraGenerationButton
              videoId={videoId}
              videoTitle={video.title}
              finalPrompt={video.optimized_prompt}
            />
          )}
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
              {video.series && (
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Video Generation Status</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {video.sora_generation_status}
                </Badge>
                {video.sora_generation_status === 'failed' && video.sora_error_message && (
                  <span className="text-sm text-red-600">{video.sora_error_message}</span>
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
            <PerformanceMetricsSection videoId={videoId} />
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
