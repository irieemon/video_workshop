'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Film, Plus, Edit, Trash2, Video, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { ScreenplayChat } from './screenplay-chat'

interface Scene {
  id: string
  episode_id: string
  scene_number: number
  scene_heading: string
  location: string | null
  time_of_day: string | null
  interior_exterior: string | null
  action_description: string | null
  dialogue: any
  emotional_beat: string | null
  act_number: number | null
  plot_line: string | null
  scene_purpose: string | null
  story_function: string | null
  characters_present: string[]
  props_needed: string[] | null
  video_id: string | null
  video_prompt: string | null
  created_at: string
}

interface SceneListProps {
  episodeId: string
  episodeTitle: string
  seriesId: string
  onVideoGenerate?: (sceneId: string, prompt: string) => void
}

export function SceneList({ episodeId, episodeTitle, seriesId, onVideoGenerate }: SceneListProps) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set())
  const [chatOpen, setChatOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<Scene | null>(null)

  useEffect(() => {
    loadScenes()
  }, [episodeId])

  const loadScenes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/screenplay/scenes?episodeId=${episodeId}`)

      if (!response.ok) {
        throw new Error('Failed to load scenes')
      }

      const data = await response.json()
      setScenes(data.scenes || [])
    } catch (error) {
      console.error('Failed to load scenes:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (sceneId: string) => {
    const newExpanded = new Set(expandedScenes)
    if (newExpanded.has(sceneId)) {
      newExpanded.delete(sceneId)
    } else {
      newExpanded.add(sceneId)
    }
    setExpandedScenes(newExpanded)
  }

  const handleCreateScene = () => {
    setChatOpen(true)
  }

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene)
    setChatOpen(true)
  }

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('Delete this scene? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/screenplay/scenes/${sceneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete scene')
      }

      await loadScenes()
    } catch (error) {
      console.error('Failed to delete scene:', error)
      alert('Failed to delete scene')
    }
  }

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    alert('Prompt copied to clipboard!')
  }

  const handleGenerateVideo = async (scene: Scene) => {
    if (!scene.video_prompt) {
      alert('No video prompt available for this scene')
      return
    }

    if (onVideoGenerate) {
      onVideoGenerate(scene.id, scene.video_prompt)
    } else {
      // Default behavior: copy to clipboard and inform user
      navigator.clipboard.writeText(scene.video_prompt)
      alert('Video prompt copied to clipboard! Create a new video and paste this prompt.')
    }
  }

  const getPlotLineColor = (plotLine: string | null) => {
    switch (plotLine) {
      case 'A': return 'bg-blue-500'
      case 'B': return 'bg-purple-500'
      case 'C': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenes</CardTitle>
          <CardDescription>Loading scenes...</CardDescription>
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
                Scenes
              </CardTitle>
              <CardDescription>
                {episodeTitle} - {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button onClick={handleCreateScene}>
              <Plus className="h-4 w-4 mr-2" />
              New Scene
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scenes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No scenes yet</p>
              <p className="text-sm mb-4">
                Work with the screenplay agent to break down this episode into scenes
              </p>
              <Button onClick={handleCreateScene} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Scene
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {scenes.map((scene) => {
                  const isExpanded = expandedScenes.has(scene.id)

                  return (
                    <Card key={scene.id} className="overflow-hidden">
                      <div
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpanded(scene.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Badge variant="outline">Scene {scene.scene_number}</Badge>
                              {scene.plot_line && (
                                <Badge className={getPlotLineColor(scene.plot_line)}>
                                  {scene.plot_line}-Plot
                                </Badge>
                              )}
                              {scene.act_number && (
                                <Badge variant="secondary">Act {scene.act_number}</Badge>
                              )}
                              {scene.video_id && (
                                <Badge variant="default" className="bg-green-600">
                                  Video Generated
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-sm font-medium mb-1">
                              {scene.scene_heading}
                            </div>
                            {scene.emotional_beat && (
                              <div className="text-sm text-muted-foreground">
                                {scene.emotional_beat}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditScene(scene)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteScene(scene.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t">
                          {/* Action Description */}
                          {scene.action_description && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold mb-2">Action</h4>
                              <p className="text-sm whitespace-pre-wrap">{scene.action_description}</p>
                            </div>
                          )}

                          {/* Dialogue */}
                          {scene.dialogue && Object.keys(scene.dialogue).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Dialogue</h4>
                              <div className="space-y-3">
                                {Object.entries(scene.dialogue).map(([character, lines]: [string, any]) => (
                                  <div key={character} className="pl-4 border-l-2 border-sage-600">
                                    <div className="text-sm font-medium mb-1">{character}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {Array.isArray(lines) ? lines.join('\n') : lines}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Scene Purpose */}
                          {scene.scene_purpose && (
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Purpose</h4>
                              <p className="text-sm text-muted-foreground">{scene.scene_purpose}</p>
                            </div>
                          )}

                          {/* Characters Present */}
                          {scene.characters_present && scene.characters_present.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Characters</h4>
                              <div className="flex flex-wrap gap-2">
                                {scene.characters_present.map((char) => (
                                  <Badge key={char} variant="outline">{char}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Props */}
                          {scene.props_needed && scene.props_needed.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Props</h4>
                              <div className="flex flex-wrap gap-2">
                                {scene.props_needed.map((prop) => (
                                  <Badge key={prop} variant="secondary">{prop}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Video Prompt */}
                          {scene.video_prompt && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold">Video Prompt</h4>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCopyPrompt(scene.video_prompt!)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                  {!scene.video_id && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleGenerateVideo(scene)}
                                    >
                                      <Video className="h-3 w-3 mr-1" />
                                      Generate Video
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <Textarea
                                value={scene.video_prompt}
                                readOnly
                                className="text-sm font-mono"
                                rows={4}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
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
          setEditingScene(null)
          loadScenes()
        }}
        seriesId={seriesId}
        seriesName={episodeTitle}
        targetType="scene"
        targetId={editingScene?.id}
      />
    </>
  )
}
