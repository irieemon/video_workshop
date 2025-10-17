'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AgentRoundtable } from '@/components/agents/agent-roundtable'
import { PromptOutput } from '@/components/videos/prompt-output'

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
}

export default function NewVideoPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [brief, setBrief] = useState('')
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok')
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoundtableResult | null>(null)
  const [series, setSeries] = useState<any[]>([])

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
          seriesId,
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

  const handleSaveVideo = async () => {
    if (!result) return

    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          seriesId,
          title: brief.slice(0, 100),
          userBrief: brief,
          agentDiscussion: result.discussion,
          detailedBreakdown: result.detailedBreakdown,
          optimizedPrompt: result.optimizedPrompt,
          characterCount: result.characterCount,
          platform,
          hashtags: result.hashtags,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save video')
      }

      router.push(`/dashboard/projects/${projectId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save video')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between px-8">
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
          {result && (
            <Button onClick={handleSaveVideo} className="bg-sage-500 hover:bg-sage-700">
              Save Video
            </Button>
          )}
        </div>
      </div>

      <div className="container py-8 px-8">
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-sage-500" />
                  Video Brief
                </CardTitle>
                <CardDescription>
                  Describe your video idea for the AI film crew
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brief">Brief Description *</Label>
                  <textarea
                    id="brief"
                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Label>Platform *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={platform === 'tiktok' ? 'default' : 'outline'}
                      onClick={() => setPlatform('tiktok')}
                      disabled={loading || !!result}
                      className={platform === 'tiktok' ? 'bg-sage-500 hover:bg-sage-700' : ''}
                    >
                      TikTok
                    </Button>
                    <Button
                      type="button"
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
                    <Label htmlFor="series">Series (Optional)</Label>
                    <select
                      id="series"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={seriesId || ''}
                      onChange={(e) => setSeriesId(e.target.value || null)}
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
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        AI Crew Collaborating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Start Roundtable
                      </>
                    )}
                  </Button>
                )}

                {result && (
                  <div className="p-3 bg-sage-50 border border-sage-200 rounded-md">
                    <p className="text-sm text-sage-900 font-medium">
                      ✓ Roundtable complete! Review the results and save your video.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Agent Discussion & Results */}
          <div className="space-y-6">
            {loading && (
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
                <AgentRoundtable discussion={result.discussion} />
                <PromptOutput
                  detailedBreakdown={result.detailedBreakdown}
                  optimizedPrompt={result.optimizedPrompt}
                  characterCount={result.characterCount}
                  hashtags={result.hashtags}
                />
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
