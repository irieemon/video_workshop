'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Film, Plus, Edit, Trash2 } from 'lucide-react'
import { ScreenplayChat } from './screenplay-chat'
import type { Episode } from '@/lib/types/database.types'

interface EpisodeManagerProps {
  seriesId: string
  seriesName: string
}

export function EpisodeManager({ seriesId, seriesName }: EpisodeManagerProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    loadEpisodes()
  }, [seriesId])

  const loadEpisodes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/episodes?seriesId=${seriesId}`)

      if (!response.ok) {
        throw new Error('Failed to load episodes')
      }

      const data = await response.json()
      setEpisodes(data.episodes || [])
    } catch (error) {
      console.error('Failed to load episodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEpisode = () => {
    setSelectedEpisode(null)
    setChatOpen(true)
  }

  const handleEditEpisode = (episode: Episode) => {
    setSelectedEpisode(episode)
    setChatOpen(true)
  }

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm('Delete this episode? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete episode')
      }

      // Reload episodes
      await loadEpisodes()
    } catch (error) {
      console.error('Failed to delete episode:', error)
      alert('Failed to delete episode')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      concept: 'bg-gray-100 text-gray-800',
      draft: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      complete: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Episodes</CardTitle>
          <CardDescription>Loading episodes...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Episodes
              </CardTitle>
              <CardDescription>
                Manage episodes for {seriesName}
              </CardDescription>
            </div>
            <Button onClick={handleCreateEpisode}>
              <Plus className="h-4 w-4 mr-2" />
              New Episode
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {episodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No episodes yet</p>
              <p className="text-sm mb-4">
                Work with the screenplay agent to create your first episode
              </p>
              <Button onClick={handleCreateEpisode} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Episode
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {episodes.map((episode) => (
                  <Card key={episode.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              S{episode.season_number}E{episode.episode_number}
                            </Badge>
                            <Badge className={getStatusColor(episode.status)}>
                              {episode.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{episode.title}</CardTitle>
                          {episode.logline && (
                            <CardDescription className="mt-2 italic">
                              {episode.logline}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditEpisode(episode)}
                            title="Continue with AI"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEpisode(episode.id)}
                            title="Delete episode"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Screenplay Progress */}
                      {episode.screenplay_text && (
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold mb-2">Screenplay Progress</h4>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(episode.screenplay_text.length / 1000)}k characters written
                          </div>
                        </div>
                      )}

                      {/* Structured Content */}
                      {episode.structured_screenplay && episode.structured_screenplay.scenes && (
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold mb-2">Structure</h4>
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {episode.structured_screenplay.acts?.length || 0} Acts
                            </Badge>
                            <Badge variant="outline">
                              {episode.structured_screenplay.scenes?.length || 0} Scenes
                            </Badge>
                            <Badge variant="outline">
                              {episode.structured_screenplay.beats?.length || 0} Beats
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Last Updated */}
                      <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        Last updated: {new Date(episode.updated_at).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>


      {/* Screenplay Chat Modal */}
      <ScreenplayChat
        open={chatOpen}
        onClose={() => {
          setChatOpen(false)
          setSelectedEpisode(null)
          loadEpisodes() // Reload episodes after chat closes
        }}
        seriesId={seriesId}
        seriesName={seriesName}
        targetType="episode"
        initialConcept={
          selectedEpisode
            ? {
                episode_number: selectedEpisode.episode_number,
                season_number: selectedEpisode.season_number,
                title: selectedEpisode.title,
                logline: selectedEpisode.logline || '',
                plot_summary: selectedEpisode.screenplay_text || '',
                character_focus: [],
              }
            : undefined
        }
      />
    </>
  )
}
