import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Film, ListVideo } from 'lucide-react'
import Link from 'next/link'
import { VideoCard } from '@/components/projects/video-card'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project with videos (ordered by most recent first)
  const { data: project, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      videos:videos(*)
    `
    )
    .eq('id', id)
    .single()

  // Sort videos by created_at descending (most recent first)
  if (project?.videos) {
    project.videos.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  if (error || !project) {
    notFound()
  }

  // Fetch associated series through junction table
  const { data: seriesAssociations } = await supabase
    .from('project_series')
    .select(`
      id,
      created_at,
      series:series_id (
        id,
        name,
        description,
        genre,
        created_at,
        updated_at
      )
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Flatten series data
  const series = seriesAssociations?.map((assoc: any) => assoc.series).filter(Boolean) || []

  // Fetch episodes for associated series
  const seriesIds = series.map((s: any) => s.id)
  const { data: episodes } = seriesIds.length > 0
    ? await supabase
        .from('episodes')
        .select('id, series_id, season_number, episode_number, title, status')
        .in('series_id', seriesIds)
        .order('season_number', { ascending: true })
        .order('episode_number', { ascending: true })
    : { data: [] }

  // Group episodes by series
  const episodesBySeries = episodes?.reduce((acc: any, ep: any) => {
    if (!acc[ep.series_id]) acc[ep.series_id] = []
    acc[ep.series_id].push(ep)
    return acc
  }, {}) || {}

  const videoCount = project.videos?.length || 0
  const seriesCount = series.length

  return (
    <div className="p-4 md:p-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 md:mb-6"
        asChild
      >
        <Link href="/dashboard">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Projects</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </Button>

      {/* Project Header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold">{project.name}</h1>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                <Film className="mr-1 h-3 w-3" />
                {videoCount} {videoCount === 1 ? 'video' : 'videos'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <ListVideo className="mr-1 h-3 w-3" />
                {seriesCount} {seriesCount === 1 ? 'series' : 'series'}
              </Badge>
            </div>
          </div>
          <p className="text-sm md:text-base text-scenra-gray">
            {project.description || 'No description'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
            <Link href={`/dashboard/projects/${id}/series`}>
              <ListVideo className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Manage Series</span>
              <span className="sm:hidden">Series</span>
            </Link>
          </Button>
          <Button size="sm" className="scenra-button-primary flex-1 sm:flex-none" asChild>
            <Link href={`/dashboard/projects/${id}/videos/new`}>
              <Plus className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Video</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="space-y-4 md:space-y-6">
        {/* Recent Videos */}
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Recent Videos</h2>
          {videoCount === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 md:p-12 text-center">
              <div className="mx-auto max-w-md">
                <div className="mb-4 flex justify-center">
                  <Film className="h-8 w-8 md:h-10 md:w-10 text-scenra-gray" />
                </div>
                <h3 className="mb-2 text-base md:text-lg font-semibold">No videos yet</h3>
                <p className="mb-4 text-xs md:text-sm text-scenra-light">
                  Get started by creating your first video with AI agent assistance.
                </p>
                <Button size="sm" className="scenra-button-primary w-full sm:w-auto" asChild>
                  <Link href={`/dashboard/projects/${id}/videos/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Video
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {project.videos?.map((video: any) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  projectId={id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Series & Episodes */}
        {seriesCount > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Series & Episodes</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/series`}>
                  Manage All Series
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
              {series.slice(0, 4).map((seriesItem: any) => {
                const seriesEpisodes = episodesBySeries[seriesItem.id] || []
                const episodeCount = seriesEpisodes.length

                return (
                  <div
                    key={seriesItem.id}
                    className="rounded-lg border p-3 md:p-4 hover:border-scenra-amber transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm md:text-base">{seriesItem.name}</h4>
                      {seriesItem.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {seriesItem.genre.replace('-', ' ')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-scenra-gray line-clamp-2 mb-3">
                      {seriesItem.description || 'No description'}
                    </p>

                    {/* Episodes summary */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-scenra-gray">
                        {episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/${id}/series/${seriesItem.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>

                    {/* Show recent episodes if available */}
                    {seriesEpisodes.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {seriesEpisodes.slice(0, 3).map((ep: any) => (
                          <div
                            key={ep.id}
                            className="text-xs text-scenra-gray flex items-center justify-between"
                          >
                            <span>
                              S{ep.season_number}E{ep.episode_number}: {ep.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {ep.status}
                            </Badge>
                          </div>
                        ))}
                        {seriesEpisodes.length > 3 && (
                          <div className="text-xs text-scenra-gray">
                            +{seriesEpisodes.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
