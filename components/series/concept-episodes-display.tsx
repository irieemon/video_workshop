'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Film, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConceptEpisode {
  episode_number: number
  title: string
  logline: string
  plot_summary: string
  character_focus: string[]
}

export interface ConceptSeason {
  season_number: number
  title: string
  arc: string
  episodes: ConceptEpisode[]
}

interface ConceptEpisodesDisplayProps {
  seasons: ConceptSeason[]
  onEpisodeClick?: (episode: ConceptEpisode, season: ConceptSeason) => void
}

export function ConceptEpisodesDisplay({ seasons, onEpisodeClick }: ConceptEpisodesDisplayProps) {
  if (!seasons || seasons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            <CardTitle>Episode Concepts</CardTitle>
          </div>
          <CardDescription>
            High-level episode outlines from series concept
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No episode concepts yet</p>
            <p className="text-sm mt-1">
              Use the Series Concept Agent to generate episode outlines
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          <CardTitle>Episode Concepts</CardTitle>
        </div>
        <CardDescription>
          High-level episode outlines from series concept · {seasons.length} season{seasons.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {seasons.map((season) => (
              <div key={season.season_number} className="space-y-4">
                {/* Season Header */}
                <div className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Season {season.season_number}</Badge>
                    <h3 className="font-semibold text-lg">{season.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{season.arc}</p>
                </div>

                {/* Episodes */}
                <div className="space-y-3 ml-4">
                  {season.episodes.map((episode) => (
                    <div
                      key={`${season.season_number}-${episode.episode_number}`}
                      onClick={() => onEpisodeClick?.(episode, season)}
                      className={cn(
                        "border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors",
                        onEpisodeClick && "cursor-pointer hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1 shrink-0">
                          E{episode.episode_number}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <h4 className="font-medium">{episode.title}</h4>
                          <p className="text-sm text-muted-foreground italic">
                            &quot;{episode.logline}&quot;
                          </p>
                          <p className="text-sm">{episode.plot_summary}</p>
                          {episode.character_focus && episode.character_focus.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-xs text-muted-foreground">Focus:</span>
                              {episode.character_focus.map((char) => (
                                <Badge key={char} variant="secondary" className="text-xs">
                                  {char}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 p-4 bg-scenra-dark-panel border border-scenra-amber/20 rounded-lg">
          <p className="text-sm text-scenra-light">
            <strong className="text-scenra-amber">Note:</strong> These are high-level episode concepts. Use the Screenplay Writer
            to develop detailed scene-by-scene breakdowns for each episode.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
