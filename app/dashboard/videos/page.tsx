import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Video, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'
import { QuickCreateVideoDialog } from '@/components/videos/quick-create-video-dialog'
import { VideosPageClient } from '@/components/videos/videos-page-client'

export const metadata = {
  title: 'Videos | Scenra',
  description: 'View and manage all your videos',
}

export default async function VideosPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all videos for the user
  const { data: videos, error: videosError } = await supabase
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

  if (videosError) {
    console.error('Error fetching videos:', videosError)
  }

  // Fetch series for filtering
  const { data: series } = await supabase
    .from('series')
    .select('id, name, is_system')
    .eq('user_id', user.id)
    .eq('is_system', false)
    .order('name')

  const videoCount = videos?.length || 0
  const seriesCount = series?.length || 0

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">
            View and manage all your videos across series
          </p>
        </div>
        <Link href="/dashboard/videos/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Video
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoCount}</div>
            <p className="text-xs text-muted-foreground">
              Across {seriesCount} series
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Series</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seriesCount}</div>
            <p className="text-xs text-muted-foreground">
              {seriesCount === 0 ? 'Create your first series' : 'Creating content'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos?.filter((v) => {
                const created = new Date(v.created_at)
                const now = new Date()
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Videos created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Videos List with Filters */}
      {!videos || videos.length === 0 ? (
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
              <QuickCreateVideoDialog>
                <Button size="lg" className="mt-4">
                  <Video className="h-5 w-5 mr-2" />
                  Create Your First Video
                </Button>
              </QuickCreateVideoDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <VideosPageClient videos={videos} series={series || []} />
      )}
    </div>
  )
}
