/**
 * Analytics Event Tracking System
 *
 * This module provides a type-safe analytics tracking interface.
 * Events are categorized by domain for better organization and
 * can be easily extended with new event types.
 *
 * Currently logs to console in development. In production,
 * this can be connected to analytics providers like:
 * - Vercel Analytics
 * - PostHog
 * - Mixpanel
 * - Google Analytics 4
 */

// ==========================================
// Event Type Definitions
// ==========================================

export type VideoEventName =
  | 'video_created'
  | 'video_deleted'
  | 'video_prompt_generated'
  | 'video_roundtable_started'
  | 'video_roundtable_completed'
  | 'video_exported'
  | 'video_copied_prompt'

export type SeriesEventName =
  | 'series_created'
  | 'series_deleted'
  | 'series_updated'
  | 'series_episode_added'

export type SegmentEventName =
  | 'segment_created'
  | 'segment_deleted'
  | 'segment_generated'
  | 'segment_batch_started'
  | 'segment_batch_completed'
  | 'segment_batch_failed'

export type NavigationEventName =
  | 'page_viewed'
  | 'tab_switched'
  | 'modal_opened'
  | 'modal_closed'

export type UserEventName =
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'user_settings_updated'
  | 'user_api_key_added'
  | 'user_api_key_removed'

export type FeatureEventName =
  | 'feature_used'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'help_opened'
  | 'tour_started'
  | 'tour_completed'

export type ErrorEventName =
  | 'error_occurred'
  | 'api_error'
  | 'validation_error'

export type AnalyticsEventName =
  | VideoEventName
  | SeriesEventName
  | SegmentEventName
  | NavigationEventName
  | UserEventName
  | FeatureEventName
  | ErrorEventName

// ==========================================
// Event Properties
// ==========================================

interface BaseEventProperties {
  timestamp?: number
  sessionId?: string
}

interface VideoEventProperties extends BaseEventProperties {
  videoId?: string
  seriesId?: string
  platform?: string
  agentMode?: 'basic' | 'advanced'
  promptLength?: number
}

interface SeriesEventProperties extends BaseEventProperties {
  seriesId?: string
  genre?: string
  episodeCount?: number
}

interface SegmentEventProperties extends BaseEventProperties {
  segmentId?: string
  segmentGroupId?: string
  episodeId?: string
  segmentCount?: number
  duration?: number
}

interface NavigationEventProperties extends BaseEventProperties {
  path?: string
  previousPath?: string
  tabName?: string
  modalName?: string
}

interface UserEventProperties extends BaseEventProperties {
  provider?: string
  subscriptionTier?: string
}

interface FeatureEventProperties extends BaseEventProperties {
  featureName?: string
  step?: number
  totalSteps?: number
}

interface ErrorEventProperties extends BaseEventProperties {
  errorCode?: string
  errorMessage?: string
  component?: string
  action?: string
}

export type AnalyticsEventProperties =
  | VideoEventProperties
  | SeriesEventProperties
  | SegmentEventProperties
  | NavigationEventProperties
  | UserEventProperties
  | FeatureEventProperties
  | ErrorEventProperties

// ==========================================
// Analytics Tracker
// ==========================================

interface AnalyticsConfig {
  /** Enable/disable analytics (defaults to true in production) */
  enabled?: boolean
  /** Log events to console (defaults to true in development) */
  debug?: boolean
  /** Custom event handler for external analytics providers */
  onEvent?: (name: string, properties: AnalyticsEventProperties) => void
}

let config: AnalyticsConfig = {
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Configure the analytics system
 */
export function configureAnalytics(options: AnalyticsConfig): void {
  config = { ...config, ...options }
}

/**
 * Track an analytics event
 *
 * @param name - The event name (type-safe)
 * @param properties - Additional event properties
 *
 * @example
 * ```ts
 * // Track a video creation
 * track('video_created', { videoId: '123', platform: 'tiktok' })
 *
 * // Track page view
 * track('page_viewed', { path: '/dashboard/videos' })
 *
 * // Track error
 * track('error_occurred', { errorMessage: 'Failed to generate', component: 'RoundtablePanel' })
 * ```
 */
export function track(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {}
): void {
  if (!config.enabled) return

  const enrichedProperties: AnalyticsEventProperties = {
    ...properties,
    timestamp: properties.timestamp ?? Date.now(),
  }

  // Debug logging in development
  if (config.debug) {
    console.log(
      `%c[Analytics] ${name}`,
      'color: #8B5CF6; font-weight: bold;',
      enrichedProperties
    )
  }

  // Call custom event handler if provided
  if (config.onEvent) {
    config.onEvent(name, enrichedProperties)
  }

  // TODO: Add integration with analytics providers here
  // Examples:
  // - posthog.capture(name, enrichedProperties)
  // - mixpanel.track(name, enrichedProperties)
  // - gtag('event', name, enrichedProperties)
}

// ==========================================
// Convenience Tracking Functions
// ==========================================

/**
 * Track a page view
 */
export function trackPageView(path: string, previousPath?: string): void {
  track('page_viewed', { path, previousPath })
}

/**
 * Track a feature usage
 */
export function trackFeature(featureName: string): void {
  track('feature_used', { featureName })
}

/**
 * Track an error
 */
export function trackError(
  errorMessage: string,
  options?: {
    errorCode?: string
    component?: string
    action?: string
  }
): void {
  track('error_occurred', {
    errorMessage,
    ...options,
  })
}

/**
 * Track video-related events
 */
export const videoEvents = {
  created: (videoId: string, props?: Partial<VideoEventProperties>) =>
    track('video_created', { videoId, ...props }),

  deleted: (videoId: string) =>
    track('video_deleted', { videoId }),

  promptGenerated: (videoId: string, promptLength: number, agentMode: 'basic' | 'advanced') =>
    track('video_prompt_generated', { videoId, promptLength, agentMode }),

  roundtableStarted: (videoId: string, agentMode: 'basic' | 'advanced') =>
    track('video_roundtable_started', { videoId, agentMode }),

  roundtableCompleted: (videoId: string, agentMode: 'basic' | 'advanced') =>
    track('video_roundtable_completed', { videoId, agentMode }),

  exported: (videoId: string, platform?: string) =>
    track('video_exported', { videoId, platform }),

  promptCopied: (videoId: string) =>
    track('video_copied_prompt', { videoId }),
}

/**
 * Track series-related events
 */
export const seriesEvents = {
  created: (seriesId: string, genre?: string) =>
    track('series_created', { seriesId, genre }),

  deleted: (seriesId: string) =>
    track('series_deleted', { seriesId }),

  updated: (seriesId: string) =>
    track('series_updated', { seriesId }),

  episodeAdded: (seriesId: string, episodeCount: number) =>
    track('series_episode_added', { seriesId, episodeCount }),
}

/**
 * Track segment-related events
 */
export const segmentEvents = {
  created: (segmentId: string, episodeId: string) =>
    track('segment_created', { segmentId, episodeId }),

  deleted: (segmentId: string) =>
    track('segment_deleted', { segmentId }),

  generated: (segmentId: string) =>
    track('segment_generated', { segmentId }),

  batchStarted: (segmentGroupId: string, segmentCount: number) =>
    track('segment_batch_started', { segmentGroupId, segmentCount }),

  batchCompleted: (segmentGroupId: string, segmentCount: number, duration: number) =>
    track('segment_batch_completed', { segmentGroupId, segmentCount, duration }),

  batchFailed: (segmentGroupId: string, errorMessage: string) =>
    track('segment_batch_failed', {
      segmentGroupId,
      errorMessage,
    } as SegmentEventProperties & ErrorEventProperties),
}

/**
 * Track user-related events
 */
export const userEvents = {
  signedUp: (provider?: string) =>
    track('user_signed_up', { provider }),

  loggedIn: (provider?: string) =>
    track('user_logged_in', { provider }),

  loggedOut: () =>
    track('user_logged_out', {}),

  settingsUpdated: () =>
    track('user_settings_updated', {}),

  apiKeyAdded: () =>
    track('user_api_key_added', {}),

  apiKeyRemoved: () =>
    track('user_api_key_removed', {}),
}

/**
 * Track onboarding events
 */
export const onboardingEvents = {
  started: () =>
    track('onboarding_started', {}),

  completed: (totalSteps: number) =>
    track('onboarding_completed', { totalSteps }),

  skipped: (step: number, totalSteps: number) =>
    track('onboarding_skipped', { step, totalSteps }),

  tourStarted: () =>
    track('tour_started', {}),

  tourCompleted: () =>
    track('tour_completed', {}),

  helpOpened: () =>
    track('help_opened', {}),
}
