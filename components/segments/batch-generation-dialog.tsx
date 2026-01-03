'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle, CheckCircle2, PlayCircle, PartyPopper } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ContinuityReportViewer } from './continuity-report-viewer'
import { useConfetti } from '@/lib/hooks/use-confetti'

interface BatchGenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeId: string
  seriesId: string
  onSuccess: () => void
}

interface GenerationProgress {
  current: number
  total: number
  status: 'pending' | 'generating' | 'complete' | 'error'
}

interface ContinuityReport {
  totalSegments: number
  validatedSegments: number
  averageScore: number
  issuesByType: Record<string, number>
  issuesBySeverity: Record<string, number>
  segmentsWithIssues: number
  validations: any[]
}

export function BatchGenerationDialog({
  open,
  onOpenChange,
  episodeId,
  seriesId,
  onSuccess
}: BatchGenerationDialogProps) {
  const [platform, setPlatform] = useState<string>('tiktok')
  const [anchorInterval, setAnchorInterval] = useState(3)
  const [validateContinuity, setValidateContinuity] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [continuityReport, setContinuityReport] = useState<ContinuityReport | null>(null)
  const [segmentGroupId, setSegmentGroupId] = useState<string | null>(null)
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false)

  const supabase = createClient()
  const { celebrate } = useConfetti()

  // Poll for progress updates
  useEffect(() => {
    if (!segmentGroupId || !loading) return

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('segment_groups')
          .select('status, completed_segments, total_segments')
          .eq('id', segmentGroupId)
          .single()

        if (data) {
          setProgress({
            current: data.completed_segments || 0,
            total: data.total_segments || 0,
            status: data.status as any
          })

          if (data.status === 'complete' || data.status === 'error') {
            clearInterval(pollInterval)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [segmentGroupId, loading])

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError(null)
      setProgress(null)
      setContinuityReport(null)

      // First, get or create segment group
      const { data: groupData, error: groupError } = await supabase
        .from('segment_groups')
        .select('id')
        .eq('episode_id', episodeId)
        .maybeSingle()

      if (groupError) throw groupError

      if (!groupData) {
        setError('No segment group found. Please create segments first.')
        setLoading(false)
        return
      }

      setSegmentGroupId(groupData.id)

      // Start batch generation
      const response = await fetch(`/api/segment-groups/${groupData.id}/generate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          anchorPointInterval: anchorInterval,
          validateContinuityBefore: validateContinuity
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start batch generation')
      }

      const data = await response.json()

      setContinuityReport(data.continuityReport)
      setProgress({
        current: data.videos.length,
        total: data.videos.length,
        status: 'complete'
      })

      // Trigger celebration animation
      if (!hasTriggeredCelebration) {
        setHasTriggeredCelebration(true)
        celebrate()
      }

      // Wait briefly before calling success
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      console.error('Error starting batch generation:', err)
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setLoading(false)
    }
  }

  const isGenerating = loading && progress !== null
  const isComplete = progress?.status === 'complete'
  const progressPercentage = progress
    ? (progress.current / progress.total) * 100
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Video Generation</DialogTitle>
          <DialogDescription>
            Generate all segments sequentially with context propagation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Platform Selection */}
          {!loading && (
            <div className="space-y-2">
              <Label htmlFor="platform">Target Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok (9:16)</SelectItem>
                  <SelectItem value="youtube">YouTube Shorts (9:16)</SelectItem>
                  <SelectItem value="instagram">Instagram Reels (9:16)</SelectItem>
                  <SelectItem value="youtube_landscape">YouTube (16:9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Anchor Point Interval */}
          {!loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="anchor">Anchor Point Interval</Label>
                <span className="text-sm font-medium">Every {anchorInterval} segments</span>
              </div>
              <Slider
                id="anchor"
                min={2}
                max={5}
                step={1}
                value={[anchorInterval]}
                onValueChange={([value]) => setAnchorInterval(value)}
                disabled={false}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Context will be refreshed every {anchorInterval} segments to prevent drift
              </p>
            </div>
          )}

          {/* Generation Progress */}
          {progress && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isComplete && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <PartyPopper className="h-4 w-4 text-yellow-500 animate-bounce" />
                    </>
                  )}
                  <span className="font-medium">
                    {isComplete ? 'Generation Complete!' : 'Generating Segments'}
                  </span>
                </div>
                <Badge variant={isComplete ? 'default' : 'secondary'}>
                  {progress.current} / {progress.total}
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {isComplete
                  ? `Successfully generated ${progress.total} video segments`
                  : `Processing segment ${progress.current} of ${progress.total}...`}
              </p>
            </div>
          )}

          {/* Continuity Report */}
          {continuityReport && (
            <ContinuityReportViewer report={continuityReport} />
          )}

          {/* Info Alert */}
          {!loading && !progress && (
            <Alert>
              <PlayCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Batch Generation Process:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Segments are generated sequentially to maintain continuity</li>
                  <li>Visual state from each segment flows to the next</li>
                  <li>Continuity validation runs before each generation</li>
                  <li>Anchor points refresh context periodically</li>
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            {isComplete ? 'Close' : 'Cancel'}
          </Button>
          {!isComplete && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Generation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
