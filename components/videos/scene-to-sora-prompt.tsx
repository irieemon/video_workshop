'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Film, Sparkles } from 'lucide-react'
import { Scene, StructuredScreenplay } from '@/lib/types/database.types'
import { sceneToSoraPrompt, generateScenePreview, buildCharacterDescriptions, SoraPromptOptions } from '@/lib/utils/screenplay-to-sora'

interface Character {
  id: string
  name: string
  description: string
  role?: string | null
  performance_style?: string | null
}

interface SceneToSoraPromptProps {
  episodeId: string
  structuredScreenplay: StructuredScreenplay | null
  characters: Character[]
  onPromptGenerated: (prompt: string, sceneInfo: any) => void
  disabled?: boolean
}

export function SceneToSoraPrompt({
  episodeId,
  structuredScreenplay,
  characters,
  onPromptGenerated,
  disabled = false,
}: SceneToSoraPromptProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [generating, setGenerating] = useState(false)

  // Sora options
  const [duration, setDuration] = useState<number>(6)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16')
  const [cameraStyle, setCameraStyle] = useState<string>('ARRI ALEXA 35')
  const [lightingMood, setLightingMood] = useState<string>('Natural')
  const [colorPalette, setColorPalette] = useState<string>('Neutral')

  const scenes = useMemo(() => structuredScreenplay?.scenes || [], [structuredScreenplay])

  // Update selected scene when ID changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.scene_id === selectedSceneId)
      setSelectedScene(scene || null)
    } else {
      setSelectedScene(null)
    }
  }, [selectedSceneId, scenes])

  const handleGeneratePrompt = () => {
    if (!selectedScene) return

    setGenerating(true)

    try {
      // Build character descriptions from series data
      const characterDescriptions = buildCharacterDescriptions(characters)

      // Configure Sora options
      const options: SoraPromptOptions = {
        duration,
        aspectRatio,
        resolution: '1080p',
        cameraStyle,
        lightingMood,
        colorPalette,
        characterDescriptions,
      }

      // Generate the Sora-ready prompt
      const result = sceneToSoraPrompt(selectedScene, options)

      // Pass the generated prompt back to parent
      onPromptGenerated(result.prompt, result.sceneInfo)
    } catch (error) {
      console.error('Failed to generate Sora prompt:', error)
    } finally {
      setGenerating(false)
    }
  }

  if (!structuredScreenplay || scenes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-sm text-scenra-gray">
            No screenplay scenes available.
            <br />
            Generate a screenplay for this episode first.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Scene Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Film className="h-4 w-4 text-scenra-amber" />
            Select Scene from Screenplay
          </CardTitle>
          <CardDescription className="text-xs">
            Choose which scene to convert into a Sora video prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
          {scenes.map((scene) => {
            const preview = generateScenePreview(scene)
            const isSelected = selectedSceneId === scene.scene_id

            return (
              <div
                key={scene.scene_id}
                className={`flex items-start space-x-3 p-3 rounded-md border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-scenra-amber bg-scenra-amber/10'
                    : 'border-gray-200 dark:border-scenra-amber/30 bg-gray-50 dark:bg-scenra-dark-panel hover:border-scenra-amber'
                }`}
                onClick={() => !disabled && setSelectedSceneId(scene.scene_id)}
              >
                <Checkbox
                  id={`scene-${scene.scene_id}`}
                  checked={isSelected}
                  onCheckedChange={() => !disabled && setSelectedSceneId(scene.scene_id)}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={`scene-${scene.scene_id}`}
                      className="text-sm font-medium text-gray-900 dark:text-scenra-light cursor-pointer"
                    >
                      Scene {scene.scene_number}: {scene.location}
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {scene.time_of_day} {scene.time_period}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-scenra-gray line-clamp-2 whitespace-pre-line">
                    {preview}
                  </p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Sora Options Configuration */}
      {selectedScene && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-scenra-amber" />
              Sora Video Options
            </CardTitle>
            <CardDescription className="text-xs">
              Configure technical specifications for video generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm">Duration (seconds)</Label>
              <input
                id="duration"
                type="number"
                min="3"
                max="10"
                step="0.5"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                disabled={disabled}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: {selectedScene.duration_estimate || 6} seconds
              </p>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label className="text-sm">Aspect Ratio</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('9:16')}
                  disabled={disabled}
                  className={aspectRatio === '9:16' ? 'bg-scenra-amber hover:bg-scenra-dark' : ''}
                >
                  9:16 (Vertical)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('16:9')}
                  disabled={disabled}
                  className={aspectRatio === '16:9' ? 'bg-scenra-amber hover:bg-scenra-dark' : ''}
                >
                  16:9 (Wide)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={aspectRatio === '1:1' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('1:1')}
                  disabled={disabled}
                  className={aspectRatio === '1:1' ? 'bg-scenra-amber hover:bg-scenra-dark' : ''}
                >
                  1:1 (Square)
                </Button>
              </div>
            </div>

            {/* Camera Style */}
            <div className="space-y-2">
              <Label htmlFor="cameraStyle" className="text-sm">Camera Style</Label>
              <input
                id="cameraStyle"
                type="text"
                value={cameraStyle}
                onChange={(e) => setCameraStyle(e.target.value)}
                disabled={disabled}
                placeholder="e.g., ARRI ALEXA 35, RED Komodo, iPhone 15 Pro"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2"
              />
            </div>

            {/* Lighting Mood */}
            <div className="space-y-2">
              <Label htmlFor="lightingMood" className="text-sm">Lighting Mood</Label>
              <input
                id="lightingMood"
                type="text"
                value={lightingMood}
                onChange={(e) => setLightingMood(e.target.value)}
                disabled={disabled}
                placeholder="e.g., Natural, Dramatic, Soft, High-contrast"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2"
              />
            </div>

            {/* Color Palette */}
            <div className="space-y-2">
              <Label htmlFor="colorPalette" className="text-sm">Color Palette</Label>
              <input
                id="colorPalette"
                type="text"
                value={colorPalette}
                onChange={(e) => setColorPalette(e.target.value)}
                disabled={disabled}
                placeholder="e.g., Warm tones, Cool blues, Desaturated, Vibrant"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGeneratePrompt}
              disabled={!selectedScene || disabled || generating}
              className="w-full bg-scenra-amber hover:bg-scenra-dark"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Prompt...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Sora Prompt from Scene
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scene Preview */}
      {selectedScene && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scene Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Description</p>
              <p className="text-sm text-gray-600 dark:text-scenra-gray">{selectedScene.description}</p>
            </div>

            {selectedScene.characters && selectedScene.characters.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Characters</p>
                <div className="flex flex-wrap gap-1">
                  {selectedScene.characters.map((charName) => (
                    <Badge key={charName} variant="secondary" className="text-xs">
                      {charName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedScene.dialogue && selectedScene.dialogue.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Dialogue</p>
                <div className="space-y-2 text-sm text-gray-600 dark:text-scenra-gray">
                  {selectedScene.dialogue.map((d, idx) => (
                    <div key={idx}>
                      <strong>{d.character}:</strong> &quot;{Array.isArray(d.lines) ? d.lines.join(' ') : d.lines}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedScene.action && selectedScene.action.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Actions</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-scenra-gray">
                  {selectedScene.action.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
