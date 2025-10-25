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
  convertedPrompt: string
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
  const [converting, setConverting] = useState(false)
  const [convertedPrompt, setConvertedPrompt] = useState<string | null>(null)

  // Fetch episodes when seriesId changes
  useEffect(() => {
    if (!seriesId) {
      setEpisodes([])
      onEpisodeSelect(null)
      setConvertedPrompt(null)
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
  }, [seriesId, onEpisodeSelect])

  // Reset when series changes
  useEffect(() => {
    onEpisodeSelect(null)
    setConvertedPrompt(null)
    if (onEpisodeDataLoaded) {
      onEpisodeDataLoaded(null)
    }
  }, [seriesId, onEpisodeSelect, onEpisodeDataLoaded])

  const handleConvertEpisode = async (episodeId: string) => {
    setConverting(true)
    try {
      // First, get full episode data
      const fullDataResponse = await fetch(`/api/episodes/${episodeId}/full-data`)
      if (!fullDataResponse.ok) {
        throw new Error('Failed to fetch episode data')
      }
      const fullData = await fullDataResponse.json()

      // Then convert to prompt
      const convertResponse = await fetch(`/api/episodes/${episodeId}/convert-to-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // No specific scene, convert full episode
      })

      if (!convertResponse.ok) {
        throw new Error('Failed to convert episode to prompt')
      }

      const convertData = await convertResponse.json()
      const prompt = convertData.prompt.prompt
      setConvertedPrompt(prompt)

      // Pass complete data to parent component
      if (onEpisodeDataLoaded) {
        onEpisodeDataLoaded({
          ...fullData,
          convertedPrompt: prompt,
        })
      }
    } catch (err: any) {
      console.error('Failed to convert episode:', err)
      alert(err.message || 'Failed to convert episode to video prompt')
    } finally {
      setConverting(false)
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
                onChange={(e) => {
                  onEpisodeSelect(e.target.value || null)
                  setConvertedPrompt(null) // Reset converted prompt when selection changes
                  if (onEpisodeDataLoaded) {
                    onEpisodeDataLoaded(null) // Clear episode data
                  }
                }}
                disabled={disabled}
              >
                <option value="">Manual video creation</option>
                {episodes.map((episode) => (
                  <option key={episode.id} value={episode.id}>
                    S{episode.season_number}E{episode.episode_number}: {episode.title}
                    {episode.screenplay_text ? '' : ' (no screenplay)'}
                  </option>
                ))}
              </select>
            </div>

            {selectedEpisode && (
              <div className="rounded-lg border border-scenra-amber/30 p-3 space-y-3 bg-scenra-dark-panel">
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
                    <h4 className="font-medium text-sm mb-1 text-scenra-light">{selectedEpisode.title}</h4>
                    {selectedEpisode.logline && (
                      <p className="text-xs text-scenra-gray italic line-clamp-2">
                        {selectedEpisode.logline}
                      </p>
                    )}
                  </div>
                </div>

                {selectedEpisode.screenplay_text ? (
                  <>
                    <div className="text-xs text-scenra-gray">
                      Screenplay: {Math.round(selectedEpisode.screenplay_text.length / 1000)}k characters
                    </div>

                    {!convertedPrompt && (
                      <Button
                        onClick={() => handleConvertEpisode(selectedEpisode.id)}
                        disabled={converting || disabled}
                        size="sm"
                        className="w-full bg-scenra-amber hover:bg-scenra-dark"
                      >
                        {converting ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Converting screenplay to Sora prompt...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-3 w-3" />
                            Convert to Video Prompt
                          </>
                        )}
                      </Button>
                    )}

                    {convertedPrompt && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">
                            Converted to Sora Prompt
                          </span>
                        </div>
                        <div className="rounded-md bg-white border p-3 text-xs">
                          <p className="line-clamp-4">{convertedPrompt}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This prompt will be used as the initial brief for the AI roundtable.
                          You can review and edit it after the roundtable discussion.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                    This episode has no screenplay content yet. You can create a manual video or
                    add screenplay content first.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
