'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface CreateSegmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeId: string
  seriesId: string
  episodeTitle: string
  screenplay: string
  onSuccess: () => void
}

export function CreateSegmentsDialog({
  open,
  onOpenChange,
  episodeId,
  seriesId,
  episodeTitle,
  screenplay,
  onSuccess
}: CreateSegmentsDialogProps) {
  const [targetDuration, setTargetDuration] = useState(15)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [isProcessingLong, setIsProcessingLong] = useState(false)

  const progressSteps = [
    'Validating screenplay structure...',
    'Analyzing scenes and dialogue...',
    'Identifying natural break points...',
    'Creating segment metadata...',
    'Linking segments with continuity...',
    'Finalizing segment creation...'
  ]

  const handleCreate = async () => {
    let progressInterval: NodeJS.Timeout | null = null
    let longProcessingTimeout: NodeJS.Timeout | null = null

    try {
      console.log('[DEBUG] handleCreate started')
      setLoading(true)
      setError(null)
      setSuccess(false)
      setProgressStep(0)
      setIsProcessingLong(false)

      console.log('[DEBUG] Request params:', {
        episodeId,
        targetDuration,
        url: '/api/episodes/create-segments'
      })

      // Start progress simulation (each step ~5 seconds)
      let currentStep = 0
      progressInterval = setInterval(() => {
        currentStep++
        if (currentStep < progressSteps.length) {
          setProgressStep(currentStep)
          setProgressMessage(progressSteps[currentStep])
        } else {
          // Keep showing final step with pulsing animation
          setProgressMessage('Still processing, this may take a minute...')
        }
      }, 5000)

      // Set initial message
      setProgressMessage(progressSteps[0])

      // Show extended processing message after 30 seconds
      longProcessingTimeout = setTimeout(() => {
        setIsProcessingLong(true)
      }, 30000)

      // Add timeout to fetch (2 minutes max)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('[DEBUG] Request timeout after 2 minutes')
        controller.abort()
      }, 120000)

      console.log('[DEBUG] Sending POST request...')
      const startTime = Date.now()

      const response = await fetch('/api/episodes/create-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episodeId,
          targetDuration: targetDuration
        }),
        signal: controller.signal
      })

      const requestDuration = Date.now() - startTime
      console.log(`[DEBUG] Response received in ${requestDuration}ms, status: ${response.status}`)

      clearTimeout(timeoutId)

      // Clear progress simulation
      if (progressInterval) clearInterval(progressInterval)
      if (longProcessingTimeout) clearTimeout(longProcessingTimeout)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create segments')
      }

      const data = await response.json()
      setProgressStep(progressSteps.length - 1)
      setProgressMessage(progressSteps[progressSteps.length - 1])

      // Brief delay to show final step
      await new Promise(resolve => setTimeout(resolve, 500))

      setSuccess(true)
      setProgressMessage('')

      // Wait briefly to show success message
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      console.error('Error creating segments:', err)

      // Clear intervals on error
      if (progressInterval) clearInterval(progressInterval)
      if (longProcessingTimeout) clearTimeout(longProcessingTimeout)

      // Handle timeout errors
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The screenplay may be too long. Please try with a longer segment duration or contact support.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create segments')
      }

      setProgressMessage('')
      setIsProcessingLong(false)
    } finally {
      setLoading(false)
    }
  }

  const estimatedSegments = Math.ceil(screenplay.length / (targetDuration * 100))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Video Segments</DialogTitle>
          <DialogDescription>
            Break down "{episodeTitle}" into manageable video segments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="duration">Target Segment Duration</Label>
              <span className="text-sm font-medium">{targetDuration}s</span>
            </div>
            <Slider
              id="duration"
              min={5}
              max={30}
              step={5}
              value={[targetDuration]}
              onValueChange={([value]) => setTargetDuration(value)}
              disabled={loading || success}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Each segment will target approximately {targetDuration} seconds of video content
            </p>
          </div>

          {/* Estimated Segments */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Segments</span>
              <span className="text-2xl font-bold">{estimatedSegments}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on screenplay length and target duration
            </p>
          </div>

          {/* Progress Indicator */}
          {loading && progressMessage && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{progressMessage}</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(((progressStep + 1) / progressSteps.length) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {progressStep < progressSteps.length ? (
                    <>Step {progressStep + 1} of {progressSteps.length}</>
                  ) : (
                    <>Processing...</>
                  )}
                </p>
                {isProcessingLong && (
                  <p className="text-xs text-amber-600 font-medium">
                    Taking longer than expected...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Alert */}
          {!loading && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Note:</strong> The AI will analyze your screenplay and automatically:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Identify natural narrative breaks</li>
                  <li>Extract dialogue and action beats</li>
                  <li>Determine optimal transition points</li>
                  <li>Generate continuity notes between segments</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Segments created successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || success}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success ? 'Created!' : 'Create Segments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
