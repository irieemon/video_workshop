import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SeriesList } from '@/components/series'

export default async function ProjectSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Fetch series through junction table with counts
  const { data: seriesAssociations } = await supabase
    .from('project_series')
    .select(
      `
      id,
      created_at,
      series:series_id (
        *,
        episodes:series_episodes(count),
        characters:series_characters(count),
        settings:series_settings(count)
      )
    `
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Transform the data to include counts
  const series = seriesAssociations
    ?.map((assoc: any) => {
      if (!assoc.series) return null
      const s = assoc.series
      return {
        ...s,
        episode_count: s.episodes?.[0]?.count || 0,
        character_count: s.characters?.[0]?.count || 0,
        setting_count: s.settings?.[0]?.count || 0,
        episodes: undefined,
        characters: undefined,
        settings: undefined,
      }
    })
    .filter(Boolean) || []

  return (
    <div className="p-4 md:p-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 md:mb-6"
        asChild
      >
        <Link href={`/dashboard/projects/${id}`}>
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Project</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </Button>

      {/* Project Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{project.name}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {project.description || 'No description'}
        </p>
      </div>

      <SeriesList projectId={id} series={series} />
    </div>
  )
}
