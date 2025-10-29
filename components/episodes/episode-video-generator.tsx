'use client'

/**
 * EpisodeVideoGenerator Component
 *
 * Streamlined episode → video generation workflow with automatic series context injection.
 * This component enables the series-first workflow where users create videos directly from episodes,
 * with all series context (characters, settings, visual assets) automatically available to AI agents.
 *
 * Key Features:
 * - Automatic context injection via episodeId
 * - Simplified UX - no manual character/setting selection needed
 * - Episode context display (story beat, emotional arc)
 * - Integration with streaming roundtable agents
 * - Video save and Sora generation workflow
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Sparkles, Loader2, CheckCircle2, Video } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PromptOutput } from '@/components/videos/prompt-output'
import { AdvancedModeToggle } from '@/components/videos/advanced-mode-toggle'
import { EditablePromptField } from '@/components/videos/editable-prompt-field'
import { ShotListBuilder } from '@/components/videos/shot-list-builder'
import { AdditionalGuidance } from '@/components/videos/additional-guidance'
import { SoraGenerationModal } from '@/components/videos/sora-generation-modal'
import type { Shot, Episode } from '@/lib/types/database.types'

interface RoundtableResult {
  discussion: {
    round1: Array<{
      agent: string
      response: string
    }>
    round2: Array<{
      agent: string
      response: string
      isChallenge?: boolean
      respondingTo?: string
      buildingOn?: string[]
    }>
  }
  detailedBreakdown: {
    scene_structure: string
    visual_specs: string
    audio: string
    platform_optimization: string
    hashtags: string[]
  }
  optimizedPrompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots?: Shot[]
}

interface EpisodeVideoGeneratorProps {
  episodeId: string
  seriesId: string
  projectId: string
  episodeTitle: string
  episodeNumber?: number
  seasonNumber?: number
  storyBeat?: string
  emotionalArc?: string
  onVideoCreated?: (videoId: string) => void
}

export function EpisodeVideoGenerator({
  episodeId,
  seriesId,
  projectId,
  episodeTitle,
  episodeNumber,
  seasonNumber,
  storyBeat,
  emotionalArc,
  onVideoCreated,
}: EpisodeVideoGeneratorProps) {
  const router = useRouter()

  // Core state
  const [brief, setBrief] = useState('')
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoundtableResult | null>(null)

  // Advanced mode state
  const [advancedMode, setAdvancedMode] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [shotList, setShotList] = useState<Shot[]>([])
  const [additionalGuidance, setAdditionalGuidance] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  // Save and generation state
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [soraModalOpen, setSoraModalOpen] = useState(false)
  const [savedVideoId, setSavedVideoId] = useState<string | null>(null)
  const [savedVideoTitle, setSavedVideoTitle] = useState<string>('')

  // Initialize prompt with episode context
  useEffect(() => {
    const initialBrief = []
    if (storyBeat) {
      initialBrief.push(`Story Beat: ${storyBeat}`)
    }
    if (emotionalArc) {
      initialBrief.push(`Emotional Arc: ${emotionalArc}`)
    }
    if (initialBrief.length > 0) {
      setBrief(initialBrief.join('\n\n'))
    }
  }, [storyBeat, emotionalArc])

  // Update edited prompt when result arrives
  useEffect(() => {
    if (result) {
      setEditedPrompt(result.optimizedPrompt)
      if (result.suggestedShots && result.suggestedShots.length > 0) {
        setShotList(result.suggestedShots)
      }
    }
  }, [result])

  const handleStartRoundtable = async () => {
    if (!brief.trim()) {
      setError('Please enter a video brief')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/agent/roundtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          platform,
          projectId,
          episodeId, // NEW: Auto-fetch series context from episode
          // Note: No need to pass seriesId, selectedCharacters, selectedSettings
          // These are automatically fetched via the episodeId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start roundtable')
      }

      const data: RoundtableResult = await response.json()
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate video prompt'
      setError(message)
      console.error('Roundtable error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegeneratePrompt = async () => {
    if (!brief.trim()) {
      setError('Please enter a video brief')
      return
    }

    setError(null)
    setRegenerating(true)

    try {
      const enhancedBrief = additionalGuidance
        ? `${brief}\n\nAdditional Guidance:\n${additionalGuidance}`
        : brief

      const response = await fetch('/api/agent/roundtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: enhancedBrief,
          platform,
          projectId,
          episodeId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate')
      }

      const data: RoundtableResult = await response.json()
      setResult(data)
      setAdditionalGuidance('') // Clear after successful regeneration
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate prompt'
      setError(message)
      console.error('Regeneration error:', err)
    } finally {
      setRegenerating(false)
    }
  }

  const handleSaveVideo = async () => {
    if (!result) {
      setError('No video prompt to save')
      return
    }

    setSaving(true)
    setSaveProgress('Saving video...')
    setError(null)

    try {
      const videoTitle = `${episodeTitle} - ${platform.charAt(0).toUpperCase() + platform.slice(1)}`

      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          seriesId,
          episodeId,
          title: videoTitle,
          userBrief: brief,
          agentDiscussion: result.discussion,
          detailedBreakdown: result.detailedBreakdown,
          optimizedPrompt: advancedMode ? editedPrompt : result.optimizedPrompt,
          characterCount: result.characterCount,
          platform,
          hashtags: result.hashtags,
          generation_source: 'episode',
          source_metadata: {
            episodeId,
            seriesId,
            episodeTitle,
            episodeNumber,
            seasonNumber,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save video')
      }

      const savedVideo = await response.json()
      setSavedVideoId(savedVideo.id)
      setSavedVideoTitle(videoTitle)
      setSaveSuccess(true)
      setSaveProgress('Video saved successfully!')

      if (onVideoCreated) {
        onVideoCreated(savedVideo.id)
      }

      // Auto-open Sora modal after save
      setTimeout(() => {
        setSoraModalOpen(true)
      }, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save video'
      setError(message)
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleViewVideo = () => {
    if (savedVideoId) {
      router.push(`/dashboard/projects/${projectId}/videos/${savedVideoId}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Episode Context Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Generate Video from Episode
              </CardTitle>
              <CardDescription>
                {seasonNumber && episodeNumber ? (
                  <>Season {seasonNumber}, Episode {episodeNumber}: {episodeTitle}</>
                ) : (
                  episodeTitle
                )}
              </CardDescription>
            </div>
            <Badge variant="secondary">Auto Context</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Episode Context Display */}
          {(storyBeat || emotionalArc) && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Episode Context (Auto-Injected)</p>
              {storyBeat && (
                <div className="text-sm">
                  <span className="font-medium">Story Beat:</span> {storyBeat}
                </div>
              )}
              {emotionalArc && (
                <div className="text-sm">
                  <span className="font-medium">Emotional Arc:</span> {emotionalArc}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                All series characters, settings, and visual assets are automatically available to AI agents
              </p>
            </div>
          )}

          {/* Video Brief */}
          <div className="space-y-2">
            <Label htmlFor="brief">Video Brief</Label>
            <Textarea
              id="brief"
              placeholder="Describe what you want in this video scene... The episode context and series assets will be automatically included."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={6}
              className="resize-y"
            />
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <div className="flex gap-2">
              <Button
                variant={platform === 'tiktok' ? 'default' : 'outline'}
                onClick={() => setPlatform('tiktok')}
                type="button"
              >
                TikTok
              </Button>
              <Button
                variant={platform === 'instagram' ? 'default' : 'outline'}
                onClick={() => setPlatform('instagram')}
                type="button"
              >
                Instagram
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleStartRoundtable}
            disabled={loading || !brief.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI Agents Collaborating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Video Prompt
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Advanced Mode Toggle */}
          <AdvancedModeToggle
            enabled={advancedMode}
            onChange={setAdvancedMode}
          />

          {/* Prompt Output */}
          {!advancedMode && (
            <PromptOutput
              optimizedPrompt={result.optimizedPrompt}
              characterCount={result.characterCount}
              detailedBreakdown={result.detailedBreakdown}
              hashtags={result.detailedBreakdown.hashtags || []}
            />
          )}

          {/* Advanced Mode Controls */}
          {advancedMode && (
            <>
              <EditablePromptField
                value={editedPrompt}
                originalValue={result.optimizedPrompt}
                onChange={setEditedPrompt}
                onRevert={() => setEditedPrompt(result.optimizedPrompt)}
              />

              <ShotListBuilder
                shots={shotList}
                onChange={setShotList}
              />

              <AdditionalGuidance
                value={additionalGuidance}
                onChange={setAdditionalGuidance}
              />
            </>
          )}

          {/* Save and Generate Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSaveVideo}
              disabled={saving || saveSuccess}
              size="lg"
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {saveProgress}
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Video Saved
                </>
              ) : (
                'Save Video'
              )}
            </Button>

            {saveSuccess && savedVideoId && (
              <Button
                onClick={handleViewVideo}
                variant="outline"
                size="lg"
              >
                View Video
              </Button>
            )}
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Video &ldquo;{savedVideoTitle}&rdquo; has been created! You can now generate it with Sora.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Sora Generation Modal */}
      {savedVideoId && (
        <SoraGenerationModal
          open={soraModalOpen}
          onClose={() => setSoraModalOpen(false)}
          videoId={savedVideoId}
          videoTitle={savedVideoTitle}
          finalPrompt={advancedMode ? editedPrompt : result?.optimizedPrompt || ''}
        />
      )}
    </div>
  )
}
