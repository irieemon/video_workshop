'use client'

import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { Loader2, AlertCircle, Film } from 'lucide-react'

interface Episode {
  id: string
  series_id: string
  season_number: number
  episode_number: number
  title: string
  logline: string | null
  status: 'concept' | 'draft' | 'in-progress' | 'complete'
  created_at: string
}

interface EpisodeSelectorDropdownProps {
  seriesId: string | null
  value: string | null
  onChange: (episodeId: string | null) => void
  disabled?: boolean
}

export function EpisodeSelectorDropdown({
  seriesId,
  value,
  onChange,
  disabled = false,
}: EpisodeSelectorDropdownProps) {
  // Fetch episodes for selected series
  const { data, isLoading, error } = useQuery({
    queryKey: ['episodes', seriesId],
    queryFn: async () => {
      if (!seriesId) return { episodes: [] }
      const response = await fetch(`/api/episodes?seriesId=${seriesId}`)
      if (!response.ok) throw new Error('Failed to fetch episodes')
      return response.json() as Promise<{ episodes: Episode[] }>
    },
    enabled: !!seriesId,
  })

  const episodes = data?.episodes || []

  // Group episodes by season
  const seasonGroups = episodes.reduce((acc, episode) => {
    const season = episode.season_number
    if (!acc[season]) {
      acc[season] = []
    }
    acc[season].push(episode)
    return acc
  }, {} as Record<number, Episode[]>)

  const getStatusBadge = (status: Episode['status']) => {
    switch (status) {
      case 'complete':
        return '✅'
      case 'in-progress':
        return '🔄'
      case 'draft':
        return '📝'
      case 'concept':
        return '💡'
      default:
        return ''
    }
  }

  const handleValueChange = (newValue: string) => {
    if (newValue === 'none') {
      onChange(null)
    } else {
      onChange(newValue)
    }
  }

  if (!seriesId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Film className="h-4 w-4" />
          Episode (Optional)
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading episodes...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Film className="h-4 w-4" />
          Episode (Optional)
        </Label>
        <div className="flex items-center gap-2 text-sm text-destructive p-3 border border-destructive/50 rounded-md bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          Failed to load episodes
        </div>
      </div>
    )
  }

  if (!episodes || episodes.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Film className="h-4 w-4" />
          Episode (Optional)
        </Label>
        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
          No episodes created for this series yet. Episodes can provide additional narrative context and auto-populate characters and settings.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Film className="h-4 w-4" />
        Episode (Optional)
      </Label>

      <div className="text-xs text-muted-foreground mb-2">
        Link this video to an episode to inherit its characters, settings, and narrative context
      </div>

      <Select
        value={value || 'none'}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No episode selected">
            {value && episodes.find((e) => e.id === value) ? (
              <span className="flex items-center gap-2">
                <span>{getStatusBadge(episodes.find((e) => e.id === value)!.status)}</span>
                <span>
                  S{episodes.find((e) => e.id === value)!.season_number}E{episodes.find((e) => e.id === value)!.episode_number}: {episodes.find((e) => e.id === value)!.title}
                </span>
              </span>
            ) : (
              'No episode selected'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No episode selected</span>
          </SelectItem>

          {Object.keys(seasonGroups)
            .map(Number)
            .sort((a, b) => a - b)
            .map((season) => (
              <SelectGroup key={season}>
                <SelectLabel>Season {season}</SelectLabel>
                {seasonGroups[season].map((episode) => (
                  <SelectItem key={episode.id} value={episode.id}>
                    <div className="flex items-center gap-2">
                      <span>{getStatusBadge(episode.status)}</span>
                      <span>
                        E{episode.episode_number}: {episode.title}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
        </SelectContent>
      </Select>

      {value && (
        <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/20">
          ✨ Episode linked - characters, settings, and narrative context will be auto-populated
        </div>
      )}

      {value && episodes.find((e) => e.id === value)?.logline && (
        <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/30">
          <span className="font-medium">Episode logline:</span> {episodes.find((e) => e.id === value)!.logline}
        </div>
      )}
    </div>
  )
}
