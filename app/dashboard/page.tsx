import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MigrationBanner } from '@/components/dashboard/migration-banner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Video, TrendingUp, ListVideo, Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard | Scenra',
  description: 'Your video production dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch recent videos (last 10)
  const { data: recentVideos } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      user_brief,
      platform,
      status,
      created_at,
      series:series_id (
        id,
        name,
        is_system
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch active series with video counts
  const { data: activeSeries } = await supabase
    .from('series')
    .select(`
      id,
      name,
      description,
      genre,
      is_system,
      created_at,
      videos:videos(count)
    `)
    .eq('user_id', user.id)
    .eq('is_system', false)
    .order('created_at', { ascending: false })

  // Calculate stats
  const totalVideos = recentVideos?.length || 0
  const totalSeries = activeSeries?.length || 0
  const videosThisMonth = recentVideos?.filter((v) => {
    const created = new Date(v.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length || 0

  // Transform series data with video counts
  const seriesWithCounts = activeSeries?.map((series: any) => ({
    ...series,
    video_count: series.videos[0]?.count || 0,
  })) || []

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Migration Banner */}
      <MigrationBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your video production overview.
          </p>
        </div>
        <Link href="/dashboard/videos/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Video
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVideos}</div>
            <p className="text-xs text-muted-foreground">
              Across all series
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Series</CardTitle>
            <ListVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSeries}</div>
            <p className="text-xs text-muted-foreground">
              {totalSeries === 0 ? 'Create your first series' : 'Creating content'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videosThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Videos created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Recent Videos</h2>
          <Button variant="outline" asChild>
            <Link href="/dashboard/videos">
              View All Videos
            </Link>
          </Button>
        </div>

        {!recentVideos || recentVideos.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No videos yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Get started by creating your first video. Our AI film crew will help you generate an optimized prompt.
                  </p>
                </div>
                <Link href="/dashboard/videos/new">
                  <Button size="lg" className="mt-4">
                    <Video className="h-5 w-5 mr-2" />
                    Create Your First Video
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentVideos.slice(0, 6).map((video) => {
              const series = video.series as any
              const isStandalone = series?.is_system

              return (
                <Link key={video.id} href={`/dashboard/videos/${video.id}/roundtable`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 text-base">
                          {video.title}
                        </CardTitle>
                        <Badge
                          variant={
                            video.status === 'published'
                              ? 'default'
                              : video.status === 'generated'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {video.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {video.user_brief}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {isStandalone ? (
                            <Badge variant="outline" className="text-xs">
                              Standalone
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {series?.name}
                            </Badge>
                          )}
                        </div>
                        {video.platform && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {video.platform}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(video.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Series */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Active Series</h2>
          <Button variant="outline" asChild>
            <Link href="/dashboard/series">
              View All Series
            </Link>
          </Button>
        </div>

        {seriesWithCounts.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ListVideo className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No series yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Create a series to organize your videos by theme, topic, or content type.
                  </p>
                </div>
                <Button size="lg" className="mt-4" asChild>
                  <Link href="/dashboard/series/new">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Series
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seriesWithCounts.slice(0, 4).map((series) => (
              <Link key={series.id} href={`/dashboard/series/${series.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-base">{series.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {series.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {series.video_count} {series.video_count === 1 ? 'video' : 'videos'}
                        </span>
                      </div>
                      {series.genre && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {series.genre}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
