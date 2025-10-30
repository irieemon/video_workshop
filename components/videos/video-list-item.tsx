'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

interface VideoListItemProps {
  video: {
    id: string
    title: string
    user_brief: string
    platform: string
    status: string
    created_at: string
    series?: {
      id: string
      name: string
      is_system: boolean
    } | null
  }
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function VideoListItem({
  video,
  onDelete,
  onDuplicate,
}: VideoListItemProps) {
  const series = video.series
  const isStandalone = series?.is_system

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
      {/* Title and Brief */}
      <Link
        href={`/dashboard/videos/${video.id}/roundtable`}
        className="flex-1 min-w-0"
      >
        <div className="space-y-1">
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:underline">
            {video.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {video.user_brief}
          </p>
        </div>
      </Link>

      {/* Series Badge */}
      <div className="flex-shrink-0 w-32">
        {isStandalone ? (
          <Badge variant="outline" className="text-xs">
            Standalone
          </Badge>
        ) : series ? (
          <Badge variant="secondary" className="text-xs">
            {series.name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No Series</span>
        )}
      </div>

      {/* Platform Badge */}
      <div className="flex-shrink-0 w-24">
        {video.platform ? (
          <Badge variant="outline" className="text-xs capitalize">
            {video.platform}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0 w-24">
        <Badge
          variant={
            video.status === 'published'
              ? 'default'
              : video.status === 'generated'
              ? 'secondary'
              : 'outline'
          }
          className="text-xs"
        >
          {video.status}
        </Badge>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 w-32 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
      </div>

      {/* Actions Menu */}
      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                onDuplicate(video.id)
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                onDelete(video.id)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
