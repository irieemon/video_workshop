import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ListVideo, FolderKanban, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { CreateSeriesDialog } from '@/components/series/create-series-dialog'
import { SeriesCard } from '@/components/series/series-card'

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

  // Fetch all series for the user with counts
  // DUAL-PATH QUERY: Works with Phase 1 (project-based) or Phase 2 (user-based) schema
  let data: any[] = []
  let seriesError: any = null

  // Try Phase 2 query first (direct user_id ownership)
  try {
    const { data: phase2Data, error: phase2Error } = await supabase
      .from('series')
      .select(`
        *,
        episodes(count),
        characters:series_characters(count),
        settings:series_settings(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Check Phase 2 results
    if (!phase2Error && phase2Data) {
      data = phase2Data
      console.log(`[Series Page] Phase 2 query succeeded: ${phase2Data.length} series found for user ${user.id}`)
    }

    // If Phase 2 failed OR returned empty results, try Phase 1 fallback
    const shouldTryPhase1 = phase2Error || (data.length === 0)

    if (shouldTryPhase1) {
      if (phase2Error) {
        console.warn('[Series Page] Phase 2 query error, falling back to Phase 1:', phase2Error.message)
      } else {
        console.log('[Series Page] Phase 2 returned 0 results, trying Phase 1 fallback')
      }

      // Fall back to Phase 1 query (through project relationships)
      const { data: userProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)

      const projectIds = userProjects?.map((p) => p.id) || []

      if (projectIds.length > 0) {
        const { data: phase1Data, error: phase1Error } = await supabase
          .from('series')
          .select(`
            *,
            episodes(count),
            characters:series_characters(count),
            settings:series_settings(count)
          `)
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })

        if (!phase1Error && phase1Data) {
          data = phase1Data
        } else {
          seriesError = phase1Error
        }
      }
    }
  } catch (error: any) {
    console.error('Error fetching series:', error)
    seriesError = error
  }

  if (seriesError) {
    console.error('Failed to fetch series with both methods:', seriesError)
  }

  // Transform the data to include counts in a clean format
  const series = data
    ? data.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        genre: s.genre,
        character_count: (s.characters as any)?.[0]?.count || 0,
        setting_count: (s.settings as any)?.[0]?.count || 0,
        episode_count: (s.episodes as any)?.[0]?.count || 0,
        updated_at: s.updated_at,
        project_id: s.project_id || null, // Direct FK (legacy compatibility)
      }))
    : []

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <ListVideo className="h-6 w-6 md:h-8 md:w-8 text-scenra-amber" />
            <h1 className="text-2xl md:text-3xl font-bold">All Series</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/series/concept">
                <Sparkles className="h-4 w-4 mr-2" />
                AI-Assisted
              </Link>
            </Button>
            {(projects && projects.length > 0) && (
              <CreateSeriesDialog projects={projects} />
            )}
          </div>
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
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="/dashboard/series/concept">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI-Assisted Creation
                </Link>
              </Button>
              {(projects && projects.length > 0) && (
                <CreateSeriesDialog projects={projects} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {series.map((item: any) => (
            <SeriesCard
              key={item.id}
              series={item}
              projectId={item.project_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
