'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  HelpCircle,
  Play,
  BookOpen,
  Video,
  ListVideo,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { useTour } from './TourProvider'
import { tourDefinitions, type TourId } from './tours/tour-definitions'
import { cn } from '@/lib/utils'

// ============================================================
// HELP MODAL COMPONENT
// ============================================================

interface HelpModalProps {
  trigger?: React.ReactNode
}

export function HelpModal({ trigger }: HelpModalProps) {
  const [open, setOpen] = useState(false)
  const { startTour, isTourCompleted, resetTourProgress } = useTour()

  const handleStartTour = (tourId: TourId) => {
    setOpen(false)
    // Small delay to let dialog close animation complete
    setTimeout(() => {
      startTour(tourId)
    }, 150)
  }

  const handleResetProgress = () => {
    resetTourProgress()
  }

  const tours = Object.values(tourDefinitions).filter(
    (tour, index, self) =>
      // Deduplicate by id (dashboard-overview is alias for welcome)
      index === self.findIndex(t => t.id === tour.id)
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-scenra-amber" />
            Help & Learning Center
          </DialogTitle>
          <DialogDescription>
            Explore guided tours and documentation to master Scenra Studio
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tours" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tours" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Guided Tours
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Quick Reference
            </TabsTrigger>
          </TabsList>

          {/* Tours Tab */}
          <TabsContent value="tours" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {tours.map(tour => {
                  const completed = isTourCompleted(tour.id)
                  const TourIcon = getTourIcon(tour.id)

                  return (
                    <div
                      key={tour.id}
                      className={cn(
                        'p-4 rounded-lg border transition-colors',
                        completed
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-border hover:border-scenra-amber/50 hover:bg-scenra-amber/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'p-2 rounded-lg',
                              completed ? 'bg-green-500/10' : 'bg-scenra-amber/10'
                            )}
                          >
                            <TourIcon
                              className={cn(
                                'h-5 w-5',
                                completed ? 'text-green-500' : 'text-scenra-amber'
                              )}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              {tour.title}
                              {completed && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {tour.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {tour.estimatedTime}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {tour.steps.length} steps
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={completed ? 'outline' : 'default'}
                          onClick={() => handleStartTour(tour.id)}
                          className={cn(
                            !completed && 'bg-scenra-amber hover:bg-scenra-amber/90 text-black'
                          )}
                        >
                          {completed ? 'Replay' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Reset Progress */}
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetProgress}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset tour progress
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Quick Reference Tab */}
          <TabsContent value="docs" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Video Creation */}
                <QuickReferenceSection
                  icon={Video}
                  title="Creating Videos"
                  items={[
                    {
                      term: 'Video Brief',
                      description:
                        'Describe your video concept in natural language. Include setting, actions, mood, and any specific details.',
                    },
                    {
                      term: 'AI Film Crew',
                      description:
                        'Five AI specialists (Director, Cinematographer, Editor, Colorist, VFX Artist) collaborate to optimize your prompt.',
                    },
                    {
                      term: 'Platform Optimization',
                      description:
                        'Select your target platform (TikTok, YouTube, etc.) and the AI will optimize for that platform\'s best practices.',
                    },
                  ]}
                />

                {/* Series */}
                <QuickReferenceSection
                  icon={ListVideo}
                  title="Working with Series"
                  items={[
                    {
                      term: 'Series',
                      description:
                        'A collection of related videos with consistent characters, settings, and visual style.',
                    },
                    {
                      term: 'Characters',
                      description:
                        'Define character appearances that stay consistent across all videos in the series.',
                    },
                    {
                      term: 'Settings',
                      description:
                        'Create reusable locations with detailed visual descriptions for your videos.',
                    },
                    {
                      term: 'Episodes',
                      description:
                        'Organize videos into episodes within a series for episodic storytelling.',
                    },
                  ]}
                />

                {/* AI Features */}
                <QuickReferenceSection
                  icon={Sparkles}
                  title="AI Features"
                  items={[
                    {
                      term: 'AI Consultations',
                      description:
                        'Each time you generate prompts with the AI Film Crew, it uses one consultation. Free accounts have limited consultations per month.',
                    },
                    {
                      term: 'Prompt Optimization',
                      description:
                        'The AI transforms your brief into a Sora-optimized prompt with precise visual direction.',
                    },
                    {
                      term: 'Shot List',
                      description:
                        'Get a detailed breakdown of suggested shots, camera movements, and timing.',
                    },
                  ]}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function getTourIcon(tourId: TourId) {
  switch (tourId) {
    case 'welcome':
    case 'dashboard-overview':
      return Sparkles
    case 'create-first-video':
      return Video
    case 'series-creation':
      return ListVideo
    case 'ai-roundtable':
      return Sparkles
    default:
      return Play
  }
}

interface QuickReferenceItem {
  term: string
  description: string
}

interface QuickReferenceSectionProps {
  icon: React.ElementType
  title: string
  items: QuickReferenceItem[]
}

function QuickReferenceSection({
  icon: Icon,
  title,
  items,
}: QuickReferenceSectionProps) {
  return (
    <div>
      <h3 className="font-medium flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-scenra-amber" />
        {title}
      </h3>
      <div className="space-y-3 pl-6">
        {items.map(item => (
          <div key={item.term}>
            <dt className="text-sm font-medium">{item.term}</dt>
            <dd className="text-sm text-muted-foreground mt-0.5">
              {item.description}
            </dd>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// FLOATING HELP BUTTON
// ============================================================

export function FloatingHelpButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <HelpModal
        trigger={
          <Button
            size="lg"
            className="h-12 w-12 rounded-full bg-scenra-amber hover:bg-scenra-amber/90 text-black shadow-lg"
          >
            <HelpCircle className="h-6 w-6" />
            <span className="sr-only">Help</span>
          </Button>
        }
      />
    </div>
  )
}
