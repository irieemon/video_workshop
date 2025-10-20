import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderKanban, Film, ListVideo } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    video_count: number
    series_count: number
    updated_at: string
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="hover:border-sage-500 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <FolderKanban className="h-7 w-7 md:h-8 md:w-8 text-sage-500 mb-2" />
            <Badge variant="secondary" className="text-xs">
              {project.video_count} {project.video_count === 1 ? 'video' : 'videos'}
            </Badge>
          </div>
          <CardTitle className="text-lg md:text-xl">{project.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.5rem] text-sm">
            {project.description || 'No description'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-1">
                <Film className="h-4 w-4" />
                <span>{project.video_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <ListVideo className="h-4 w-4" />
                <span>{project.series_count}</span>
              </div>
            </div>
            <span className="text-xs">
              Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
