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
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your video projects and series
          </p>
        </div>
        <Button asChild size="lg" className="bg-sage-500 hover:bg-sage-700">
          <Link href="/dashboard/projects/new">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Link>
        </Button>
      </div>

      {transformedProjects.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex justify-center">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">No projects yet</h3>
            <p className="mb-6 text-muted-foreground">
              Get started by creating your first project to organize your videos and series.
            </p>
            <Button asChild className="bg-sage-500 hover:bg-sage-700">
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {transformedProjects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
