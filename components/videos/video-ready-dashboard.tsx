'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { StepIndicator } from '@/components/ui/step-indicator'
import { PromptActionCard } from '@/components/videos/prompt-action-card'
import { SoraGenerationModal } from '@/components/videos/sora-generation-modal'
import { ApiKeyStatusBar } from '@/components/videos/api-key-status-bar'
import { OpenInSoraButton } from '@/components/videos/open-in-sora-button'
import { ShareExportMenu } from '@/components/videos/share-export-menu'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Share2,
  ChevronDown,
  Crown,
  FileText,
  Hash,
  Settings,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'

interface VideoReadyDashboardProps {
  video: {
    id: string
    title: string
    user_brief: string
    platform: string
    optimized_prompt: string
    detailed_breakdown: any
    character_count: number
    created_at: string
    series?: { name: string; is_system: boolean } | null
    sora_generation_settings?: {
      aspect_ratio?: string
      duration?: number
      resolution?: string
      model?: string
    }
  }
  hashtags: string[]
  subscriptionTier: 'free' | 'premium' | 'enterprise'
}

const STEPS = [
  { label: 'Brief' },
  { label: 'AI Discussion' },
  { label: 'Ready' },
]

export function VideoReadyDashboard({
  video,
  hashtags,
  subscriptionTier,
}: VideoReadyDashboardProps) {
  const router = useRouter()
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [specsExpanded, setSpecsExpanded] = useState(false)
  const [hashtagsExpanded, setHashtagsExpanded] = useState(false)
  const [soraModalOpen, setSoraModalOpen] = useState(false)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)

  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'enterprise'

  // Check if user has an API key configured
  const handleKeySelected = (keyId: string | null) => {
    setSelectedApiKeyId(keyId)
    setHasApiKey(!!keyId)
  }

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(video.optimized_prompt)
    setCopiedPrompt(true)
    toast.success('Prompt copied to clipboard!')
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleCopyHashtags = async () => {
    await navigator.clipboard.writeText(hashtags.join(' '))
    setCopiedHashtags(true)
    toast.success('Hashtags copied to clipboard!')
    setTimeout(() => setCopiedHashtags(false), 2000)
  }

  const handleGenerateWithSora = () => {
    // Allow generation if premium OR has BYOK configured
    if (isPremium || hasApiKey) {
      setSoraModalOpen(true)
    } else {
      setUpgradeDialogOpen(true)
    }
  }

  // Can generate if premium or has a valid API key
  const canGenerate = isPremium || hasApiKey

  // Get breakdown data with fallbacks
  const breakdown = video.detailed_breakdown || {}

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/videos/${video.id}/roundtable`}>
              <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Discussion</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>

          <StepIndicator steps={STEPS} currentStep={3} />
        </div>
      </div>

      <div className="container py-8 px-4 md:px-8 max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Your Video Prompt is Ready!
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            "{video.title.length > 60 ? video.title.substring(0, 60) + '...' : video.title}"
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline">{video.platform}</Badge>
            {video.series && !video.series.is_system && (
              <Badge variant="secondary">Series: {video.series.name}</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Created {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* API Key Status Bar (for free users) */}
        {!isPremium && (
          <ApiKeyStatusBar
            selectedKeyId={selectedApiKeyId}
            onKeySelected={handleKeySelected}
            className="mb-6"
          />
        )}

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Copy Prompt */}
          <PromptActionCard
            icon={copiedPrompt ? Check : Copy}
            title="Copy Prompt"
            description="Copy the optimized prompt to use in Sora or any AI video generator"
            buttonLabel={copiedPrompt ? 'Copied!' : 'Copy to Clipboard'}
            onClick={handleCopyPrompt}
            variant="primary"
          />

          {/* Generate with Sora */}
          <PromptActionCard
            icon={Sparkles}
            title="Generate with Sora"
            description={
              canGenerate
                ? "Create your video directly using OpenAI's Sora API"
                : "Upgrade to Premium or add your API key to generate"
            }
            buttonLabel="Generate Video"
            onClick={handleGenerateWithSora}
            variant="secondary"
            isPremiumLocked={!canGenerate}
            secondaryAction={
              !canGenerate
                ? {
                    label: 'Or use your own API key',
                    onClick: () => router.push('/dashboard/settings'),
                  }
                : undefined
            }
          />

          {/* Open in Sora */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardContent className="flex flex-col h-full p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ExternalLink className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Open in Sora</h3>
              <p className="mb-4 flex-1 text-sm text-muted-foreground">
                Open Sora.com with your prompt copied to clipboard
              </p>
              <OpenInSoraButton
                prompt={video.optimized_prompt}
                variant="outline"
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Share & Export */}
          <Card className="relative overflow-hidden transition-all hover:shadow-md">
            <CardContent className="flex flex-col h-full p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Share & Export</h3>
              <p className="mb-4 flex-1 text-sm text-muted-foreground">
                Share your prompt or export it in different formats
              </p>
              <ShareExportMenu
                video={{
                  id: video.id,
                  title: video.title,
                  optimizedPrompt: video.optimized_prompt,
                  hashtags: hashtags,
                  technicalSpecs: video.sora_generation_settings ? {
                    aspectRatio: video.sora_generation_settings.aspect_ratio,
                    duration: video.sora_generation_settings.duration,
                    resolution: video.sora_generation_settings.resolution,
                    style: video.sora_generation_settings.model,
                  } : undefined,
                  createdAt: video.created_at,
                  platform: video.platform,
                }}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          {/* View Prompt */}
          <Collapsible open={promptExpanded} onOpenChange={setPromptExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      View Optimized Prompt
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        promptExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {video.optimized_prompt}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground text-right">
                    {video.character_count || video.optimized_prompt.length} characters
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Technical Specs */}
          <Collapsible open={specsExpanded} onOpenChange={setSpecsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      View Technical Specifications
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        specsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {breakdown.format_and_look && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Format & Look</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.format_and_look}
                      </p>
                    </div>
                  )}
                  {breakdown.lenses_and_filtration && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Lenses & Filtration</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.lenses_and_filtration}
                      </p>
                    </div>
                  )}
                  {breakdown.grade_palette && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Grade / Palette</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.grade_palette}
                      </p>
                    </div>
                  )}
                  {breakdown.lighting_atmosphere && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Lighting & Atmosphere</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.lighting_atmosphere}
                      </p>
                    </div>
                  )}
                  {breakdown.location_framing && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Location & Framing</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.location_framing}
                      </p>
                    </div>
                  )}
                  {breakdown.shot_list_summary && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Shot List Summary</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.shot_list_summary}
                      </p>
                    </div>
                  )}
                  {breakdown.camera_notes && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Camera Notes</h4>
                      <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {breakdown.camera_notes}
                      </p>
                    </div>
                  )}
                  {Object.keys(breakdown).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No technical specifications available.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Hashtags */}
          <Collapsible open={hashtagsExpanded} onOpenChange={setHashtagsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      View Hashtags ({hashtags.length})
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        hashtagsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {hashtags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyHashtags}
                    className="w-full"
                  >
                    {copiedHashtags ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy All Hashtags
                      </>
                    )}
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* Sora Generation Modal */}
      {canGenerate && (
        <SoraGenerationModal
          open={soraModalOpen}
          onClose={() => setSoraModalOpen(false)}
          videoId={video.id}
          videoTitle={video.title}
          finalPrompt={video.optimized_prompt}
          userApiKeyId={hasApiKey && !isPremium ? selectedApiKeyId : undefined}
        />
      )}

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Premium Feature
            </DialogTitle>
            <DialogDescription>
              Sora video generation is available for Premium and Enterprise users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-950/30 dark:to-sage-900/30 p-4 border border-sage-200 dark:border-sage-800">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sage-600" />
                Premium Benefits
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>Unlimited AI-powered video generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>Priority generation queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>HD video exports</span>
                </li>
              </ul>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Or add your own OpenAI API key in settings</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUpgradeDialogOpen(false)
                router.push('/dashboard/settings?tab=api-keys')
              }}
            >
              Add API Key
            </Button>
            <Button
              asChild
              className="bg-sage-600 hover:bg-sage-700"
            >
              <Link href="/dashboard/settings?tab=subscription">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
