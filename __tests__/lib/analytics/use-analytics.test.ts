/**
 * Tests for Analytics React Hooks
 *
 * Tests the React hooks that provide analytics tracking functionality
 * in components, including page view tracking and modal tracking.
 */

import { renderHook, act } from '@testing-library/react'

// Mock next/navigation
const mockUsePathname = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock the events module
const mockTrack = jest.fn()
const mockTrackPageView = jest.fn()
const mockTrackFeature = jest.fn()
const mockTrackError = jest.fn()

jest.mock('@/lib/analytics/events', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
  trackPageView: (...args: unknown[]) => mockTrackPageView(...args),
  trackFeature: (...args: unknown[]) => mockTrackFeature(...args),
  trackError: (...args: unknown[]) => mockTrackError(...args),
  videoEvents: {
    created: jest.fn(),
    deleted: jest.fn(),
    promptGenerated: jest.fn(),
    roundtableStarted: jest.fn(),
    roundtableCompleted: jest.fn(),
    exported: jest.fn(),
    promptCopied: jest.fn(),
  },
  seriesEvents: {
    created: jest.fn(),
    deleted: jest.fn(),
    updated: jest.fn(),
    episodeAdded: jest.fn(),
  },
  segmentEvents: {
    created: jest.fn(),
    deleted: jest.fn(),
    generated: jest.fn(),
    batchStarted: jest.fn(),
    batchCompleted: jest.fn(),
    batchFailed: jest.fn(),
  },
  userEvents: {
    signedUp: jest.fn(),
    loggedIn: jest.fn(),
    loggedOut: jest.fn(),
    settingsUpdated: jest.fn(),
    apiKeyAdded: jest.fn(),
    apiKeyRemoved: jest.fn(),
  },
  onboardingEvents: {
    started: jest.fn(),
    completed: jest.fn(),
    skipped: jest.fn(),
    tourStarted: jest.fn(),
    tourCompleted: jest.fn(),
    helpOpened: jest.fn(),
  },
}))

import {
  useAnalytics,
  usePageViewTracking,
  useTimeTracking,
  useModalTracking,
} from '@/lib/analytics/use-analytics'

describe('Analytics React Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
  })

  describe('useAnalytics', () => {
    describe('Initialization', () => {
      it('returns all tracking functions', () => {
        const { result } = renderHook(() => useAnalytics())

        expect(result.current.trackEvent).toBeDefined()
        expect(result.current.trackFeature).toBeDefined()
        expect(result.current.trackError).toBeDefined()
      })

      it('returns domain-specific event objects', () => {
        const { result } = renderHook(() => useAnalytics())

        expect(result.current.videoEvents).toBeDefined()
        expect(result.current.seriesEvents).toBeDefined()
        expect(result.current.segmentEvents).toBeDefined()
        expect(result.current.userEvents).toBeDefined()
        expect(result.current.onboardingEvents).toBeDefined()
      })

      it('provides stable function references', () => {
        const { result, rerender } = renderHook(() => useAnalytics())

        const firstRender = {
          trackEvent: result.current.trackEvent,
          trackFeature: result.current.trackFeature,
          trackError: result.current.trackError,
        }

        rerender()

        expect(result.current.trackEvent).toBe(firstRender.trackEvent)
        expect(result.current.trackFeature).toBe(firstRender.trackFeature)
        expect(result.current.trackError).toBe(firstRender.trackError)
      })
    })

    describe('Page View Tracking', () => {
      it('tracks initial page view on mount', () => {
        mockUsePathname.mockReturnValue('/dashboard/videos')

        renderHook(() => useAnalytics())

        expect(mockTrackPageView).toHaveBeenCalledWith('/dashboard/videos', undefined)
      })

      it('tracks page view when pathname changes', () => {
        mockUsePathname.mockReturnValue('/dashboard')

        const { rerender } = renderHook(() => useAnalytics())

        expect(mockTrackPageView).toHaveBeenCalledWith('/dashboard', undefined)

        mockUsePathname.mockReturnValue('/dashboard/videos')
        rerender()

        expect(mockTrackPageView).toHaveBeenCalledWith('/dashboard/videos', '/dashboard')
      })

      it('includes previous path in subsequent page views', () => {
        mockUsePathname.mockReturnValue('/page1')

        const { rerender } = renderHook(() => useAnalytics())

        mockUsePathname.mockReturnValue('/page2')
        rerender()

        mockUsePathname.mockReturnValue('/page3')
        rerender()

        expect(mockTrackPageView).toHaveBeenLastCalledWith('/page3', '/page2')
      })

      it('does not track when pathname is unchanged', () => {
        mockUsePathname.mockReturnValue('/dashboard')

        const { rerender } = renderHook(() => useAnalytics())

        const initialCallCount = mockTrackPageView.mock.calls.length

        // Rerender with same pathname
        rerender()

        expect(mockTrackPageView).toHaveBeenCalledTimes(initialCallCount)
      })
    })

    describe('trackEvent', () => {
      it('calls track with event name and properties', () => {
        const { result } = renderHook(() => useAnalytics())

        act(() => {
          result.current.trackEvent('video_created', { videoId: '123' })
        })

        expect(mockTrack).toHaveBeenCalledWith('video_created', { videoId: '123' })
      })

      it('handles events without properties', () => {
        const { result } = renderHook(() => useAnalytics())

        act(() => {
          result.current.trackEvent('user_logged_out')
        })

        expect(mockTrack).toHaveBeenCalledWith('user_logged_out', undefined)
      })
    })

    describe('trackFeature', () => {
      it('calls trackFeature with feature name', () => {
        const { result } = renderHook(() => useAnalytics())

        act(() => {
          result.current.trackFeature('dark_mode')
        })

        expect(mockTrackFeature).toHaveBeenCalledWith('dark_mode')
      })
    })

    describe('trackError', () => {
      it('calls trackError with message', () => {
        const { result } = renderHook(() => useAnalytics())

        act(() => {
          result.current.trackError('Something went wrong')
        })

        expect(mockTrackError).toHaveBeenCalledWith('Something went wrong', undefined)
      })

      it('passes additional options', () => {
        const { result } = renderHook(() => useAnalytics())

        act(() => {
          result.current.trackError('API failed', {
            errorCode: 'API_500',
            component: 'VideoEditor',
            action: 'save',
          })
        })

        expect(mockTrackError).toHaveBeenCalledWith('API failed', {
          errorCode: 'API_500',
          component: 'VideoEditor',
          action: 'save',
        })
      })
    })
  })

  describe('usePageViewTracking', () => {
    it('tracks page view on mount', () => {
      mockUsePathname.mockReturnValue('/settings')

      renderHook(() => usePageViewTracking())

      expect(mockTrackPageView).toHaveBeenCalledWith('/settings', undefined)
    })

    it('tracks when pathname changes', () => {
      mockUsePathname.mockReturnValue('/home')

      const { rerender } = renderHook(() => usePageViewTracking())

      mockUsePathname.mockReturnValue('/about')
      rerender()

      expect(mockTrackPageView).toHaveBeenCalledWith('/about', '/home')
    })

    it('does not track duplicate page views', () => {
      mockUsePathname.mockReturnValue('/page')

      const { rerender } = renderHook(() => usePageViewTracking())

      const callCount = mockTrackPageView.mock.calls.length

      rerender()

      expect(mockTrackPageView).toHaveBeenCalledTimes(callCount)
    })

    it('handles null pathname', () => {
      mockUsePathname.mockReturnValue(null)

      renderHook(() => usePageViewTracking())

      // Should not track when pathname is null
      expect(mockTrackPageView).not.toHaveBeenCalled()
    })
  })

  describe('useTimeTracking', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('tracks time spent on unmount', () => {
      const { unmount } = renderHook(() => useTimeTracking('video_editor'))

      // Simulate time passing
      jest.advanceTimersByTime(5000)

      unmount()

      expect(mockTrack).toHaveBeenCalledWith(
        'feature_used',
        expect.objectContaining({
          featureName: 'video_editor_time_spent',
        })
      )
    })

    it('tracks duration accurately', () => {
      const startTime = Date.now()
      jest.setSystemTime(startTime)

      const { unmount } = renderHook(() => useTimeTracking('settings_panel'))

      jest.advanceTimersByTime(10000)

      unmount()

      expect(mockTrack).toHaveBeenCalledWith(
        'feature_used',
        expect.objectContaining({
          timestamp: 10000, // Duration in ms
        })
      )
    })

    it('resets timer when component name changes', () => {
      const { rerender, unmount } = renderHook(
        ({ name }) => useTimeTracking(name),
        { initialProps: { name: 'panel_a' } }
      )

      jest.advanceTimersByTime(3000)

      // Change component name
      rerender({ name: 'panel_b' })

      jest.advanceTimersByTime(2000)

      unmount()

      // Should track with panel_b name and ~2000ms duration
      expect(mockTrack).toHaveBeenLastCalledWith(
        'feature_used',
        expect.objectContaining({
          featureName: 'panel_b_time_spent',
        })
      )
    })
  })

  describe('useModalTracking', () => {
    it('tracks modal opened when isOpen becomes true', () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useModalTracking('settings_dialog', isOpen),
        { initialProps: { isOpen: false } }
      )

      rerender({ isOpen: true })

      expect(mockTrack).toHaveBeenCalledWith('modal_opened', { modalName: 'settings_dialog' })
    })

    it('tracks modal closed when isOpen becomes false', () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useModalTracking('confirm_dialog', isOpen),
        { initialProps: { isOpen: true } }
      )

      rerender({ isOpen: false })

      expect(mockTrack).toHaveBeenCalledWith('modal_closed', { modalName: 'confirm_dialog' })
    })

    it('tracks modal_opened when starting with isOpen=true', () => {
      // The hook tracks modal_opened when wasOpen goes from false to true
      // Since wasOpen starts as false and isOpen is true, it will track
      renderHook(() => useModalTracking('alert_dialog', true))

      expect(mockTrack).toHaveBeenCalledWith('modal_opened', { modalName: 'alert_dialog' })
    })

    it('does not track when state unchanged', () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useModalTracking('test_modal', isOpen),
        { initialProps: { isOpen: true } }
      )

      mockTrack.mockClear()

      // Rerender with same state
      rerender({ isOpen: true })

      expect(mockTrack).not.toHaveBeenCalled()
    })

    it('tracks multiple open/close cycles', () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useModalTracking('multi_modal', isOpen),
        { initialProps: { isOpen: false } }
      )

      // Open
      rerender({ isOpen: true })
      expect(mockTrack).toHaveBeenLastCalledWith('modal_opened', { modalName: 'multi_modal' })

      // Close
      rerender({ isOpen: false })
      expect(mockTrack).toHaveBeenLastCalledWith('modal_closed', { modalName: 'multi_modal' })

      // Open again
      rerender({ isOpen: true })
      expect(mockTrack).toHaveBeenLastCalledWith('modal_opened', { modalName: 'multi_modal' })

      expect(mockTrack).toHaveBeenCalledTimes(3)
    })

    it('handles different modal names', () => {
      const { rerender } = renderHook(
        ({ name, isOpen }) => useModalTracking(name, isOpen),
        { initialProps: { name: 'modal_a', isOpen: false } }
      )

      rerender({ name: 'modal_a', isOpen: true })
      expect(mockTrack).toHaveBeenLastCalledWith('modal_opened', { modalName: 'modal_a' })

      // Change modal name and open state
      rerender({ name: 'modal_b', isOpen: true })

      // Note: The hook tracks based on isOpen state change, not modal name change
    })
  })
})
