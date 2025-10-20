import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/project-card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      videos:videos(count),
      series:series(count)
    `
    )
    .order('updated_at', { ascending: false })

  // Transform the data to include counts
  const transformedProjects = projects?.map((project: any) => ({
    ...project,
    video_count: project.videos[0]?.count || 0,
    series_count: project.series[0]?.count || 0,
  })) || []

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Projects</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
            Manage your video projects and series
          </p>
        </div>
        <Button asChild size="default" className="bg-sage-500 hover:bg-sage-700 w-full sm:w-auto">
          <Link href="/dashboard/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {transformedProjects.length === 0 ? (
        <div className="flex min-h-[300px] md:min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 md:p-12 text-center">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex justify-center">
              <Plus className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg md:text-xl font-semibold">No projects yet</h3>
            <p className="mb-6 text-sm md:text-base text-muted-foreground">
              Get started by creating your first project to organize your videos and series.
            </p>
            <Button asChild className="bg-sage-500 hover:bg-sage-700 w-full sm:w-auto">
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {transformedProjects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
