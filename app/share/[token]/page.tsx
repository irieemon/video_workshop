import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Sparkles, ExternalLink } from 'lucide-react'
import { SharePageClient } from './share-page-client'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()

  const { data: video } = await supabase
    .from('videos')
    .select('title, optimized_prompt')
    .eq('share_token', token)
    .eq('is_public', true)
    .single()

  if (!video) {
    return {
      title: 'Prompt Not Found | Scenra',
      description: 'This shared prompt could not be found or is no longer available.',
    }
  }

  const description = video.optimized_prompt
    ? video.optimized_prompt.substring(0, 160) + '...'
    : 'View this AI-generated video prompt on Scenra'

  return {
    title: `${video.title || 'Shared Prompt'} | Scenra`,
    description,
    openGraph: {
      title: video.title || 'Shared Video Prompt',
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: video.title || 'Shared Video Prompt',
      description,
    },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Fetch the shared video
  const { data: video, error } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      optimized_prompt,
      hashtags,
      target_platform,
      sora_generation_settings,
      created_at,
      shared_at
    `)
    .eq('share_token', token)
    .eq('is_public', true)
    .single()

  if (error || !video) {
    notFound()
  }

  const specs = video.sora_generation_settings || {}
  const hashtags = video.hashtags || []
  const sharedDate = video.shared_at
    ? new Date(video.shared_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <span className="font-semibold text-lg">Scenra</span>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Create your own prompt →
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Title Section */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            Shared Prompt
          </Badge>
          <h1 className="text-3xl font-bold mb-2">
            {video.title || 'Video Prompt'}
          </h1>
          <p className="text-muted-foreground">
            {video.target_platform && `For ${video.target_platform} • `}
            {sharedDate && `Shared ${sharedDate}`}
          </p>
        </div>

        {/* Prompt Card */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Optimized Prompt</CardTitle>
            <SharePageClient prompt={video.optimized_prompt} />
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-violet-500">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {video.optimized_prompt}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technical Specs */}
        {Object.keys(specs).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {specs.aspect_ratio && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      Aspect Ratio
                    </p>
                    <p className="font-medium">{specs.aspect_ratio}</p>
                  </div>
                )}
                {specs.duration && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      Duration
                    </p>
                    <p className="font-medium">{specs.duration}s</p>
                  </div>
                )}
                {specs.resolution && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      Resolution
                    </p>
                    <p className="font-medium">{specs.resolution}</p>
                  </div>
                )}
                {specs.model && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      Model
                    </p>
                    <p className="font-medium">{specs.model}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Suggested Hashtags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline" className="bg-violet-50 dark:bg-violet-950">
                    #{tag.replace(/^#/, '')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-semibold mb-2">
              Create Your Own Video Prompts
            </h3>
            <p className="text-violet-100 mb-4">
              Use AI to generate optimized prompts for Sora, Runway, and more.
            </p>
            <a href="/signup">
              <Button variant="secondary" size="lg">
                Get Started Free
              </Button>
            </a>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Scenra. AI-powered video prompt generation.</p>
        </div>
      </footer>
    </div>
  )
}
