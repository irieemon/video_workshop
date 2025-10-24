'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { AgentRoundtable } from '@/components/agents/agent-roundtable'
import { StreamingRoundtable } from '@/components/agents/streaming-roundtable'
import { StreamingRoundtableModal } from '@/components/agents/streaming-roundtable-modal'
import { PromptOutput } from '@/components/videos/prompt-output'
import { AdvancedModeToggle } from '@/components/videos/advanced-mode-toggle'
import { EditablePromptField } from '@/components/videos/editable-prompt-field'
import { ShotListBuilder } from '@/components/videos/shot-list-builder'
import { AdditionalGuidance } from '@/components/videos/additional-guidance'
import { SeriesContextSelector } from '@/components/videos/series-context-selector'
import { Shot } from '@/lib/types/database.types'

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

export default function NewVideoPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [brief, setBrief] = useState('')
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok')
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [selectedSettings, setSelectedSettings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoundtableResult | null>(null)
  const [series, setSeries] = useState<any[]>([])
  const [useStreaming, setUseStreaming] = useState(true)
  const [streamingStarted, setStreamingStarted] = useState(false)
  const [pendingResult, setPendingResult] = useState<{
    finalPrompt: string
    suggestedShots: string
    conversationHistory?: any[]
    debateMessages?: any[]
  } | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  // Advanced Mode State
  const [advancedMode, setAdvancedMode] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [shotList, setShotList] = useState<Shot[]>([])
  const [additionalGuidance, setAdditionalGuidance] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<string>('')

  // Fetch series for this project
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        const data = await response.json()
        setSeries(data.series || [])
      } catch (err) {
        console.error('Failed to fetch series:', err)
      }
    }
    fetchSeries()
  }, [projectId])

  // Initialize edited prompt and shot list when result arrives
  useEffect(() => {
    if (result) {
      setEditedPrompt(result.optimizedPrompt)
      // Auto-populate shot list if AI provided suggestions
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

    // Use streaming mode by default
    if (useStreaming) {
      setStreamingStarted(true)
      setLoading(true)
      return
    }

    // Fallback to non-streaming mode
    setLoading(true)

    try {
      const response = await fetch('/api/agent/roundtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          platform,
          projectId,
          seriesId,
          selectedCharacters,
          selectedSettings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate prompt')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate prompt')
    } finally {
      setLoading(false)
    }
  }

  const handleStreamingComplete = (streamResult: {
    finalPrompt: string
    suggestedShots: string
    conversationHistory?: any[]
    debateMessages?: any[]
  }) => {
    // Store result but don't display yet - let user review conversation first
    setPendingResult(streamResult)
    setLoading(false)
  }

  const handleModalClose = () => {
    setStreamingStarted(false)

    // If we have pending results, show them now
    if (pendingResult) {
      setResult({
        discussion: {
          round1: [],
          round2: [],
        },
        detailedBreakdown: {
          scene_structure: '',
          visual_specs: '',
          audio: '',
          platform_optimization: '',
          hashtags: [],
        },
        optimizedPrompt: pendingResult.finalPrompt,
        characterCount: pendingResult.finalPrompt.length,
        hashtags: [],
        suggestedShots: parseSuggestedShots(pendingResult.suggestedShots),
      })
      // DON'T clear pendingResult - we need it for the Review Conversation feature
      // setPendingResult(null)
    }
  }

  // Parse suggested shots from AI text response
  const parseSuggestedShots = (shotsText: string): Shot[] => {
    // Simple parser - can be improved later
    const lines = shotsText.split('\n').filter(line => line.trim())
    const shots: Shot[] = []

    let currentShot: Partial<Shot> | null = null

    lines.forEach(line => {
      const trimmed = line.trim()

      // Detect shot number
      if (/^\d+\./.test(trimmed)) {
        if (currentShot) {
          shots.push(currentShot as Shot)
        }
        currentShot = {
          id: `shot-${shots.length + 1}`,
          shotNumber: shots.length + 1,
          description: trimmed.replace(/^\d+\.\s*/, ''),
          cameraAngle: '',
          cameraMovement: '',
          duration: '4s',
        }
      } else if (currentShot) {
        // Add to current shot description
        currentShot.description += ' ' + trimmed
      }
    })

    if (currentShot) {
      shots.push(currentShot as Shot)
    }

    return shots
  }

  const handleRegenerateWithEdits = async () => {
    setError(null)
    setRegenerating(true)

    try {
      const response = await fetch('/api/agent/roundtable/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          platform,
          projectId,
          seriesId,
          selectedCharacters,
          selectedSettings,
          userPromptEdits: advancedMode ? editedPrompt : undefined,
          shotList: advancedMode && shotList.length > 0 ? shotList : undefined,
          additionalGuidance: advancedMode && additionalGuidance ? additionalGuidance : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate prompt')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate prompt')
    } finally {
      setRegenerating(false)
    }
  }

  const handleAISuggestShots = async () => {
    if (!result) return

    setRegenerating(true)
    try {
      // Use the advanced API to regenerate with current context
      const response = await fetch('/api/agent/roundtable/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          platform,
          projectId,
          seriesId,
          selectedCharacters,
          selectedSettings,
          additionalGuidance: additionalGuidance || 'Regenerate shot list with improved detail',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate shots')
      }

      // Update only the shot list
      if (data.suggestedShots && data.suggestedShots.length > 0) {
        setShotList(data.suggestedShots)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate shots')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSaveVideo = async () => {
    if (!result) return

    const finalPrompt = advancedMode ? editedPrompt : result.optimizedPrompt
    const finalCharCount = finalPrompt.length

    setSaving(true)
    setError(null)

    try {
      // Step 1: Preparing data
      setSaveProgress('Preparing video data...')
      await new Promise(resolve => setTimeout(resolve, 300)) // Brief pause for UX

      // Step 2: Saving to database
      setSaveProgress('Saving video to database...')
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          seriesId,
          selectedCharacters,
          selectedSettings,
          title: brief.slice(0, 100),
          userBrief: brief,
          agentDiscussion: result.discussion,
          detailedBreakdown: result.detailedBreakdown,
          optimizedPrompt: finalPrompt,
          characterCount: finalCharCount,
          platform,
          hashtags: result.hashtags,
          user_edits: advancedMode
            ? {
                mode: 'advanced',
                iterations: 1,
                additional_guidance: additionalGuidance || undefined,
                edits: [
                  {
                    timestamp: new Date().toISOString(),
                    prompt_changes: editedPrompt !== result.optimizedPrompt ? editedPrompt : undefined,
                    shot_list: shotList.length > 0 ? shotList : undefined,
                    additional_guidance: additionalGuidance || undefined,
                  },
                ],
                final_version: {
                  prompt: finalPrompt,
                  shot_list: shotList.length > 0 ? shotList : undefined,
                  character_count: finalCharCount,
                },
              }
            : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save video')
      }

      // Step 3: Success
      setSaveProgress('Video saved successfully!')
      await new Promise(resolve => setTimeout(resolve, 500)) // Show success briefly

      router.push(`/dashboard/projects/${projectId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save video')
      setSaving(false)
      setSaveProgress('')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Project</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          {result && (
            <Button
              onClick={handleSaveVideo}
              size="sm"
              className="bg-sage-500 hover:bg-sage-700"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="container py-4 md:py-8 px-4 md:px-8">
        {/* Saving Progress Overlay */}
        {saving && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-sage-500 mb-4" />
                  <p className="text-lg font-medium mb-2">Saving Your Video</p>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {saveProgress || 'Processing...'}
                  </p>
                  <div className="w-full bg-sage-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-sage-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:gap-8 grid-cols-1 lg:grid-cols-[400px_1fr]">
          {/* Left Column: Input Form */}
          <div className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-sage-500" />
                  Video Brief
                </CardTitle>
                <CardDescription className="text-sm">
                  Describe your video idea for the AI film crew
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brief" className="text-sm">Brief Description *</Label>
                  <textarea
                    id="brief"
                    className="flex min-h-[120px] md:min-h-[150px] w-full rounded-md border border-input bg-background px-2 md:px-3 py-2 text-xs md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Example: Unboxing video for luxury skincare serum, Gen Z audience, need high engagement..."
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    disabled={loading || !!result}
                  />
                  <p className="text-xs text-muted-foreground">
                    Be as detailed as possible for better results
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Platform *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={platform === 'tiktok' ? 'default' : 'outline'}
                      onClick={() => setPlatform('tiktok')}
                      disabled={loading || !!result}
                      className={platform === 'tiktok' ? 'bg-sage-500 hover:bg-sage-700' : ''}
                    >
                      TikTok
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={platform === 'instagram' ? 'default' : 'outline'}
                      onClick={() => setPlatform('instagram')}
                      disabled={loading || !!result}
                      className={platform === 'instagram' ? 'bg-sage-500 hover:bg-sage-700' : ''}
                    >
                      Instagram
                    </Button>
                  </div>
                </div>

                {series.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="series" className="text-sm">Series (Optional)</Label>
                    <select
                      id="series"
                      className="flex h-9 md:h-10 w-full rounded-md border border-input bg-background px-2 md:px-3 py-2 text-xs md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={seriesId || ''}
                      onChange={(e) => {
                        setSeriesId(e.target.value || null)
                        // Reset selections when series changes
                        setSelectedCharacters([])
                        setSelectedSettings([])
                      }}
                      disabled={loading || !!result}
                    >
                      <option value="">One-off video</option>
                      {series.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {seriesId && (
                      <p className="text-xs text-muted-foreground">
                        Visual template will be applied
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Series Context Selection */}
            {seriesId && (
              <SeriesContextSelector
                seriesId={seriesId}
                selectedCharacters={selectedCharacters}
                selectedSettings={selectedSettings}
                onCharactersChange={setSelectedCharacters}
                onSettingsChange={setSelectedSettings}
                disabled={loading || !!result}
              />
            )}

            <Card>
              <CardContent className="space-y-3 md:space-y-4 pt-6">
                {error && (
                  <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                {!result && (
                  <Button
                    onClick={handleStartRoundtable}
                    disabled={loading || !brief.trim()}
                    className="w-full bg-sage-500 hover:bg-sage-700"
                    size="default"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                        <span className="text-sm md:text-base">AI Crew Collaborating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        <span className="text-sm md:text-base">Start Roundtable</span>
                      </>
                    )}
                  </Button>
                )}

                {result && (
                  <div className="p-3 bg-sage-50 border border-sage-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-sage-900 font-medium">
                        ✓ Roundtable complete! Review the results and save your video.
                      </p>
                      {pendingResult?.conversationHistory && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewModalOpen(true)}
                          className="text-xs"
                        >
                          Review Conversation
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Agent Discussion & Results */}
          <div className="space-y-4 md:space-y-6">
            {streamingStarted && (
              <StreamingRoundtableModal
                brief={brief}
                platform={platform}
                seriesId={seriesId || undefined}
                projectId={projectId}
                selectedCharacters={selectedCharacters}
                selectedSettings={selectedSettings}
                onComplete={handleStreamingComplete}
                onClose={handleModalClose}
                isComplete={!!pendingResult}
              />
            )}

            {reviewModalOpen && pendingResult && (() => {
              console.log('🎬 Opening review modal with pendingResult:', {
                hasPendingResult: !!pendingResult,
                conversationHistory: pendingResult.conversationHistory,
                debateMessages: pendingResult.debateMessages,
                historyLength: pendingResult.conversationHistory?.length,
                debateLength: pendingResult.debateMessages?.length,
              })
              return (
                <StreamingRoundtableModal
                  brief={brief}
                  platform={platform}
                  seriesId={seriesId || undefined}
                  projectId={projectId}
                  selectedCharacters={selectedCharacters}
                  selectedSettings={selectedSettings}
                  onComplete={() => {}}
                  onClose={() => setReviewModalOpen(false)}
                  isComplete={true}
                  reviewMode={true}
                  savedConversation={{
                    conversationHistory: pendingResult.conversationHistory || [],
                    debateMessages: pendingResult.debateMessages || [],
                  }}
                />
              )
            })()}

            {loading && !streamingStarted && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-sage-500 mb-4" />
                    <p className="text-lg font-medium mb-2">AI Film Crew Collaborating</p>
                    <p className="text-sm text-muted-foreground">
                      Your creative team is discussing the best approach...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                <AgentRoundtable
                  discussion={result.discussion}
                  onReviewClick={
                    pendingResult?.conversationHistory
                      ? () => setReviewModalOpen(true)
                      : undefined
                  }
                />

                {/* Advanced Mode Toggle */}
                <AdvancedModeToggle
                  enabled={advancedMode}
                  onChange={setAdvancedMode}
                  disabled={loading || regenerating}
                />

                {/* Advanced Mode Controls */}
                {advancedMode && (
                  <div className="space-y-6">
                    <EditablePromptField
                      value={editedPrompt}
                      originalValue={result.optimizedPrompt}
                      onChange={setEditedPrompt}
                      onRevert={() => setEditedPrompt(result.optimizedPrompt)}
                    />

                    <ShotListBuilder
                      shots={shotList}
                      onChange={setShotList}
                      onAISuggest={handleAISuggestShots}
                    />

                    <AdditionalGuidance
                      value={additionalGuidance}
                      onChange={setAdditionalGuidance}
                    />

                    {/* Regenerate Button */}
                    <Button
                      onClick={handleRegenerateWithEdits}
                      disabled={regenerating}
                      className="w-full bg-sage-500 hover:bg-sage-700"
                      size="lg"
                    >
                      {regenerating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Regenerating with your guidance...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5" />
                          Regenerate with Edits
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Standard Mode Output */}
                {!advancedMode && (
                  <PromptOutput
                    detailedBreakdown={result.detailedBreakdown}
                    optimizedPrompt={result.optimizedPrompt}
                    characterCount={result.characterCount}
                    hashtags={result.hashtags}
                  />
                )}
              </>
            )}

            {!loading && !result && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Enter your video brief and click &quot;Start Roundtable&quot; to begin
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
