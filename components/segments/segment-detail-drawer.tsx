'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Copy,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Crown
} from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/lib/types/database.types'

type VideoSegment = Database['public']['Tables']['video_segments']['Row']

interface SegmentDetailDrawerProps {
  segment: VideoSegment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesId: string
  episodeId: string
  onGenerate?: (segmentId: string) => void
  isPremium?: boolean
}

export function SegmentDetailDrawer({
  segment,
  open,
  onOpenChange,
  seriesId,
  episodeId,
  onGenerate,
  isPremium = false
}: SegmentDetailDrawerProps) {
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [soraPrompt, setSoraPrompt] = useState<string | null>(null)
  const [promptError, setPromptError] = useState<string | null>(null)

  // Reset prompt when segment changes
  useEffect(() => {
    setSoraPrompt(null)
    setPromptError(null)
  }, [segment?.id])

  if (!segment) return null

  const handleGeneratePrompt = async () => {
    try {
      setGeneratingPrompt(true)
      setPromptError(null)

      const response = await fetch('/api/segments/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: segment.id,
          episodeId,
          seriesId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      setSoraPrompt(data.prompt)
      toast.success('Sora prompt generated successfully!')
    } catch (error) {
      console.error('Error generating prompt:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate prompt'
      setPromptError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const handleCopyPrompt = () => {
    if (soraPrompt) {
      navigator.clipboard.writeText(soraPrompt)
      toast.success('Prompt copied to clipboard!')
    }
  }

  const handleGenerateVideo = async () => {
    if (!isPremium) {
      toast.error('Premium subscription required for direct Sora generation')
      return
    }

    try {
      setGeneratingVideo(true)

      const response = await fetch('/api/segments/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: segment.id,
          episodeId,
          seriesId,
          prompt: soraPrompt
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate video')
      }

      const data = await response.json()
      toast.success('Video generation started!')

      if (onGenerate) {
        onGenerate(segment.id)
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error generating video:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate video')
    } finally {
      setGeneratingVideo(false)
    }
  }

  // Format duration to fix floating-point precision
  const formatDuration = (duration: number) => {
    return Number(duration.toFixed(2))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              #{segment.segment_number}
            </Badge>
            <SheetTitle className="flex-1">{segment.narrative_beat}</SheetTitle>
          </div>
          <SheetDescription>
            Duration: {formatDuration(segment.estimated_duration)}s
            {segment.narrative_transition && (
              <> • {segment.narrative_transition}</>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Sora Prompt Generation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Sora Video Prompt
              </h3>
              {!soraPrompt && (
                <Button
                  size="sm"
                  onClick={handleGeneratePrompt}
                  disabled={generatingPrompt}
                >
                  {generatingPrompt ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Prompt
                    </>
                  )}
                </Button>
              )}
            </div>

            {promptError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{promptError}</AlertDescription>
              </Alert>
            )}

            {soraPrompt ? (
              <div className="space-y-3">
                <div className="relative">
                  <div className="rounded-lg border bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
                    {soraPrompt}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopyPrompt}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleCopyPrompt}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </Button>

                  {isPremium ? (
                    <Button
                      className="flex-1"
                      variant="default"
                      onClick={handleGenerateVideo}
                      disabled={generatingVideo}
                    >
                      {generatingVideo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Generate with Sora
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      variant="outline"
                      disabled
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Premium Required
                    </Button>
                  )}
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    {isPremium ? (
                      "Click 'Generate with Sora' to create this video automatically via API. You'll be notified when it's ready."
                    ) : (
                      "Copy the prompt and paste it into Sora manually, or upgrade to Premium for direct API generation."
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Generate an AI-optimized prompt for Sora with character consistency,
                  visual continuity, and cinematography guidance.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Screenplay Content */}
          <div className="space-y-4">
            <h3 className="font-semibold">Screenplay Content</h3>

            {/* Dialogue */}
            {(segment.dialogue_lines as any) && (segment.dialogue_lines as any).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Dialogue</h4>
                <div className="space-y-2 rounded-lg border p-3">
                  {(segment.dialogue_lines as any).map((line: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <p className="font-semibold text-sm">{line.character}</p>
                      <p className="text-sm text-muted-foreground pl-4">
                        {line.lines.join(' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Beats */}
            {segment.action_beats && segment.action_beats.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Action</h4>
                <ul className="space-y-1 rounded-lg border p-3">
                  {segment.action_beats.map((action: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visual Continuity */}
            {segment.visual_continuity_notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Visual Continuity</h4>
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm">{segment.visual_continuity_notes}</p>
                </div>
              </div>
            )}

            {/* Characters & Settings */}
            <div className="grid grid-cols-2 gap-4">
              {segment.characters_in_segment && segment.characters_in_segment.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Characters</h4>
                  <div className="flex flex-wrap gap-1">
                    {segment.characters_in_segment.map((char: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {char}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {segment.settings_in_segment && segment.settings_in_segment.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Settings</h4>
                  <div className="flex flex-wrap gap-1">
                    {segment.settings_in_segment.map((setting: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {setting}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Technical Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Technical Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Segment Number:</span>
                <span className="ml-2 font-mono">#{segment.segment_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium">{formatDuration(segment.estimated_duration)}s</span>
              </div>
              <div>
                <span className="text-muted-foreground">Start Time:</span>
                <span className="ml-2 font-mono">{formatDuration(segment.start_timestamp)}s</span>
              </div>
              <div>
                <span className="text-muted-foreground">End Time:</span>
                <span className="ml-2 font-mono">{formatDuration(segment.end_timestamp)}s</span>
              </div>
              {segment.scene_ids && segment.scene_ids.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Scene IDs:</span>
                  <span className="ml-2 font-mono text-xs">
                    {segment.scene_ids.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
