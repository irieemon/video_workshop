import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ListVideo, Sparkles } from 'lucide-react'
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

  // Fetch all series for the user with counts
  const { data, error: seriesError } = await supabase
    .from('series')
    .select(`
      *,
      episodes(count),
      characters:series_characters(count),
      settings:series_settings(count)
    `)
    .eq('user_id', user.id)
    .eq('is_system', false)
    .order('created_at', { ascending: false })

  if (seriesError) {
    console.error('Error fetching series:', seriesError)
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
            <CreateSeriesDialog />
          </div>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage video series with consistent characters and settings
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
              <CreateSeriesDialog />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {series.map((item: any) => (
            <SeriesCard
              key={item.id}
              series={item}
            />
          ))}
        </div>
      )}
    </div>
  )
}
