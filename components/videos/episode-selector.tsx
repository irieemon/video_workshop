'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Sparkles } from 'lucide-react'
import type { Episode } from '@/lib/types/database.types'

export interface EpisodeData {
  episode: {
    id: string
    title: string
    logline: string | null
    synopsis: string | null
    screenplay_text: string | null
    structured_screenplay: any | null
    season_number: number
    episode_number: number
    status: string
  }
  series: {
    id: string
    name: string
  }
  characters: any[]
  settings: any[]
  suggestedCharacters: string[]
  suggestedSettings: string[]
  brief: string  // Episode synopsis/logline to use as brief
  hasScreenplay: boolean  // Whether screenplay data exists
  sceneCount: number  // Number of scenes in structured screenplay
}

interface EpisodeSelectorProps {
  projectId: string
  seriesId: string | null
  selectedEpisodeId: string | null
  onEpisodeSelect: (episodeId: string | null) => void
  onEpisodeDataLoaded?: (data: EpisodeData | null) => void
  disabled?: boolean
}

export function EpisodeSelector({
  projectId,
  seriesId,
  selectedEpisodeId,
  onEpisodeSelect,
  onEpisodeDataLoaded,
  disabled = false,
}: EpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  // Fetch episodes when seriesId changes
  useEffect(() => {
    if (!seriesId) {
      setEpisodes([])
      onEpisodeSelect(null)
      return
    }

    const fetchEpisodes = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/episodes?seriesId=${seriesId}`)
        const data = await response.json()
        setEpisodes(data.episodes || [])
      } catch (err) {
        console.error('Failed to fetch episodes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEpisodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId])

  // Reset when series changes
  useEffect(() => {
    onEpisodeSelect(null)
    if (onEpisodeDataLoaded) {
      onEpisodeDataLoaded(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId])

  // Generate a detailed, comprehensive brief from episode data
  const generateDetailedBrief = (data: any): string => {
    const { episode, series, characters, settings } = data

    // Build a natural, detailed brief that a human would write
    const parts: string[] = []

    // Start with series context
    parts.push(`Create a video for "${series.name}" - Season ${episode.season_number}, Episode ${episode.episode_number}: "${episode.title}".`)

    // Add logline/synopsis
    if (episode.logline) {
      parts.push(`\n\n${episode.logline}`)
    }
    if (episode.synopsis && episode.synopsis !== episode.logline) {
      parts.push(`\n\n${episode.synopsis}`)
    }

    // Add character context
    if (characters && characters.length > 0) {
      parts.push('\n\nCharacters involved:')
      characters.forEach((char: any) => {
        const charDesc = char.description || 'No description available'
        const role = char.role ? ` (${char.role})` : ''
        parts.push(`\n- ${char.name}${role}: ${charDesc}`)
      })
    }

    // Add setting/location context
    if (settings && settings.length > 0) {
      parts.push('\n\nKey locations and settings:')
      settings.forEach((setting: any) => {
        const settingDesc = setting.description || 'No description available'
        const envType = setting.environment_type ? ` [${setting.environment_type}]` : ''
        const timeOfDay = setting.time_of_day ? `, ${setting.time_of_day}` : ''
        const atmosphere = setting.atmosphere ? `, ${setting.atmosphere} atmosphere` : ''
        parts.push(`\n- ${setting.name}${envType}: ${settingDesc}${timeOfDay}${atmosphere}`)
      })
    }

    // Add a helpful prompt for the AI
    parts.push('\n\nPlease create an optimized video prompt that captures the essence of this episode scene.')

    return parts.join('')
  }

  // Auto-load episode data when episode is selected
  const handleEpisodeChange = async (episodeId: string | null) => {
    onEpisodeSelect(episodeId)

    if (!episodeId) {
      if (onEpisodeDataLoaded) {
        onEpisodeDataLoaded(null)
      }
      return
    }

    setLoadingData(true)
    try {
      // Fetch full episode data with characters and settings
      const fullDataResponse = await fetch(`/api/episodes/${episodeId}/full-data`)
      if (!fullDataResponse.ok) {
        throw new Error('Failed to fetch episode data')
      }
      const fullData = await fullDataResponse.json()

      // Generate detailed, comprehensive brief
      const detailedBrief = generateDetailedBrief(fullData)

      // Debug logging
      console.log('Episode data loaded:', {
        characters: fullData.characters?.length || 0,
        settings: fullData.settings?.length || 0,
        suggestedCharacters: fullData.suggestedCharacters,
        suggestedSettings: fullData.suggestedSettings,
      })

      // Pass data to parent WITHOUT converting to prompt
      if (onEpisodeDataLoaded) {
        const hasScreenplay = !!(fullData.episode.structured_screenplay?.scenes?.length > 0 || fullData.episode.screenplay_text)
        const sceneCount = fullData.episode.structured_screenplay?.scenes?.length || 0

        onEpisodeDataLoaded({
          ...fullData,
          brief: detailedBrief,
          hasScreenplay,
          sceneCount,
        })
      }
    } catch (err: any) {
      console.error('Failed to load episode data:', err)
      alert(err.message || 'Failed to load episode data')
    } finally {
      setLoadingData(false)
    }
  }

  const selectedEpisode = episodes.find((ep) => ep.id === selectedEpisodeId)

  if (!seriesId) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-scenra-amber" />
          Episode Source
        </CardTitle>
        <CardDescription className="text-xs">
          Use an existing episode screenplay as the basis for your video
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-scenra-amber" />
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p className="mb-2">No episodes available for this series yet.</p>
            <p className="text-xs">Create episodes to use them as video sources.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Select Episode</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedEpisodeId || ''}
                onChange={(e) => handleEpisodeChange(e.target.value || null)}
                disabled={disabled || loadingData}
              >
                <option value="">Manual video creation</option>
                {episodes.map((episode) => (
                  <option key={episode.id} value={episode.id}>
                    S{episode.season_number}E{episode.episode_number}: {episode.title}
                  </option>
                ))}
              </select>
            </div>

            {loadingData && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-scenra-amber mr-2" />
                <span className="text-sm text-scenra-gray">Loading episode data...</span>
              </div>
            )}

            {selectedEpisode && !loadingData && (
              <div className="rounded-lg border border-gray-200 dark:border-scenra-amber/30 p-3 space-y-3 bg-gray-50 dark:bg-scenra-dark-panel">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs border-scenra-amber/40 text-scenra-amber">
                        S{selectedEpisode.season_number}E{selectedEpisode.episode_number}
                      </Badge>
                      <Badge className="text-xs bg-scenra-amber text-scenra-dark">
                        {selectedEpisode.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm mb-1 text-gray-900 dark:text-scenra-light">{selectedEpisode.title}</h4>
                    {selectedEpisode.logline && (
                      <p className="text-xs text-gray-600 dark:text-scenra-gray italic line-clamp-2">
                        {selectedEpisode.logline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">
                      Episode Data Loaded
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-scenra-gray space-y-1">
                    <p>✓ Brief auto-filled from episode synopsis</p>
                    <p>✓ Characters and settings pre-selected</p>
                    <p>✓ Ready for AI roundtable discussion</p>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Click &quot;Start Roundtable&quot; to create an optimized prompt through AI collaboration.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
