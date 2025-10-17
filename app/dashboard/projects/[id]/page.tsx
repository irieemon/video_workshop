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
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-6"
        asChild
      >
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>

      {/* Project Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
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
          <p className="text-muted-foreground">
            {project.description || 'No description'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Edit Project
          </Button>
          <Button size="sm" className="bg-sage-500 hover:bg-sage-700" asChild>
            <Link href={`/dashboard/projects/${id}/videos/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Video
            </Link>
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="space-y-6">
        {/* Recent Videos */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Videos</h2>
          {videoCount === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
              <div className="mx-auto max-w-md">
                <div className="mb-4 flex justify-center">
                  <Film className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No videos yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Get started by creating your first video with AI agent assistance.
                </p>
                <Button className="bg-sage-500 hover:bg-sage-700" asChild>
                  <Link href={`/dashboard/projects/${id}/videos/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Video
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.videos?.slice(0, 6).map((video: any) => (
                <Link
                  key={video.id}
                  href={`/dashboard/projects/${id}/videos/${video.id}`}
                  className="rounded-lg border p-4 hover:border-sage-500 transition-colors cursor-pointer block"
                >
                  <h4 className="font-medium mb-1">{video.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
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
            <h2 className="text-xl font-semibold mb-4">Series</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {project.series?.map((series: any) => (
                <div
                  key={series.id}
                  className="rounded-lg border p-4 hover:border-sage-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{series.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      Template
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {series.description || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
