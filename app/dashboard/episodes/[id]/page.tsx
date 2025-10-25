import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Plus, FileText, Video } from 'lucide-react'
import Link from 'next/link'

interface Video {
  id: string
  title: string
  optimized_prompt: string
  status: string
  character_count: number
  sora_video_url: string | null
  platform: string | null
  created_at: string
  updated_at: string
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: episodeId } = await params
  const supabase = await createClient()

  // Fetch episode with series info
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select(`
      *,
      series:series_id (
        id,
        name
      )
    `)
    .eq('id', episodeId)
    .single()

  if (episodeError || !episode) {
    notFound()
  }

  // Fetch videos for this episode
  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      optimized_prompt,
      status,
      character_count,
      sora_video_url,
      platform,
      created_at,
      updated_at
    `)
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false })

  const episodeVideos = (videos || []) as Video[]

  return (
    <div className="p-4 md:p-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 md:mb-6"
        asChild
      >
        <Link href={`/dashboard/series/${episode.series.id}`}>
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Series</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </Button>

      {/* Episode Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="border-scenra-amber/40 text-scenra-amber">
            {episode.series.name}
          </Badge>
          <Badge variant="outline">
            S{episode.season_number}E{episode.episode_number}
          </Badge>
          <Badge className="bg-scenra-amber text-scenra-dark">
            {episode.status}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-scenra-light">{episode.title}</h1>
        {episode.logline && (
          <p className="text-lg text-scenra-gray italic">{episode.logline}</p>
        )}
      </div>

      {/* Episode Details */}
      {episode.screenplay_text && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-scenra-amber" />
              Screenplay
            </CardTitle>
            <CardDescription>
              {Math.round(episode.screenplay_text.length / 1000)}k characters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-md bg-scenra-dark-panel p-4">
              <pre className="whitespace-pre-wrap text-sm text-scenra-gray font-mono">
                {episode.screenplay_text}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-scenra-light flex items-center gap-2">
            <Video className="h-6 w-6 text-scenra-amber" />
            Videos ({episodeVideos.length})
          </h2>
          <Button asChild className="bg-scenra-amber hover:bg-scenra-dark text-scenra-dark hover:text-scenra-light">
            <Link href={`/dashboard/projects/new?episodeId=${episodeId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Video
            </Link>
          </Button>
        </div>

        {episodeVideos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="h-12 w-12 text-scenra-gray mx-auto mb-4 opacity-50" />
              <p className="text-scenra-gray mb-4">No videos created for this episode yet</p>
              <Button asChild className="bg-scenra-amber hover:bg-scenra-dark text-scenra-dark hover:text-scenra-light">
                <Link href={`/dashboard/projects/new?episodeId=${episodeId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Video
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {episodeVideos.map((video) => (
              <Card key={video.id} className="hover:border-scenra-amber transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base line-clamp-2 text-scenra-light">
                      {video.title}
                    </CardTitle>
                    <Badge className={
                      video.status === 'published'
                        ? 'bg-green-600'
                        : video.status === 'generated'
                        ? 'bg-scenra-amber text-scenra-dark'
                        : 'bg-gray-600'
                    }>
                      {video.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-scenra-gray">
                    {video.optimized_prompt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-scenra-gray mb-3">
                    <span>{video.character_count} chars</span>
                    {video.platform && (
                      <Badge variant="outline" className="text-xs">
                        {video.platform}
                      </Badge>
                    )}
                  </div>
                  {video.sora_video_url ? (
                    <Button asChild size="sm" className="w-full bg-scenra-amber hover:bg-scenra-dark text-scenra-dark hover:text-scenra-light">
                      <Link href={`/dashboard/projects/videos/${video.id}`}>
                        <Play className="mr-2 h-3 w-3" />
                        View Video
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="w-full border-scenra-amber/40 text-scenra-light hover:bg-scenra-amber/10">
                      <Link href={`/dashboard/projects/videos/${video.id}`}>
                        View Details
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
