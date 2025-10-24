'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Video, CheckCircle2, XCircle, DollarSign } from 'lucide-react'

interface SoraGenerationSettings {
  duration: number
  aspect_ratio: '16:9' | '9:16' | '1:1'
  resolution: '1080p' | '720p'
  model: 'sora-2' | 'sora-2-pro'
}

interface SoraGenerationModalProps {
  open: boolean
  onClose: () => void
  videoId: string
  videoTitle: string
  finalPrompt?: string
}

export function SoraGenerationModal({
  open,
  onClose,
  videoId,
  videoTitle,
  finalPrompt,
}: SoraGenerationModalProps) {
  const [step, setStep] = useState<'settings' | 'generating' | 'completed' | 'failed'>('settings')
  const [settings, setSettings] = useState<SoraGenerationSettings>({
    duration: 4,
    aspect_ratio: '9:16',
    resolution: '1080p',
    model: 'sora-2',
  })
  const [estimatedCost, setEstimatedCost] = useState<number>(1.0)
  const [generationStatus, setGenerationStatus] = useState<string>('queued')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  // Calculate estimated cost when settings change
  useEffect(() => {
    const cost = calculateCost(settings.duration, settings.resolution)
    setEstimatedCost(cost)
  }, [settings])

  // Poll for status when generating
  useEffect(() => {
    if (step === 'generating' && jobId) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/videos/${videoId}/sora-status`)
          const data = await response.json()

          if (data.status === 'completed') {
            setVideoUrl(data.videoUrl)
            setGenerationStatus('completed')
            setStep('completed')
            clearInterval(pollInterval)
          } else if (data.status === 'failed') {
            setErrorMessage(data.error || 'Video generation failed')
            setStep('failed')
            clearInterval(pollInterval)
          } else {
            setGenerationStatus(data.status)
          }
        } catch (error) {
          console.error('Failed to poll status:', error)
        }
      }, 5000) // Poll every 5 seconds

      // Timeout after 10 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval)
        setErrorMessage('Video generation timed out')
        setStep('failed')
      }, 10 * 60 * 1000)

      return () => {
        clearInterval(pollInterval)
        clearTimeout(timeout)
      }
    }
  }, [step, jobId, videoId])

  const handleGenerate = async () => {
    try {
      setStep('generating')
      setGenerationStatus('queued')

      const response = await fetch(`/api/videos/${videoId}/generate-sora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      setJobId(data.jobId)
      setGenerationStatus(data.status)
    } catch (error: any) {
      console.error('Failed to generate video:', error)
      setErrorMessage(error.message)
      setStep('failed')
    }
  }

  const handleClose = () => {
    if (step === 'generating') {
      const confirmClose = window.confirm(
        'Video generation is in progress. Are you sure you want to close? The video will continue generating in the background.'
      )
      if (!confirmClose) return
    }
    onClose()
    // Reset state
    setStep('settings')
    setGenerationStatus('queued')
    setVideoUrl(null)
    setErrorMessage(null)
    setJobId(null)
  }

  const handleDownload = () => {
    if (videoUrl) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_sora_video.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Generate Video with Sora AI
          </DialogTitle>
          <DialogDescription>
            {videoTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Settings Step */}
        {step === 'settings' && (
          <div className="space-y-6 py-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Video Duration</Label>
              <Select
                value={settings.duration.toString()}
                onValueChange={(value) => setSettings({ ...settings, duration: parseInt(value) })}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 seconds</SelectItem>
                  <SelectItem value="8">8 seconds</SelectItem>
                  <SelectItem value="12">12 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
              <Select
                value={settings.aspect_ratio}
                onValueChange={(value: any) => setSettings({ ...settings, aspect_ratio: value })}
              >
                <SelectTrigger id="aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 (TikTok, Stories)</SelectItem>
                  <SelectItem value="16:9">16:9 (YouTube, Landscape)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select
                value={settings.resolution}
                onValueChange={(value: any) => setSettings({ ...settings, resolution: value })}
              >
                <SelectTrigger id="resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Sora Model</Label>
              <Select
                value={settings.model}
                onValueChange={(value: any) => setSettings({ ...settings, model: value })}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sora-2">Sora 2 (Standard)</SelectItem>
                  <SelectItem value="sora-2-pro">Sora 2 Pro (Higher Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Cost */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated Cost</span>
                </div>
                <Badge variant="secondary" className="text-base">
                  ${estimatedCost.toFixed(2)} USD
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Actual cost may vary based on generation complexity
              </p>
            </div>

            {/* Prompt Preview */}
            {finalPrompt && (
              <div className="space-y-2">
                <Label>Prompt to be used:</Label>
                <div className="max-h-32 overflow-y-auto rounded-md bg-muted p-3 text-sm">
                  {finalPrompt.substring(0, 500)}
                  {finalPrompt.length > 500 && '...'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Generating Your Video</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {getStatusMessage(generationStatus)}
              </p>
              <Badge variant="outline" className="mt-3">
                Status: {generationStatus}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              This may take several minutes. You can close this dialog - the video will continue generating.
            </p>
          </div>
        )}

        {/* Completed Step */}
        {step === 'completed' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Video Generated Successfully!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your Sora AI video is ready
              </p>
            </div>
            {videoUrl && (
              <div className="w-full space-y-2">
                <div className="aspect-[9/16] max-w-[300px] mx-auto bg-black rounded-lg overflow-hidden">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                    playsInline
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Failed Step */}
        {step === 'failed' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <XCircle className="h-16 w-16 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Generation Failed</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage || 'An error occurred during video generation'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'settings' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!finalPrompt}>
                <Video className="mr-2 h-4 w-4" />
                Generate Video (${estimatedCost.toFixed(2)})
              </Button>
            </>
          )}

          {step === 'generating' && (
            <Button variant="outline" onClick={handleClose}>
              Close (Continue in Background)
            </Button>
          )}

          {step === 'completed' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleDownload}>
                Download Video
              </Button>
            </>
          )}

          {step === 'failed' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setStep('settings')}>
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Calculate estimated cost
 */
function calculateCost(duration: number, resolution: string): number {
  const baseCost = 1.00
  let durationMultiplier = 1.0
  let resolutionMultiplier = 1.0

  if (duration > 5) {
    durationMultiplier = 1.0 + ((duration - 5) * 0.1)
  }

  switch (resolution) {
    case '1080p':
      resolutionMultiplier = 1.5
      break
    case '720p':
      resolutionMultiplier = 1.0
      break
  }

  return baseCost * durationMultiplier * resolutionMultiplier
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'queued':
      return 'Your video is queued for generation...'
    case 'in_progress':
      return 'Sora AI is creating your video...'
    case 'completed':
      return 'Generation complete!'
    case 'failed':
      return 'Generation failed'
    default:
      return 'Processing...'
  }
}
