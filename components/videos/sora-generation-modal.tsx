'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Video, CheckCircle2, XCircle, DollarSign, Clock, RotateCcw, AlertCircle, History } from 'lucide-react'
import { useModal } from '@/components/providers/modal-provider'
import { useToast } from '@/hooks/use-toast'

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
  const [progress, setProgress] = useState<number>(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)

  const { showConfirm } = useModal()
  const { toast } = useToast()

  // Priority 4: Error Handling & Recovery
  const [retryCount, setRetryCount] = useState<number>(0)
  const [maxRetries] = useState<number>(3)
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [generationHistory, setGenerationHistory] = useState<Array<{
    attempt: number
    status: 'success' | 'failed' | 'timeout'
    timestamp: number
    errorMessage?: string
  }>>([])

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
            setProgress(100)
            setStep('completed')
            // Add to history
            setGenerationHistory(prev => [...prev, {
              attempt: retryCount + 1,
              status: 'success',
              timestamp: Date.now(),
            }])
            clearInterval(pollInterval)
          } else if (data.status === 'failed') {
            const error = data.error || 'Video generation failed'
            setErrorMessage(error)
            setStep('failed')
            // Add to history
            setGenerationHistory(prev => [...prev, {
              attempt: retryCount + 1,
              status: 'failed',
              timestamp: Date.now(),
              errorMessage: error,
            }])
            clearInterval(pollInterval)
          } else {
            setGenerationStatus(data.status)
            // Update progress based on status
            const newProgress = calculateProgress(data.status, startTime)
            setProgress(newProgress)

            // Calculate estimated time remaining
            if (startTime) {
              const elapsed = Date.now() - startTime
              const estimatedTotal = estimateGenerationTime(settings.duration)
              const remaining = Math.max(0, estimatedTotal - elapsed)
              setEstimatedTimeRemaining(remaining)
            }
          }
        } catch (error) {
          console.error('Failed to poll status:', error)
        }
      }, 5000) // Poll every 5 seconds

      // Timeout after 10 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval)
        const timeoutError = 'Video generation timed out after 10 minutes'
        setErrorMessage(timeoutError)
        setStep('failed')
        // Add to history
        setGenerationHistory(prev => [...prev, {
          attempt: retryCount + 1,
          status: 'timeout',
          timestamp: Date.now(),
          errorMessage: timeoutError,
        }])
      }, 10 * 60 * 1000)

      return () => {
        clearInterval(pollInterval)
        clearTimeout(timeout)
      }
    }
  }, [step, jobId, videoId, startTime, settings.duration])

  const handleGenerate = async () => {
    try {
      setStep('generating')
      setGenerationStatus('queued')
      setStartTime(Date.now())
      setProgress(5) // Initial progress

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
      setProgress(10) // Generation started
    } catch (error: any) {
      console.error('Failed to generate video:', error)
      setErrorMessage(error.message)
      setStep('failed')
    }
  }

  const handleClose = async () => {
    if (step === 'generating') {
      const confirmClose = await showConfirm(
        'Generation in Progress',
        'Video generation is in progress. Are you sure you want to close? The video will continue generating in the background.',
        {
          variant: 'warning',
          confirmLabel: 'Close Anyway',
          cancelLabel: 'Keep Open'
        }
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
    setProgress(0)
    setStartTime(null)
    setEstimatedTimeRemaining(null)
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

  // Priority 4: Manual Reset Handler
  const handleReset = async () => {
    const confirmReset = await showConfirm(
      'Reset Generation',
      'Are you sure you want to reset this generation? This will clear the current job and allow you to start fresh.',
      {
        variant: 'warning',
        confirmLabel: 'Reset',
        cancelLabel: 'Cancel'
      }
    )
    if (!confirmReset) return

    try {
      setIsResetting(true)
      const response = await fetch(`/api/videos/${videoId}/reset-sora`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset generation')
      }

      // Reset all states
      setStep('settings')
      setGenerationStatus('queued')
      setJobId(null)
      setErrorMessage(null)
      setProgress(0)
      setStartTime(null)
      setEstimatedTimeRemaining(null)
      setRetryCount(0)
      toast({
        title: 'Generation Reset',
        description: 'The video generation has been reset successfully.',
      })
    } catch (error: any) {
      console.error('Failed to reset generation:', error)
      setErrorMessage(`Reset failed: ${error.message}`)
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset generation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  // Priority 4: Retry with Exponential Backoff
  const handleRetry = async () => {
    if (retryCount >= maxRetries) {
      setErrorMessage(`Maximum retry attempts (${maxRetries}) reached. Please use the reset button to start fresh.`)
      return
    }

    // Calculate exponential backoff delay: 2^retryCount seconds
    const backoffDelay = Math.pow(2, retryCount) * 1000

    setErrorMessage(`Retrying in ${backoffDelay / 1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`)

    await new Promise(resolve => setTimeout(resolve, backoffDelay))

    setRetryCount(prev => prev + 1)
    setStep('settings')
    setErrorMessage(null)

    // Auto-trigger generation after backoff
    setTimeout(() => {
      handleGenerate()
    }, 100)
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
                  <SelectItem value="15">15 seconds (Maximum)</SelectItem>
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
          <div className="flex flex-col space-y-6 py-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Generating Your Video</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getStatusMessage(generationStatus)}
                </p>
                <Badge
                  variant={generationStatus === 'queued' ? 'secondary' : 'default'}
                  className="mt-3 text-base font-semibold"
                >
                  Status: {generationStatus}
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Time Estimate */}
            {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}
                </span>
              </div>
            )}

            {/* Step-by-step Status */}
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <div className="text-xs font-medium text-muted-foreground">Generation Steps:</div>
              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-2 ${progress >= 10 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress >= 10 ? '✓' : '○'} Job submitted to Sora AI
                </div>
                <div className={`flex items-center gap-2 ${progress >= 30 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress >= 30 ? '✓' : '○'} Video frames rendering
                </div>
                <div className={`flex items-center gap-2 ${progress >= 70 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress >= 70 ? '✓' : '○'} Applying effects and transitions
                </div>
                <div className={`flex items-center gap-2 ${progress >= 90 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress >= 90 ? '✓' : '○'} Finalizing and encoding
                </div>
                <div className={`flex items-center gap-2 ${progress >= 100 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress >= 100 ? '✓' : '○'} Complete!
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
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

        {/* Failed Step - Enhanced with Priority 4 */}
        {step === 'failed' && (() => {
          const errorDetails = getDetailedErrorMessage(errorMessage || '')
          return (
            <div className="flex flex-col space-y-6 py-6">
              {/* Error Header */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <XCircle className="h-16 w-16 text-destructive" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{errorDetails.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {errorDetails.description}
                  </p>
                  {retryCount > 0 && (
                    <Badge variant="outline" className="mt-2">
                      Retry Attempt: {retryCount}/{maxRetries}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Troubleshooting Guide */}
              <div className="space-y-3 rounded-lg border border-muted bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Troubleshooting Steps:</h4>
                </div>
                <ul className="ml-6 space-y-2 text-xs text-muted-foreground">
                  {errorDetails.troubleshooting.map((step, index) => (
                    <li key={index} className="list-disc">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Generation History */}
              {generationHistory.length > 0 && (
                <div className="space-y-3 rounded-lg border border-muted bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Generation History:</h4>
                  </div>
                  <div className="space-y-2">
                    {generationHistory.slice(-3).reverse().map((attempt, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant={attempt.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                            Attempt #{attempt.attempt}
                          </Badge>
                          <span className="text-muted-foreground">
                            {attempt.status === 'success' ? '✓ Success' :
                             attempt.status === 'timeout' ? '⏱ Timeout' : '✗ Failed'}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(attempt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retry Information */}
              {errorDetails.canRetry && retryCount < maxRetries && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-100">
                  <p className="font-medium">Automatic Retry Available</p>
                  <p className="mt-1 text-blue-700 dark:text-blue-300">
                    This error can be retried. Click &quot;Retry&quot; to attempt generation again with exponential backoff.
                  </p>
                </div>
              )}
            </div>
          )
        })()}

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

          {step === 'failed' && (() => {
            const errorDetails = getDetailedErrorMessage(errorMessage || '')
            return (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                {jobId && (
                  <Button
                    variant="destructive"
                    onClick={handleReset}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Job
                      </>
                    )}
                  </Button>
                )}
                {errorDetails.canRetry && retryCount < maxRetries && (
                  <Button onClick={handleRetry}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry ({maxRetries - retryCount} left)
                  </Button>
                )}
                {!errorDetails.canRetry || retryCount >= maxRetries && (
                  <Button onClick={() => setStep('settings')}>
                    Try Again with New Settings
                  </Button>
                )}
              </>
            )
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Calculate estimated cost
 * Base cost tiers: 4s ($1.00), 8s ($2.00), 12s ($3.00), 15s ($3.75)
 */
function calculateCost(duration: number, resolution: string): number {
  const baseCost = 1.00
  let durationMultiplier = 1.0
  let resolutionMultiplier = 1.0

  // Duration pricing tiers (4s, 8s, 12s, 15s)
  if (duration >= 15) {
    durationMultiplier = 3.75 // 15 seconds
  } else if (duration >= 12) {
    durationMultiplier = 3.0 // 12 seconds
  } else if (duration >= 8) {
    durationMultiplier = 2.0 // 8 seconds
  } else {
    durationMultiplier = 1.0 // 4 seconds
  }

  // Resolution pricing
  switch (resolution) {
    case '1080p':
      resolutionMultiplier = 1.5
      break
    case '720p':
      resolutionMultiplier = 1.0
      break
  }

  return parseFloat((baseCost * durationMultiplier * resolutionMultiplier).toFixed(2))
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

/**
 * Calculate progress percentage based on status and elapsed time
 */
function calculateProgress(status: string, startTime: number | null): number {
  if (!startTime) return 0

  const elapsed = Date.now() - startTime
  const elapsedMinutes = elapsed / (1000 * 60)

  switch (status) {
    case 'queued':
      // Queued: 5-15% based on time in queue (0-2 minutes)
      return Math.min(15, 5 + (elapsedMinutes / 2) * 10)

    case 'in_progress':
      // In progress: 15-95% based on time processing (0-8 minutes)
      // Logarithmic curve for more realistic progress
      const progressRange = 80 // 95 - 15
      const timeRange = 8 // expected minutes
      const percentComplete = Math.min(1, elapsedMinutes / timeRange)
      // Use easing function for smoother progress
      const easedPercent = 1 - Math.pow(1 - percentComplete, 2)
      return Math.min(95, 15 + (easedPercent * progressRange))

    default:
      return 0
  }
}

/**
 * Estimate total generation time based on video duration
 */
function estimateGenerationTime(videoDuration: number): number {
  // Base time: 3 minutes for 4-second video
  // Each additional second adds 30 seconds
  const baseTime = 3 * 60 * 1000 // 3 minutes in ms
  const additionalTime = (videoDuration - 4) * 30 * 1000 // 30 seconds per additional second
  return baseTime + Math.max(0, additionalTime)
}

/**
 * Format time remaining in human-readable format
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }

  if (seconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return `${minutes}m ${seconds}s`
}

/**
 * Priority 4: Get detailed error message with troubleshooting
 */
function getDetailedErrorMessage(error: string): {
  title: string
  description: string
  troubleshooting: string[]
  canRetry: boolean
} {
  // Check for common error patterns
  if (error.includes('timeout') || error.includes('timed out')) {
    return {
      title: 'Generation Timeout',
      description: 'The video generation took longer than expected and timed out.',
      troubleshooting: [
        'Try reducing the video duration to 4-6 seconds',
        'Lower the resolution to 720p for faster processing',
        'Wait a few minutes and try again - the Sora API may be experiencing high load',
        'Check your internet connection stability',
      ],
      canRetry: true,
    }
  }

  if (error.includes('quota') || error.includes('rate limit')) {
    return {
      title: 'API Rate Limit Reached',
      description: 'You have exceeded the API usage limit.',
      troubleshooting: [
        'Wait 1 hour before trying again',
        'Check your OpenAI API quota and billing status',
        'Consider upgrading your OpenAI plan for higher limits',
        'Space out your video generation requests',
      ],
      canRetry: false,
    }
  }

  if (error.includes('authentication') || error.includes('unauthorized') || error.includes('API key')) {
    return {
      title: 'Authentication Error',
      description: 'There was a problem with API authentication.',
      troubleshooting: [
        'Contact support to verify your API key configuration',
        'Check if your OpenAI API key is still valid',
        'Ensure you have access to the Sora API',
        'Try logging out and logging back in',
      ],
      canRetry: false,
    }
  }

  if (error.includes('insufficient') || error.includes('balance') || error.includes('credits')) {
    return {
      title: 'Insufficient Credits',
      description: 'Your account does not have enough credits for video generation.',
      troubleshooting: [
        'Add credits to your OpenAI account',
        'Check your billing information is up to date',
        'Review your current usage and billing',
        'Contact support if you believe this is an error',
      ],
      canRetry: false,
    }
  }

  if (error.includes('content') || error.includes('policy') || error.includes('moderation')) {
    return {
      title: 'Content Policy Violation',
      description: 'The prompt may violate content policies.',
      troubleshooting: [
        'Review your prompt for potentially sensitive content',
        'Remove any references to prohibited subjects',
        'Revise the prompt to be more general',
        'Check OpenAI content policy guidelines',
      ],
      canRetry: true,
    }
  }

  if (error.includes('network') || error.includes('connection') || error.includes('fetch')) {
    return {
      title: 'Network Connection Error',
      description: 'Failed to connect to the Sora API.',
      troubleshooting: [
        'Check your internet connection',
        'Refresh the page and try again',
        'Disable any VPN or proxy that might interfere',
        'Try again in a few minutes',
      ],
      canRetry: true,
    }
  }

  if (error.includes('Job not found') || error.includes('404')) {
    return {
      title: 'Generation Job Not Found',
      description: 'The generation job could not be found in the Sora API.',
      troubleshooting: [
        'The job may have expired - try starting a new generation',
        'Use the reset button to clear the current job',
        'Check if the job was created successfully',
        'Contact support if the issue persists',
      ],
      canRetry: false,
    }
  }

  // Generic error
  return {
    title: 'Generation Failed',
    description: error || 'An unexpected error occurred during video generation.',
    troubleshooting: [
      'Try generating the video again',
      'Check your prompt for any unusual characters or formatting',
      'Refresh the page and try again',
      'If the problem persists, contact support',
    ],
    canRetry: true,
  }
}
