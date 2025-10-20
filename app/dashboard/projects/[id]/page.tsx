import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Film, ListVideo } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project with videos and series
  const { data: project, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      videos:videos(*),
      series:series(*)
    `
    )
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  const videoCount = project.videos?.length || 0
  const seriesCount = project.series?.length || 0

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
          <p className="text-sm md:text-base text-muted-foreground">
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
          <Button size="sm" className="bg-sage-500 hover:bg-sage-700 flex-1 sm:flex-none" asChild>
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
                  <Film className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-base md:text-lg font-semibold">No videos yet</h3>
                <p className="mb-4 text-xs md:text-sm text-muted-foreground">
                  Get started by creating your first video with AI agent assistance.
                </p>
                <Button size="sm" className="bg-sage-500 hover:bg-sage-700 w-full sm:w-auto" asChild>
                  <Link href={`/dashboard/projects/${id}/videos/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Video
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {project.videos?.slice(0, 6).map((video: any) => (
                <Link
                  key={video.id}
                  href={`/dashboard/projects/${id}/videos/${video.id}`}
                  className="rounded-lg border p-3 md:p-4 hover:border-sage-500 transition-colors cursor-pointer block"
                >
                  <h4 className="font-medium mb-1 text-sm md:text-base">{video.title}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                    {video.user_brief}
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {video.platform}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Series */}
        {seriesCount > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Series</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/projects/${id}/series`}>
                  View All
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
              {project.series?.slice(0, 4).map((series: any) => (
                <Link
                  key={series.id}
                  href={`/dashboard/projects/${id}/series/${series.id}`}
                  className="rounded-lg border p-3 md:p-4 hover:border-sage-500 transition-colors cursor-pointer block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm md:text-base">{series.name}</h4>
                    {series.genre && (
                      <Badge variant="secondary" className="text-xs">
                        {series.genre.replace('-', ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                    {series.description || 'No description'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
