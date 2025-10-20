import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListVideo, Users, MapPin, Palette } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SeriesCardProps {
  series: {
    id: string
    name: string
    description: string | null
    genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
    episode_count: number
    character_count: number
    setting_count: number
    updated_at: string
  }
  projectId: string
}

const genreColors: Record<string, string> = {
  narrative: 'bg-blue-100 text-blue-800',
  'product-showcase': 'bg-purple-100 text-purple-800',
  educational: 'bg-green-100 text-green-800',
  'brand-content': 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
}

export function SeriesCard({ series, projectId }: SeriesCardProps) {
  return (
    <Link href={`/dashboard/projects/${projectId}/series/${series.id}`}>
      <Card className="hover:border-sage-500 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <ListVideo className="h-7 w-7 md:h-8 md:w-8 text-sage-500 mb-2" />
            <div className="flex gap-2">
              {series.genre && (
                <Badge variant="secondary" className={`text-xs ${genreColors[series.genre]}`}>
                  {series.genre.replace('-', ' ')}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {series.episode_count} {series.episode_count === 1 ? 'episode' : 'episodes'}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg md:text-xl">{series.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.5rem] text-sm">
            {series.description || 'No description'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-1" title="Episodes">
                <ListVideo className="h-4 w-4" />
                <span>{series.episode_count}</span>
              </div>
              <div className="flex items-center gap-1" title="Characters">
                <Users className="h-4 w-4" />
                <span>{series.character_count}</span>
              </div>
              <div className="flex items-center gap-1" title="Settings">
                <MapPin className="h-4 w-4" />
                <span>{series.setting_count}</span>
              </div>
            </div>
            <span className="text-xs">
              Updated {formatDistanceToNow(new Date(series.updated_at), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
