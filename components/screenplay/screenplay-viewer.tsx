'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Users, MapPin, MessageSquare, Play } from 'lucide-react'
import type { Episode } from '@/lib/types/database.types'
import { cn } from '@/lib/utils'

interface ScreenplayViewerProps {
  open: boolean
  onClose: () => void
  episode: Episode
}

export function ScreenplayViewer({ open, onClose, episode }: ScreenplayViewerProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set())

  const hasStructured = episode.structured_screenplay?.scenes && episode.structured_screenplay.scenes.length > 0
  const hasText = episode.screenplay_text && episode.screenplay_text.trim().length > 0

  const toggleScene = (sceneId: string) => {
    const newExpanded = new Set(expandedScenes)
    if (newExpanded.has(sceneId)) {
      newExpanded.delete(sceneId)
    } else {
      newExpanded.add(sceneId)
    }
    setExpandedScenes(newExpanded)
  }

  const expandAll = () => {
    if (hasStructured) {
      const allSceneIds = episode.structured_screenplay!.scenes.map((s: any) => s.scene_id)
      setExpandedScenes(new Set(allSceneIds))
    }
  }

  const collapseAll = () => {
    setExpandedScenes(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {episode.title}
          </DialogTitle>
          <DialogDescription>
            {episode.logline || 'Season ' + episode.season_number + ', Episode ' + episode.episode_number}
          </DialogDescription>
        </DialogHeader>

        {hasStructured && (
          <div className="flex gap-2 pb-2">
            <Button onClick={expandAll} variant="outline" size="sm">
              Expand All
            </Button>
            <Button onClick={collapseAll} variant="outline" size="sm">
              Collapse All
            </Button>
            <Badge variant="secondary" className="ml-auto">
              {episode.structured_screenplay!.scenes.length} scenes
            </Badge>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          {hasStructured ? (
            // Structured screenplay with scenes
            <div className="space-y-3">
              {episode.structured_screenplay!.scenes.map((scene: any, idx: number) => {
                const isExpanded = expandedScenes.has(scene.scene_id)
                const hasDialogue = scene.dialogue && scene.dialogue.length > 0
                const hasActions = scene.action && scene.action.length > 0

                return (
                  <Card key={scene.scene_id || idx} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleScene(scene.scene_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <CardTitle className="text-base">
                              Scene {scene.scene_number}: {scene.location}
                            </CardTitle>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {scene.time_of_day} {scene.time_period}
                            </Badge>
                            {scene.duration_estimate && (
                              <Badge variant="secondary" className="text-xs">
                                ~{scene.duration_estimate}s
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {scene.characters?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {scene.characters.length}
                            </div>
                          )}
                          {hasDialogue && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {scene.dialogue.length}
                            </div>
                          )}
                          {hasActions && (
                            <div className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              {scene.action.length}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="space-y-4 pt-4 border-t">
                        {/* Scene Description */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground">{scene.description}</p>
                        </div>

                        {/* Characters */}
                        {scene.characters && scene.characters.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Characters
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {scene.characters.map((char: string, i: number) => (
                                <Badge key={i} variant="secondary">
                                  {char}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dialogue */}
                        {hasDialogue && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Dialogue
                            </h4>
                            <div className="space-y-3">
                              {scene.dialogue.map((d: any, i: number) => (
                                <div key={i} className="bg-muted/50 p-3 rounded-md">
                                  <div className="font-semibold text-sm mb-1">{d.character}</div>
                                  <div className="text-sm italic">
                                    &quot;{Array.isArray(d.lines) ? d.lines.join(' ') : d.lines}&quot;
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {hasActions && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Play className="h-4 w-4" />
                              Actions
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {scene.action.map((action: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Scene Purpose/Beat */}
                        {scene.scene_purpose && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Purpose</h4>
                            <p className="text-sm text-muted-foreground italic">
                              {scene.scene_purpose}
                            </p>
                          </div>
                        )}

                        {scene.emotional_beat && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Emotional Beat</h4>
                            <p className="text-sm text-muted-foreground italic">
                              {scene.emotional_beat}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : hasText ? (
            // Unstructured screenplay text
            <div className="bg-muted/30 p-6 rounded-lg">
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {episode.screenplay_text}
              </div>
            </div>
          ) : (
            // No screenplay content
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No screenplay content available</p>
                <p className="text-xs mt-2">
                  Work with the Screenplay Writer to create content for this episode
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
