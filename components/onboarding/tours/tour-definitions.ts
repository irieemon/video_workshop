/**
 * Tour Definitions
 *
 * Centralized tour step definitions for the guided tour system.
 * Each tour targets specific user flows and learning objectives.
 */

import type { DriveStep } from 'driver.js'

export type TourId =
  | 'welcome'
  | 'dashboard-overview'
  | 'create-first-video'
  | 'series-creation'
  | 'ai-roundtable'

export interface TourDefinition {
  id: TourId
  title: string
  description: string
  estimatedTime: string // e.g., "2 min"
  steps: DriveStep[]
  requiredPath?: string // Only show on specific routes
  triggerCondition?: 'first-visit' | 'empty-state' | 'manual'
}

/**
 * Welcome Tour - First-time user introduction
 * Covers: Navigation, core sections, getting started
 */
export const welcomeTour: TourDefinition = {
  id: 'welcome',
  title: 'Welcome to Scenra Studio',
  description: 'Get a quick overview of the platform',
  estimatedTime: '2 min',
  triggerCondition: 'first-visit',
  steps: [
    {
      popover: {
        title: 'Welcome to Scenra Studio! 🎬',
        description: `
          <p>Let's take a quick tour to help you create amazing AI-powered videos.</p>
          <p class="text-sm text-muted-foreground mt-2">This will only take about 2 minutes.</p>
        `,
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-dashboard"]',
      popover: {
        title: 'Your Dashboard',
        description: 'This is your home base. View recent activity, quick stats, and jump into your work.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-videos"]',
      popover: {
        title: 'Videos Library',
        description: 'All your video prompts and generated content live here. Create standalone videos or organize them into series.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-series"]',
      popover: {
        title: 'Series Management',
        description: 'Create connected video series with consistent characters, settings, and visual style. Perfect for episodic content.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="usage-quota"]',
      popover: {
        title: 'AI Consultations',
        description: 'Track your AI usage here. Each time you generate prompts with our AI Film Crew, it uses a consultation.',
        side: 'top',
        align: 'center',
      },
    },
    {
      popover: {
        title: 'Ready to Create! 🚀',
        description: `
          <p>You're all set! Here's how to get started:</p>
          <ul class="mt-2 space-y-1 text-sm">
            <li>• <strong>Quick start:</strong> Go to Videos → New Video</li>
            <li>• <strong>For series:</strong> Go to Series → Create Series</li>
          </ul>
          <p class="mt-3 text-sm text-muted-foreground">You can replay this tour anytime from the Help menu.</p>
        `,
        side: 'over',
        align: 'center',
      },
    },
  ],
}

/**
 * Create First Video Tour
 * Covers: Video creation workflow, AI roundtable, prompt generation
 */
export const createFirstVideoTour: TourDefinition = {
  id: 'create-first-video',
  title: 'Create Your First Video',
  description: 'Learn the video creation workflow',
  estimatedTime: '3 min',
  requiredPath: '/dashboard/videos/new',
  triggerCondition: 'first-visit',
  steps: [
    {
      popover: {
        title: 'Let\'s Create a Video! 🎥',
        description: 'Follow along to create your first AI-powered video prompt.',
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '[data-tour="video-title"]',
      popover: {
        title: 'Video Title',
        description: 'Give your video a descriptive title. This helps you organize and find your videos later.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="video-brief"]',
      popover: {
        title: 'Your Creative Brief',
        description: `
          <p>Describe what you want in your video. Be specific about:</p>
          <ul class="mt-2 text-sm space-y-1">
            <li>• Setting and atmosphere</li>
            <li>• Actions and movements</li>
            <li>• Mood and tone</li>
          </ul>
        `,
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="platform-selector"]',
      popover: {
        title: 'Target Platform',
        description: 'Select where this video will be posted. Our AI optimizes the prompt for each platform\'s best practices.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="series-selector"]',
      popover: {
        title: 'Optional: Link to Series',
        description: 'If this video is part of a series, select it here to automatically include character and setting consistency.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="generate-button"]',
      popover: {
        title: 'Generate with AI Film Crew',
        description: `
          <p>Click here to start the AI roundtable!</p>
          <p class="mt-2 text-sm text-muted-foreground">
            Our AI agents (Director, Cinematographer, Editor, Colorist, VFX Artist)
            will collaborate to create the perfect Sora prompt.
          </p>
        `,
        side: 'top',
        align: 'center',
      },
    },
  ],
}

/**
 * Series Creation Tour
 * Covers: Series setup, characters, settings, visual consistency
 */
export const seriesCreationTour: TourDefinition = {
  id: 'series-creation',
  title: 'Creating a Series',
  description: 'Set up connected video content',
  estimatedTime: '4 min',
  requiredPath: '/dashboard/series',
  triggerCondition: 'empty-state',
  steps: [
    {
      popover: {
        title: 'Series: Connected Content 📺',
        description: `
          <p>Series help you create consistent, connected videos with:</p>
          <ul class="mt-2 text-sm space-y-1">
            <li>• <strong>Characters</strong> that look the same across videos</li>
            <li>• <strong>Settings</strong> with consistent visual style</li>
            <li>• <strong>Episodes</strong> for episodic storytelling</li>
          </ul>
        `,
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '[data-tour="create-series-button"]',
      popover: {
        title: 'Create New Series',
        description: 'Start here to create a new series. You can set it up manually or let AI generate a concept for you.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="ai-concept-button"]',
      popover: {
        title: 'AI Series Concept',
        description: `
          <p>Let AI help you brainstorm! Describe your idea and we'll generate:</p>
          <ul class="mt-2 text-sm space-y-1">
            <li>• Complete series premise</li>
            <li>• Character profiles with visual descriptions</li>
            <li>• Key settings and locations</li>
            <li>• Episode ideas</li>
          </ul>
        `,
        side: 'bottom',
        align: 'start',
      },
    },
  ],
}

/**
 * AI Roundtable Tour
 * Covers: How the AI agents work, understanding the output
 */
export const aiRoundtableTour: TourDefinition = {
  id: 'ai-roundtable',
  title: 'Meet the AI Film Crew',
  description: 'Understand how AI agents collaborate',
  estimatedTime: '2 min',
  triggerCondition: 'manual',
  steps: [
    {
      popover: {
        title: 'Your AI Film Crew 🎬',
        description: `
          <p>When you generate a video prompt, five AI specialists work together:</p>
          <div class="mt-3 space-y-2 text-sm">
            <div>🎬 <strong>Director:</strong> Story and vision</div>
            <div>📷 <strong>Cinematographer:</strong> Camera and composition</div>
            <div>✂️ <strong>Editor:</strong> Pacing and flow</div>
            <div>🎨 <strong>Colorist:</strong> Color and mood</div>
            <div>✨ <strong>VFX Artist:</strong> Visual effects</div>
          </div>
        `,
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '[data-tour="agent-discussion"]',
      popover: {
        title: 'Agent Discussion',
        description: 'Watch the agents discuss and refine your concept in real-time. Each brings their expertise to create the best possible prompt.',
        side: 'left',
        align: 'center',
      },
    },
    {
      element: '[data-tour="final-prompt"]',
      popover: {
        title: 'Your Optimized Prompt',
        description: 'The final Sora-optimized prompt combines all agent insights. You can edit it before generating your video.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="shot-list"]',
      popover: {
        title: 'Shot List',
        description: 'Get a detailed breakdown of suggested shots, camera movements, and timing for your video.',
        side: 'left',
        align: 'start',
      },
    },
  ],
}

// Export all tours as a map for easy access
export const tourDefinitions: Record<TourId, TourDefinition> = {
  'welcome': welcomeTour,
  'dashboard-overview': welcomeTour, // Alias
  'create-first-video': createFirstVideoTour,
  'series-creation': seriesCreationTour,
  'ai-roundtable': aiRoundtableTour,
}

// Helper to get tours available for a specific path
export function getToursForPath(path: string): TourDefinition[] {
  return Object.values(tourDefinitions).filter(tour =>
    !tour.requiredPath || path.startsWith(tour.requiredPath)
  )
}
