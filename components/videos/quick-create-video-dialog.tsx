'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Sparkles, Video, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CharacterSelector } from '@/components/videos/character-selector'
import { SettingsSelector } from '@/components/videos/settings-selector'
import { EpisodeSelectorDropdown } from '@/components/videos/episode-selector-dropdown'

interface Series {
  id: string
  name: string
  genre: string | null
  is_system: boolean
}

interface QuickCreateVideoDialogProps {
  children?: React.ReactNode
  defaultOpen?: boolean
}

export function QuickCreateVideoDialog({ children, defaultOpen = false }: QuickCreateVideoDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('')
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [selectedSettings, setSelectedSettings] = useState<string[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [brief, setBrief] = useState('')
  const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'both'>('tiktok')
  const [isCreatingSeries, setIsCreatingSeries] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch user's series
  const { data: seriesData, isLoading: isLoadingSeries } = useQuery({
    queryKey: ['series'],
    queryFn: async () => {
      const response = await fetch('/api/series')
      if (!response.ok) throw new Error('Failed to fetch series')
      return response.json() as Promise<Series[]>
    },
  })

  // Get last used series from localStorage and set as default
  useEffect(() => {
    if (seriesData && seriesData.length > 0 && !selectedSeriesId) {
      const lastUsedSeriesId = localStorage.getItem('lastUsedSeriesId')
      if (lastUsedSeriesId && seriesData.some((s) => s.id === lastUsedSeriesId)) {
        setSelectedSeriesId(lastUsedSeriesId)
      } else {
        // Default to first non-system series or standalone
        const firstSeries = seriesData.find((s) => !s.is_system) || seriesData[0]
        setSelectedSeriesId(firstSeries?.id || '')
      }
    }
  }, [seriesData, selectedSeriesId])

  // Reset character, settings, and episode selection when series changes
  useEffect(() => {
    setSelectedCharacters([])
    setSelectedSettings([])
    setSelectedEpisodeId(null)
  }, [selectedSeriesId])

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) return

    try {
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSeriesName,
          description: null,
          genre: 'other',
        }),
      })

      if (!response.ok) throw new Error('Failed to create series')

      const newSeries = await response.json()
      setSelectedSeriesId(newSeries.id)
      setNewSeriesName('')
      setIsCreatingSeries(false)

      // Refetch series to update the list
      await fetch('/api/series')
    } catch (error) {
      console.error('Error creating series:', error)
      alert('Failed to create series. Please try again.')
    }
  }

  const handleSubmit = async () => {
    if (!brief.trim() || !selectedSeriesId) return

    setIsSubmitting(true)

    try {
      // Store last used series
      localStorage.setItem('lastUsedSeriesId', selectedSeriesId)

      // Create video via API
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_id: selectedSeriesId,
          episode_id: selectedEpisodeId || undefined,
          title: brief.substring(0, 100), // Use first 100 chars as title
          user_brief: brief,
          platform,
          status: 'draft',
          selectedCharacters: selectedCharacters.length > 0 ? selectedCharacters : undefined,
          selectedSettings: selectedSettings.length > 0 ? selectedSettings : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to create video')

      const video = await response.json()

      // Navigate to video roundtable
      router.push(`/dashboard/videos/${video.id}/roundtable`)
      setOpen(false)

      // Reset form
      setBrief('')
      setPlatform('tiktok')
      setSelectedCharacters([])
      setSelectedSettings([])
      setSelectedEpisodeId(null)
    } catch (error) {
      console.error('Error creating video:', error)
      alert('Failed to create video. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedSeries = seriesData?.find((s) => s.id === selectedSeriesId)
  const isStandalone = selectedSeries?.is_system

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Video
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Create New Video
          </DialogTitle>
          <DialogDescription>
            Describe your video idea and our AI film crew will generate an optimized prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Series Selector */}
          <div className="space-y-2">
            <Label htmlFor="series">Series</Label>
            {isLoadingSeries ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading series...
              </div>
            ) : (
              <div className="space-y-2">
                {!isCreatingSeries ? (
                  <>
                    <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                      <SelectTrigger id="series">
                        <SelectValue placeholder="Select a series" />
                      </SelectTrigger>
                      <SelectContent>
                        {seriesData?.map((series) => (
                          <SelectItem key={series.id} value={series.id}>
                            {series.is_system ? '📹 ' : '🎬 '}
                            {series.name}
                            {series.genre && !series.is_system && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({series.genre})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingSeries(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Series
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Series name..."
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSeries()
                        if (e.key === 'Escape') {
                          setIsCreatingSeries(false)
                          setNewSeriesName('')
                        }
                      }}
                      autoFocus
                    />
                    <Button onClick={handleCreateSeries} size="sm">
                      Create
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingSeries(false)
                        setNewSeriesName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {selectedSeries && (
                  <p className="text-xs text-muted-foreground">
                    {isStandalone
                      ? 'This video won\'t be part of a series'
                      : `Video will be added to "${selectedSeries.name}" series`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Brief Description */}
          <div className="space-y-2">
            <Label htmlFor="brief">
              Video Brief <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="brief"
              placeholder="Example: Unboxing video for luxury skincare serum, Gen Z audience, need high engagement..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be as detailed as possible for better AI results
            </p>
          </div>

          {/* Episode Selection */}
          {!isStandalone && selectedSeriesId && (
            <EpisodeSelectorDropdown
              seriesId={selectedSeriesId}
              value={selectedEpisodeId}
              onChange={setSelectedEpisodeId}
              disabled={isSubmitting}
            />
          )}

          {/* Character Selection */}
          {!isStandalone && selectedSeriesId && (
            <CharacterSelector
              seriesId={selectedSeriesId}
              selectedCharacters={selectedCharacters}
              onSelectionChange={setSelectedCharacters}
              disabled={isSubmitting}
            />
          )}

          {/* Settings Selection */}
          {!isStandalone && selectedSeriesId && (
            <SettingsSelector
              seriesId={selectedSeriesId}
              selectedSettings={selectedSettings}
              onSelectionChange={setSelectedSettings}
              disabled={isSubmitting}
            />
          )}

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={platform === 'tiktok' ? 'default' : 'outline'}
                onClick={() => setPlatform('tiktok')}
                className="flex-1"
              >
                TikTok
              </Button>
              <Button
                type="button"
                variant={platform === 'instagram' ? 'default' : 'outline'}
                onClick={() => setPlatform('instagram')}
                className="flex-1"
              >
                Instagram
              </Button>
              <Button
                type="button"
                variant={platform === 'both' ? 'default' : 'outline'}
                onClick={() => setPlatform('both')}
                className="flex-1"
              >
                Both
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!brief.trim() || !selectedSeriesId || isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate with AI
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
