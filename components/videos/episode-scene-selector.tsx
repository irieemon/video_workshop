'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Film, Users, MapPin, Clock, Sparkles } from 'lucide-react'
import type { Scene } from '@/lib/types/database.types'

interface ScenePreview {
  scene_id: string
  scene_number: number
  location: string
  time_of_day: string
  time_period: string
  description: string
  characters: string[]
  hasDialogue: boolean
  hasActions: boolean
  duration_estimate?: number
  dialoguePreview?: {
    character: string
    firstLine: string
  }[]
}

interface EpisodeSceneSelectorProps {
  episodeId: string
  projectId?: string
  onSceneConverted?: (videoId: string) => void
}

export function EpisodeSceneSelector({
  episodeId,
  projectId,
  onSceneConverted,
}: EpisodeSceneSelectorProps) {
  const router = useRouter()
  const [scenes, setScenes] = useState<ScenePreview[]>([])
  const [episodeInfo, setEpisodeInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<string | null>(null)

  useEffect(() => {
    loadScenes()
  }, [episodeId])

  const loadScenes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/episodes/${episodeId}/scenes`)

      if (!response.ok) {
        throw new Error('Failed to load scenes')
      }

      const data = await response.json()
      setEpisodeInfo(data.episode)
      setScenes(data.scenes || [])
    } catch (error) {
      console.error('Failed to load scenes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConvertScene = async (sceneId: string) => {
    try {
      setConverting(sceneId)
      const response = await fetch(
        `/api/episodes/${episodeId}/scenes/${sceneId}/convert-to-video`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to convert scene to video')
      }

      const data = await response.json()

      if (data.video) {
        // Navigate to video editor or call callback
        if (onSceneConverted) {
          onSceneConverted(data.video.id)
        } else if (projectId) {
          router.push(`/dashboard/projects/${projectId}/videos/${data.video.id}`)
        } else {
          router.push(`/dashboard/videos/${data.video.id}`)
        }
      }
    } catch (error) {
      console.error('Failed to convert scene:', error)
      alert('Failed to convert scene to video. Please try again.')
    } finally {
      setConverting(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Scenes...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (scenes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Scenes Available</CardTitle>
          <CardDescription>
            {episodeInfo
              ? `${episodeInfo.title} does not have a structured screenplay yet`
              : 'This episode needs a screenplay before scenes can be converted to videos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Work with the AI screenplay writer to create scenes for this episode first.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Scene to Convert</h3>
          {episodeInfo && (
            <p className="text-sm text-muted-foreground">
              From {episodeInfo.title} (S{episodeInfo.season_number}E
              {episodeInfo.episode_number}) • {scenes.length} scenes available
            </p>
          )}
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Screenplay-Enriched
        </Badge>
      </div>

      <div className="grid gap-4">
        {scenes.map((scene) => (
          <Card
            key={scene.scene_id}
            className={`transition-all ${
              selectedScene === scene.scene_id
                ? 'border-primary ring-2 ring-primary/20'
                : 'hover:border-primary/50'
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Scene {scene.scene_number}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {scene.time_of_day} {scene.time_period}
                    </Badge>
                    {scene.duration_estimate && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {scene.duration_estimate}s
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {scene.location}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {scene.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scene.characters && scene.characters.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Characters:</span>
                  <span>{scene.characters.join(', ')}</span>
                </div>
              )}

              {scene.dialoguePreview && scene.dialoguePreview.length > 0 && (
                <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-md">
                  <div className="font-semibold text-xs text-muted-foreground mb-1">
                    Dialogue Preview:
                  </div>
                  {scene.dialoguePreview.map((d, i) => (
                    <div key={i} className="text-xs">
                      <strong>{d.character}:</strong> &quot;{d.firstLine}&quot;
                    </div>
                  ))}
                  {scene.hasDialogue && (
                    <div className="text-xs text-muted-foreground italic">
                      + more dialogue in scene...
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {scene.hasDialogue && (
                  <Badge variant="outline" className="text-xs">
                    ✓ Dialogue
                  </Badge>
                )}
                {scene.hasActions && (
                  <Badge variant="outline" className="text-xs">
                    ✓ Actions
                  </Badge>
                )}
              </div>

              <Button
                onClick={() => handleConvertScene(scene.scene_id)}
                disabled={converting === scene.scene_id}
                className="w-full"
              >
                {converting === scene.scene_id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Film className="mr-2 h-4 w-4" />
                    Convert to Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
