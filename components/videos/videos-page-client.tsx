'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VideosFilters, type FilterState } from './videos-filters'
import { VideosViewToggle, type ViewMode } from './videos-view-toggle'
import { VideoListItem } from './video-list-item'
import { DeleteVideoDialog } from './delete-video-dialog'
import { useVideosFilters } from '@/lib/hooks/use-videos-filters'
import { StaggerContainer, StaggerItem, MotionCard } from '@/components/ui/motion'
import { useAnalytics } from '@/lib/analytics'

type Video = {
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

interface VideosPageClientProps {
  videos: Video[]
  series: { id: string; name: string }[]
}

export function VideosPageClient({ videos, series }: VideosPageClientProps) {
  const router = useRouter()
  const { videoEvents } = useAnalytics()
  const {
    filters,
    setFilters,
    viewMode,
    setViewMode,
    filteredAndSortedVideos,
    filterOptions,
  } = useVideosFilters(videos)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (id: string, title: string) => {
    setVideoToDelete({ id, title })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!videoToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/videos/${videoToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete video')
      }

      toast.success('Video deleted successfully')
      videoEvents.deleted(videoToDelete.id)
      setDeleteDialogOpen(false)
      setVideoToDelete(null)
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete video. Please try again.')
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/videos/${id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate video')
      }

      const duplicatedVideo = await response.json()
      toast.success('Video duplicated successfully')
      router.refresh()
      // Optionally navigate to the new video
      // router.push(`/dashboard/videos/${duplicatedVideo.id}/roundtable`)
    } catch (error) {
      toast.error('Failed to duplicate video. Please try again.')
      console.error('Duplicate error:', error)
    }
  }

  return (
    <>
      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <VideosFilters
                filters={filters}
                onFiltersChange={setFilters}
                series={series}
                platforms={filterOptions.platforms}
                statuses={filterOptions.statuses}
              />
            </div>
            <VideosViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
        </CardContent>
      </Card>

      {/* Videos Display */}
      {filteredAndSortedVideos.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                {videos.length === 0 ? 'No videos yet' : 'No videos match your filters'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {videos.length === 0
                  ? 'Get started by creating your first video'
                  : 'Try adjusting your filters to see more videos'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedVideos.map((video) => {
            const videoSeries = video.series
            const isStandalone = videoSeries?.is_system

            return (
              <StaggerItem key={video.id} className="relative group">
                <Link href={`/dashboard/videos/${video.id}/roundtable`}>
                  <MotionCard className="h-full">
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="line-clamp-2 text-base">
                            {video.title}
                          </CardTitle>
                          <Badge
                            variant={
                              video.status === 'published'
                                ? 'default'
                                : video.status === 'generated'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {video.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-3">
                          {video.user_brief}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {isStandalone ? (
                              <Badge variant="outline" className="text-xs">
                                Standalone
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {videoSeries?.name}
                              </Badge>
                            )}
                          </div>
                          {video.platform && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {video.platform}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {new Date(video.created_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  </MotionCard>
                </Link>

                {/* Actions Menu - Positioned in top right */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-background/95 backdrop-blur"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          handleDuplicate(video.id)
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(video.id, video.title)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedVideos.map((video) => (
            <VideoListItem
              key={video.id}
              video={video}
              onDelete={(id) => handleDelete(id, video.title)}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteVideoDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        videoTitle={videoToDelete?.title || ''}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </>
  )
}
