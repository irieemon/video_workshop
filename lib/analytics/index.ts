/**
 * Analytics Module
 *
 * Centralized analytics tracking for the Scenra Studio application.
 *
 * @example
 * ```tsx
 * // In a component
 * import { useAnalytics } from '@/lib/analytics'
 *
 * function MyComponent() {
 *   const { trackEvent, videoEvents } = useAnalytics()
 *
 *   const handleCreate = async () => {
 *     const video = await createVideo()
 *     videoEvents.created(video.id, { platform: 'tiktok' })
 *   }
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Direct import for server-side or utility functions
 * import { track, trackError } from '@/lib/analytics'
 *
 * track('series_created', { seriesId: '123' })
 * trackError('Failed to load', { component: 'VideoList' })
 * ```
 */

// Core tracking functions
export {
  track,
  trackPageView,
  trackFeature,
  trackError,
  configureAnalytics,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from './events'

// Domain-specific event helpers
export {
  videoEvents,
  seriesEvents,
  segmentEvents,
  userEvents,
  onboardingEvents,
} from './events'

// React hooks
export {
  useAnalytics,
  usePageViewTracking,
  useTimeTracking,
  useModalTracking,
} from './use-analytics'
