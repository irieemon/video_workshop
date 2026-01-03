'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  track,
  trackPageView,
  trackFeature,
  trackError,
  videoEvents,
  seriesEvents,
  segmentEvents,
  userEvents,
  onboardingEvents,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from './events'

/**
 * Hook for tracking analytics events in React components.
 * Provides memoized tracking functions and automatic page view tracking.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackEvent, trackFeature } = useAnalytics()
 *
 *   const handleClick = () => {
 *     trackEvent('video_created', { videoId: '123' })
 *     // or use convenience function
 *     trackFeature('dark_mode_toggle')
 *   }
 * }
 * ```
 */
export function useAnalytics() {
  const pathname = usePathname()
  const previousPathname = useRef<string | null>(null)

  // Track page views on route change
  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      trackPageView(pathname, previousPathname.current ?? undefined)
      previousPathname.current = pathname
    }
  }, [pathname])

  // Memoized tracking function
  const trackEvent = useCallback(
    (name: AnalyticsEventName, properties?: AnalyticsEventProperties) => {
      track(name, properties)
    },
    []
  )

  // Memoized feature tracking
  const trackFeatureUsage = useCallback((featureName: string) => {
    trackFeature(featureName)
  }, [])

  // Memoized error tracking
  const trackErrorEvent = useCallback(
    (
      errorMessage: string,
      options?: { errorCode?: string; component?: string; action?: string }
    ) => {
      trackError(errorMessage, options)
    },
    []
  )

  return {
    // Core tracking
    trackEvent,
    trackFeature: trackFeatureUsage,
    trackError: trackErrorEvent,

    // Domain-specific events
    videoEvents,
    seriesEvents,
    segmentEvents,
    userEvents,
    onboardingEvents,
  }
}

/**
 * Hook that only tracks page views without providing other tracking utilities.
 * Useful for layout components where you want automatic page tracking.
 */
export function usePageViewTracking() {
  const pathname = usePathname()
  const previousPathname = useRef<string | null>(null)

  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      trackPageView(pathname, previousPathname.current ?? undefined)
      previousPathname.current = pathname
    }
  }, [pathname])
}

/**
 * Hook for tracking time spent on a page or component.
 * Useful for engagement metrics.
 *
 * @param componentName - Name of the component/page being tracked
 *
 * @example
 * ```tsx
 * function RoundtablePanel() {
 *   useTimeTracking('roundtable_panel')
 *   // ...
 * }
 * ```
 */
export function useTimeTracking(componentName: string) {
  const startTime = useRef<number>(Date.now())

  useEffect(() => {
    startTime.current = Date.now()

    return () => {
      const duration = Date.now() - startTime.current
      track('feature_used', {
        featureName: `${componentName}_time_spent`,
        // Store duration in a way that doesn't conflict with other properties
        timestamp: duration, // Reusing timestamp field for duration
      })
    }
  }, [componentName])
}

/**
 * Hook for tracking modal/dialog opens and closes.
 *
 * @param modalName - Name of the modal
 * @param isOpen - Whether the modal is currently open
 *
 * @example
 * ```tsx
 * function MyDialog({ open, onOpenChange }) {
 *   useModalTracking('settings_dialog', open)
 *   // ...
 * }
 * ```
 */
export function useModalTracking(modalName: string, isOpen: boolean) {
  const wasOpen = useRef<boolean>(false)

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      track('modal_opened', { modalName })
    } else if (!isOpen && wasOpen.current) {
      track('modal_closed', { modalName })
    }
    wasOpen.current = isOpen
  }, [isOpen, modalName])
}
