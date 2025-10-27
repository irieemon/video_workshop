'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Link2, ListVideo, Loader2 } from 'lucide-react'

interface Series {
  id: string
  name: string
  description: string | null
  genre: string | null
  created_at: string
}

interface AssociateSeriesDialogProps {
  projectId: string
}

export function AssociateSeriesDialog({ projectId }: AssociateSeriesDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [availableSeries, setAvailableSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [associating, setAssociating] = useState<string | null>(null)

  const fetchAvailableSeries = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all user's series
      const allSeriesResponse = await fetch('/api/series')
      const allSeries = await allSeriesResponse.json()

      // Fetch series already associated with this project
      const associatedResponse = await fetch(`/api/projects/${projectId}/series`)
      const associatedSeries = await associatedResponse.json()

      // Filter out already associated series
      const associatedIds = new Set(associatedSeries.map((s: Series) => s.id))
      const available = allSeries.filter((s: Series) => !associatedIds.has(s.id))

      setAvailableSeries(available)
    } catch (error) {
      console.error('Failed to fetch series:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      fetchAvailableSeries()
    }
  }, [open, fetchAvailableSeries])

  const handleAssociate = async (seriesId: string) => {
    setAssociating(seriesId)
    try {
      const response = await fetch(`/api/projects/${projectId}/series/associate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_id: seriesId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to associate series')
      }

      // Success! Close dialog and refresh
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to associate series:', error)
      alert(error.message || 'Failed to associate series')
    } finally {
      setAssociating(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          Link Existing Series
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Link Existing Series</DialogTitle>
          <DialogDescription>
            Associate an existing series with this project
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-scenra-amber mr-2" />
            <span className="text-sm text-scenra-light">Loading available series...</span>
          </div>
        ) : availableSeries.length === 0 ? (
          <div className="text-center py-8">
            <ListVideo className="h-12 w-12 mx-auto text-scenra-gray mb-3" />
            <p className="text-sm text-scenra-light">
              No available series to link.
              <br />
              All your series are already associated with this project.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {availableSeries.map((series) => (
                <div
                  key={series.id}
                  className="flex items-start justify-between p-4 border border-scenra-border-subtle rounded-lg hover:border-scenra-amber/40 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-scenra-light truncate">
                        {series.name}
                      </h4>
                      {series.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {series.genre.replace('-', ' ')}
                        </Badge>
                      )}
                    </div>
                    {series.description && (
                      <p className="text-xs text-scenra-gray line-clamp-2">
                        {series.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssociate(series.id)}
                    disabled={associating === series.id}
                    className="scenra-button-primary shrink-0"
                  >
                    {associating === series.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-3 w-3 mr-1" />
                        Link
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
