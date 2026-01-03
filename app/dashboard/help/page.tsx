'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Search,
  Play,
  Video,
  ListVideo,
  Sparkles,
  Settings,
  Users,
  MapPin,
  Clapperboard,
  Camera,
  Palette,
  Wand2,
  CheckCircle2,
  Clock,
  BookOpen,
  Lightbulb,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { useTour } from '@/components/onboarding'
import { tourDefinitions, type TourId } from '@/components/onboarding/tours/tour-definitions'
import { cn } from '@/lib/utils'
import { SiteFooter } from '@/components/layout/site-footer'

// ============================================================
// HELP PAGE COMPONENT
// ============================================================

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { startTour, isTourCompleted } = useTour()

  const handleStartTour = (tourId: TourId) => {
    startTour(tourId)
  }

  // Filter content based on search
  const filterContent = (content: string) => {
    if (!searchQuery) return true
    return content.toLowerCase().includes(searchQuery.toLowerCase())
  }

  return (
    <div className="container max-w-6xl py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help & Documentation</h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to master Scenra Studio
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          className="pl-10 h-12"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger
            value="getting-started"
            className="flex flex-col items-center gap-1 py-3 text-white/70 data-[state=active]:text-gray-900"
          >
            <Play className="h-4 w-4" />
            <span className="text-xs">Getting Started</span>
          </TabsTrigger>
          <TabsTrigger
            value="videos"
            className="flex flex-col items-center gap-1 py-3 text-white/70 data-[state=active]:text-gray-900"
          >
            <Video className="h-4 w-4" />
            <span className="text-xs">Videos</span>
          </TabsTrigger>
          <TabsTrigger
            value="series"
            className="flex flex-col items-center gap-1 py-3 text-white/70 data-[state=active]:text-gray-900"
          >
            <ListVideo className="h-4 w-4" />
            <span className="text-xs">Series</span>
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="flex flex-col items-center gap-1 py-3 text-white/70 data-[state=active]:text-gray-900"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs">AI Features</span>
          </TabsTrigger>
        </TabsList>

        {/* Getting Started Tab */}
        <TabsContent value="getting-started" className="space-y-6">
          {/* Quick Start Tours */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-scenra-amber" />
              Interactive Tours
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.values(tourDefinitions)
                .filter((tour, index, self) =>
                  index === self.findIndex(t => t.id === tour.id)
                )
                .filter(tour => filterContent(tour.title + tour.description))
                .map(tour => {
                  const completed = isTourCompleted(tour.id)
                  return (
                    <Card
                      key={tour.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        completed && 'border-green-500/30'
                      )}
                      onClick={() => handleStartTour(tour.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {tour.title}
                            {completed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {tour.estimatedTime}
                          </Badge>
                        </div>
                        <CardDescription>{tour.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          variant={completed ? 'outline' : 'default'}
                          size="sm"
                          className={cn(
                            !completed && 'bg-scenra-amber hover:bg-scenra-amber/90 text-black'
                          )}
                        >
                          {completed ? 'Replay Tour' : 'Start Tour'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </section>

          {/* Quick Tips */}
          {filterContent('quick tips workflow') && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-scenra-amber" />
                Quick Tips
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <TipCard
                  icon={Video}
                  title="Start Simple"
                  description="Begin with a single video to learn the workflow before creating complex series."
                />
                <TipCard
                  icon={Sparkles}
                  title="Be Specific"
                  description="The more detail you provide in your brief, the better the AI can optimize your prompt."
                />
                <TipCard
                  icon={ListVideo}
                  title="Use Series"
                  description="For consistent characters and settings across videos, always use the Series feature."
                />
              </div>
            </section>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-scenra-amber" />
              Video Creation Guide
            </h2>

            <Accordion type="single" collapsible className="w-full">
              {filterContent('creating new video') && (
                <AccordionItem value="create-video">
                  <AccordionTrigger>Creating a New Video</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Navigate to <strong>Videos</strong> in the sidebar</li>
                      <li>Click the <strong>New Video</strong> button</li>
                      <li>Enter a descriptive <strong>title</strong> for your video</li>
                      <li>Write your <strong>creative brief</strong> - describe what you want in the video</li>
                      <li>Select your <strong>target platform</strong> (TikTok, YouTube, etc.)</li>
                      <li>Optionally link to a <strong>Series</strong> for character/setting consistency</li>
                      <li>Click <strong>Generate with AI Film Crew</strong></li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('video brief creative description') && (
                <AccordionItem value="writing-brief">
                  <AccordionTrigger>Writing Effective Video Briefs</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>A good video brief should include:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Setting:</strong> Where does the scene take place?</li>
                      <li><strong>Characters:</strong> Who is in the scene? What do they look like?</li>
                      <li><strong>Actions:</strong> What is happening? What movements or activities?</li>
                      <li><strong>Mood:</strong> What feeling should the video evoke?</li>
                      <li><strong>Visual Style:</strong> Any specific aesthetic preferences?</li>
                    </ul>
                    <p className="mt-3 text-muted-foreground">
                      <strong>Example:</strong> "A young woman with red hair walks through a neon-lit
                      Tokyo street at night. Rain is falling. She looks up at the glowing signs with
                      wonder. Cyberpunk aesthetic with rich purples and blues."
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('platform optimization tiktok youtube') && (
                <AccordionItem value="platforms">
                  <AccordionTrigger>Platform Optimization</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>The AI optimizes prompts differently for each platform:</p>
                    <ul className="list-disc pl-4 space-y-2">
                      <li><strong>TikTok:</strong> Fast pacing, attention-grabbing opening, vertical framing</li>
                      <li><strong>YouTube:</strong> Cinematic quality, longer narrative arcs, horizontal framing</li>
                      <li><strong>Instagram Reels:</strong> Vibrant colors, quick cuts, vertical format</li>
                      <li><strong>Twitter/X:</strong> Punchy, memorable moments, square or vertical</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </section>
        </TabsContent>

        {/* Series Tab */}
        <TabsContent value="series" className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ListVideo className="h-5 w-5 text-scenra-amber" />
              Series Management
            </h2>

            <Accordion type="single" collapsible className="w-full">
              {filterContent('what is series') && (
                <AccordionItem value="what-is-series">
                  <AccordionTrigger>What is a Series?</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>
                      A Series is a collection of related videos that share consistent characters,
                      settings, and visual style. This is essential for:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Episodic content (ongoing stories)</li>
                      <li>Character-driven narratives</li>
                      <li>Brand consistency across videos</li>
                      <li>Building a recognizable visual identity</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('characters appearance consistency') && (
                <AccordionItem value="characters">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Managing Characters
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>Characters ensure visual consistency across all videos in a series:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Physical Appearance:</strong> Hair, eyes, skin tone, body type</li>
                      <li><strong>Default Clothing:</strong> Typical outfit when not specified</li>
                      <li><strong>Distinctive Features:</strong> Scars, accessories, unique traits</li>
                      <li><strong>Personality Notes:</strong> How they move and express themselves</li>
                    </ul>
                    <p className="mt-3 text-muted-foreground">
                      When you select a character for a video, their exact description is locked
                      and used by the AI to maintain consistency.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('settings locations environment') && (
                <AccordionItem value="settings">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Managing Settings
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>Settings are reusable locations for your videos:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Environment:</strong> Indoor/outdoor, urban/nature, time of day</li>
                      <li><strong>Atmosphere:</strong> Lighting, weather, mood</li>
                      <li><strong>Key Details:</strong> Notable objects, architecture, colors</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('episodes organization') && (
                <AccordionItem value="episodes">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Clapperboard className="h-4 w-4" />
                      Organizing Episodes
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>
                      Episodes help organize videos within a series into narrative groups:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Each episode can contain multiple videos/scenes</li>
                      <li>Episodes maintain their own ordering</li>
                      <li>Perfect for multi-part stories or themed collections</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </section>
        </TabsContent>

        {/* AI Features Tab */}
        <TabsContent value="ai" className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-scenra-amber" />
              AI Film Crew
            </h2>

            {/* Agent Overview */}
            <div className="grid gap-4 md:grid-cols-5 mb-6">
              <AgentCard
                icon={Clapperboard}
                name="Director"
                specialty="Story & Vision"
                description="Guides overall narrative direction and creative vision"
              />
              <AgentCard
                icon={Camera}
                name="Cinematographer"
                specialty="Visual Composition"
                description="Camera angles, movements, and framing"
              />
              <AgentCard
                icon={Wand2}
                name="Editor"
                specialty="Pacing & Flow"
                description="Timing, transitions, and rhythm"
              />
              <AgentCard
                icon={Palette}
                name="Colorist"
                specialty="Color & Mood"
                description="Color grading and visual atmosphere"
              />
              <AgentCard
                icon={Sparkles}
                name="VFX Artist"
                specialty="Visual Effects"
                description="Special effects and enhancements"
              />
            </div>

            <Accordion type="single" collapsible className="w-full">
              {filterContent('how roundtable works') && (
                <AccordionItem value="how-it-works">
                  <AccordionTrigger>How the AI Roundtable Works</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>You provide a creative brief describing your video</li>
                      <li>Five AI agents analyze your brief from their specialty</li>
                      <li>Each agent contributes their domain expertise</li>
                      <li>The system synthesizes all input into an optimized Sora prompt</li>
                      <li>You can review and edit the final prompt before use</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('consultations usage quota') && (
                <AccordionItem value="consultations">
                  <AccordionTrigger>AI Consultations & Usage</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>
                      Each time you generate prompts with the AI Film Crew, it uses one
                      <strong> AI Consultation</strong> from your monthly quota.
                    </p>
                    <ul className="list-disc pl-4 space-y-1 mt-3">
                      <li><strong>Free accounts:</strong> 10 consultations per month</li>
                      <li><strong>Premium accounts:</strong> Unlimited consultations</li>
                    </ul>
                    <p className="mt-3 text-muted-foreground">
                      Your remaining consultations are shown in the sidebar. Upgrade to Premium
                      for unlimited access.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}

              {filterContent('shot list breakdown') && (
                <AccordionItem value="shot-list">
                  <AccordionTrigger>Understanding Shot Lists</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>
                      The AI generates a detailed shot list with each prompt, including:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Shot Type:</strong> Wide, medium, close-up, etc.</li>
                      <li><strong>Camera Movement:</strong> Pan, tilt, dolly, static, etc.</li>
                      <li><strong>Duration:</strong> Suggested length for each shot</li>
                      <li><strong>Description:</strong> What happens in each shot</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </section>
        </TabsContent>
      </Tabs>

      {/* Legal Footer */}
      <div className="mt-12 -mx-4 md:-mx-6">
        <SiteFooter />
      </div>
    </div>
  )
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

interface TipCardProps {
  icon: React.ElementType
  title: string
  description: string
}

function TipCard({ icon: Icon, title, description }: TipCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="p-2 w-fit rounded-lg bg-scenra-amber/10 mb-2">
          <Icon className="h-5 w-5 text-scenra-amber" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface AgentCardProps {
  icon: React.ElementType
  name: string
  specialty: string
  description: string
}

function AgentCard({ icon: Icon, name, specialty, description }: AgentCardProps) {
  return (
    <Card className="text-center">
      <CardContent className="pt-6">
        <div className="mx-auto p-3 w-fit rounded-full bg-scenra-amber/10 mb-3">
          <Icon className="h-6 w-6 text-scenra-amber" />
        </div>
        <h3 className="font-medium text-sm">{name}</h3>
        <p className="text-xs text-scenra-amber mt-1">{specialty}</p>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  )
}
