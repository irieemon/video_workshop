import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AgentRoundtable } from '@/components/agents/agent-roundtable'
import { PromptOutput } from '@/components/videos/prompt-output'
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
      series:series(*),
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
              <span className="text-xs md:text-sm text-muted-foreground">
                Created {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* User Brief */}
          <div className="bg-muted/50 rounded-lg p-3 md:p-4 border">
            <h3 className="font-semibold text-sm mb-2">Original Brief</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {video.user_brief}
            </p>
          </div>
        </div>

        {/* Agent Discussion */}
        {video.agent_discussion && (
          <div className="mb-6 md:mb-8">
            <AgentRoundtable discussion={video.agent_discussion} />
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
