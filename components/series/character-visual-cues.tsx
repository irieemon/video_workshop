'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { VisualCue, VisualCueType } from '@/lib/types/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Upload, X, ImageIcon, User, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CharacterVisualCuesProps {
  seriesId: string
  characterId: string
  characterName: string
  primaryImageUrl?: string | null
  visualCues?: VisualCue[]
  onUpdate: () => void
}

const VISUAL_CUE_TYPES: { value: VisualCueType; label: string }[] = [
  { value: 'full-body', label: 'Full Body' },
  { value: 'face', label: 'Face/Portrait' },
  { value: 'costume', label: 'Costume/Outfit' },
  { value: 'expression', label: 'Expression' },
  { value: 'other', label: 'Other' },
]

const TYPE_COLORS: Record<VisualCueType, string> = {
  'full-body': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  face: 'bg-green-500/10 text-green-700 dark:text-green-400',
  costume: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  expression: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  other: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
}

export function CharacterVisualCues({
  seriesId,
  characterId,
  characterName,
  primaryImageUrl,
  visualCues = [],
  onUpdate,
}: CharacterVisualCuesProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<VisualCueType>('full-body')
  const [uploadCaption, setUploadCaption] = useState('')
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [deletingPrimary, setDeletingPrimary] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (isPrimary: boolean) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      await uploadImage(file, isPrimary)
    }

    input.click()
  }

  const uploadImage = async (file: File, isPrimary: boolean) => {
    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('isPrimary', isPrimary.toString())

      if (!isPrimary) {
        formData.append('caption', uploadCaption)
        formData.append('type', uploadType)
      }

      const response = await fetch(
        `/api/series/${seriesId}/characters/${characterId}/upload-visual-cue`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      // Reset form
      setUploadCaption('')
      setUploadType('full-body')

      // Refresh data
      onUpdate()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (url: string, isPrimary: boolean) => {
    try {
      const response = await fetch(
        `/api/series/${seriesId}/characters/${characterId}/upload-visual-cue?url=${encodeURIComponent(
          url
        )}&isPrimary=${isPrimary}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      setDeletingUrl(null)
      setDeletingPrimary(false)
      onUpdate()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAnalyzeImage = async () => {
    try {
      setAnalyzing(true)
      setError(null)

      const response = await fetch(`/api/series/${seriesId}/characters/${characterId}/analyze-image`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const result = await response.json()
      console.log('Analysis result:', result)

      // Store result to display in modal
      setAnalysisResult(result)

      onUpdate()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* AI Analysis Results */}
      {analysisResult && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  AI Analysis Complete
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnalysisResult(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-muted-foreground">Confidence:</span>
                  <Badge variant="secondary" className="ml-2">
                    {analysisResult.analysis.confidence}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Images Analyzed:</span>
                  <span className="ml-2 font-semibold">{analysisResult.analysis.images_analyzed}</span>
                </div>
              </div>

              {analysisResult.analysis.notes && (
                <div>
                  <span className="font-medium text-muted-foreground">Notes:</span>
                  <p className="mt-1 text-sm">{analysisResult.analysis.notes}</p>
                </div>
              )}

              {analysisResult.character?.visual_fingerprint && (
                <div className="pt-3 border-t">
                  <span className="font-medium text-muted-foreground mb-2 block">Extracted Features:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(analysisResult.character.visual_fingerprint)
                      .filter(([_, value]) => value)
                      .map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                These characteristics have been saved to the character profile and will be used for consistency across videos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Reference Image */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Primary Reference Image
          </h3>
          {(primaryImageUrl || (visualCues && visualCues.length > 0)) && (
            <Button
              onClick={handleAnalyzeImage}
              disabled={analyzing || uploading}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {analyzing ? 'Analyzing...' : 'AI Analyze Image'}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Main visual reference for {characterName}'s appearance. AI will auto-analyze to extract physical characteristics.
        </p>

        {primaryImageUrl ? (
          <Card className="relative overflow-hidden max-w-md">
            <CardContent className="p-4">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={primaryImageUrl}
                  alt={`${characterName} primary reference`}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  setDeletingUrl(primaryImageUrl)
                  setDeletingPrimary(true)
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remove Primary Image
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => handleFileSelect(true)}
            disabled={uploading}
            variant="outline"
            className="w-full max-w-md h-32 border-dashed"
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8" />
              <span>
                {uploading ? 'Uploading...' : 'Upload Primary Reference Image'}
              </span>
              <span className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF (Max 10MB)
              </span>
            </div>
          </Button>
        )}
      </div>

      {/* Additional Visual Cues */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Additional Visual Cues
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Specific references for different angles, expressions, or details
        </p>

        {/* Upload Form */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cue-type">Reference Type</Label>
                  <Select value={uploadType} onValueChange={(v) => setUploadType(v as VisualCueType)}>
                    <SelectTrigger id="cue-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUAL_CUE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cue-caption">Caption</Label>
                  <Input
                    id="cue-caption"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="e.g., Front view, Smiling"
                  />
                </div>
              </div>

              <Button
                onClick={() => handleFileSelect(false)}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Visual Cue'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Cues Grid */}
        {visualCues.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No additional visual cues yet.</p>
            <p className="text-sm mt-2">Upload specific reference images to maintain visual consistency.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visualCues.map((cue, index) => (
              <Card key={index} className="overflow-hidden group relative">
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    <Image
                      src={cue.url}
                      alt={cue.caption || `Visual cue ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeletingUrl(cue.url)
                          setDeletingPrimary(false)
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <Badge className={TYPE_COLORS[cue.type]} variant="secondary">
                      {VISUAL_CUE_TYPES.find((t) => t.value === cue.type)?.label}
                    </Badge>
                    {cue.caption && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cue.caption}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUrl} onOpenChange={() => setDeletingUrl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visual Reference</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deletingPrimary ? 'primary' : ''} visual reference image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUrl && handleDelete(deletingUrl, deletingPrimary)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
