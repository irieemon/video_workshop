import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListVideo, FolderKanban, Plus } from 'lucide-react'
import Link from 'next/link'
import { CreateSeriesDialog } from '@/components/series/create-series-dialog'

export default async function AllSeriesPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all user's projects for the create dialog
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  // Fetch all series for the user (now queries by user_id directly)
  // Use explicit FK to avoid ambiguity with projects.default_series_id
  const { data, error: seriesError } = await supabase
    .from('series')
    .select('*, project:projects!series_project_id_fkey(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (seriesError) {
    console.error('Error fetching series:', seriesError)
  }

  // Fetch counts separately for each series
  let allSeries = null
  if (data) {
    const seriesWithCounts = await Promise.all(
      data.map(async (s: any) => {
        const [{ count: characterCount }, { count: settingCount }] =
          await Promise.all([
            supabase
              .from('series_characters')
              .select('*', { count: 'exact', head: true })
              .eq('series_id', s.id),
            supabase
              .from('series_settings')
              .select('*', { count: 'exact', head: true })
              .eq('series_id', s.id),
          ])

        return {
          ...s,
          character_count: characterCount || 0,
          setting_count: settingCount || 0,
        }
      })
    )
    allSeries = seriesWithCounts
  }

  const series = allSeries || []

  const genreColors: Record<string, string> = {
    narrative: 'bg-blue-100 text-blue-800',
    'product-showcase': 'bg-purple-100 text-purple-800',
    educational: 'bg-green-100 text-green-800',
    'brand-content': 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <ListVideo className="h-6 w-6 md:h-8 md:w-8 text-sage-500" />
            <h1 className="text-2xl md:text-3xl font-bold">All Series</h1>
          </div>
          {(projects && projects.length > 0) && (
            <CreateSeriesDialog projects={projects} />
          )}
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage video series continuity across all your projects
        </p>
      </div>

      {/* Series List */}
      {series.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 md:p-12 text-center">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex justify-center">
              <ListVideo className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg md:text-xl font-semibold">
              No series yet
            </h3>
            <p className="mb-4 text-sm md:text-base text-muted-foreground">
              Create your first series to maintain character and setting
              continuity across video episodes.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {(projects && projects.length > 0) && (
                <CreateSeriesDialog projects={projects} />
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="/dashboard">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Go to Projects
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {series.map((item: any) => {
            // Determine the link based on project association
            const linkHref = item.project
              ? `/dashboard/projects/${item.project.id}/series/${item.id}`
              : `/dashboard/series/${item.id}`

            return (
              <Link
                key={item.id}
                href={linkHref}
                className="rounded-lg border p-4 hover:border-sage-500 transition-colors cursor-pointer block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base md:text-lg mb-1">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <FolderKanban className="h-3 w-3" />
                      <span>{item.project?.name || 'Standalone Series'}</span>
                    </div>
                  </div>
                  {item.genre && (
                    <Badge
                      variant="secondary"
                      className={`${genreColors[item.genre]} text-xs`}
                    >
                      {item.genre.replace('-', ' ')}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {item.description || 'No description'}
                </p>

                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{item.character_count} characters</span>
                  <span>•</span>
                  <span>{item.setting_count} settings</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
