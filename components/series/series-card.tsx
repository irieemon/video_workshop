'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ListVideo, Users, MapPin, Trash2 } from 'lucide-react'
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
  projectId?: string
}

const genreColors: Record<string, string> = {
  narrative: 'bg-blue-100 text-blue-800',
  'product-showcase': 'bg-purple-100 text-purple-800',
  educational: 'bg-green-100 text-green-800',
  'brand-content': 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
}

export function SeriesCard({ series, projectId }: SeriesCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent card navigation
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete series')
      }

      // Close dialog and refresh the page to update the list
      setShowDeleteDialog(false)
      router.refresh()
    } catch (error: any) {
      setDeleteError(error.message)
      setIsDeleting(false)
    }
  }

  const seriesUrl = projectId
    ? `/dashboard/projects/${projectId}/series/${series.id}`
    : `/dashboard/series/${series.id}`

  return (
    <>
      <div className="relative group">
        <Link href={seriesUrl}>
          <Card className="hover:border-scenra-amber transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <ListVideo className="h-7 w-7 md:h-8 md:w-8 text-scenra-amber mb-2" />
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
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={handleDeleteClick}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{series.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the series and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{series.character_count} character{series.character_count !== 1 ? 's' : ''}</li>
                <li>{series.setting_count} setting{series.setting_count !== 1 ? 's' : ''}</li>
                <li>All character relationships</li>
                <li>All visual cues and assets</li>
                {series.episode_count > 0 && (
                  <li>{series.episode_count} episode concept{series.episode_count !== 1 ? 's' : ''}</li>
                )}
              </ul>
            </AlertDialogDescription>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                {deleteError}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Series'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
