/**
 * Tests for Analytics Event Tracking System
 *
 * Tests the type-safe analytics tracking interface including
 * event configuration, tracking functions, and domain-specific event helpers.
 */

import {
  configureAnalytics,
  track,
  trackPageView,
  trackFeature,
  trackError,
  videoEvents,
  seriesEvents,
  segmentEvents,
  userEvents,
  onboardingEvents,
} from '@/lib/analytics/events'

describe('Analytics Event Tracking System', () => {
  let consoleSpy: jest.SpyInstance
  let mockOnEvent: jest.Mock

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    mockOnEvent = jest.fn()
    // Reset to default config
    configureAnalytics({
      enabled: true,
      debug: true,
      onEvent: undefined,
    })
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('configureAnalytics', () => {
    it('enables analytics by default', () => {
      configureAnalytics({ enabled: true, debug: true })
      track('page_viewed', { path: '/test' })

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('disables analytics when enabled is false', () => {
      configureAnalytics({ enabled: false, debug: true })
      track('page_viewed', { path: '/test' })

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('enables debug logging in development', () => {
      configureAnalytics({ enabled: true, debug: true })
      track('video_created', { videoId: '123' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Analytics]'),
        expect.any(String),
        expect.any(Object)
      )
    })

    it('disables debug logging when debug is false', () => {
      configureAnalytics({ enabled: true, debug: false })
      track('video_created', { videoId: '123' })

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('calls custom onEvent handler when provided', () => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
      track('video_deleted', { videoId: '456' })

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_deleted',
        expect.objectContaining({ videoId: '456' })
      )
    })

    it('does not call onEvent when analytics disabled', () => {
      configureAnalytics({ enabled: false, onEvent: mockOnEvent })
      track('video_created', {})

      expect(mockOnEvent).not.toHaveBeenCalled()
    })
  })

  describe('track', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks event with name and properties', () => {
      track('video_created', { videoId: 'v123', platform: 'tiktok' })

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_created',
        expect.objectContaining({
          videoId: 'v123',
          platform: 'tiktok',
        })
      )
    })

    it('adds timestamp to event properties', () => {
      const beforeTime = Date.now()
      track('series_created', { seriesId: 's123' })
      const afterTime = Date.now()

      const callArgs = mockOnEvent.mock.calls[0][1]
      expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(callArgs.timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('preserves custom timestamp if provided', () => {
      const customTimestamp = 1234567890
      track('page_viewed', { path: '/test', timestamp: customTimestamp })

      expect(mockOnEvent).toHaveBeenCalledWith(
        'page_viewed',
        expect.objectContaining({ timestamp: customTimestamp })
      )
    })

    it('handles empty properties', () => {
      track('user_logged_out', {})

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_logged_out',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('handles undefined properties', () => {
      track('help_opened')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'help_opened',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })
  })

  describe('trackPageView', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks page view with path', () => {
      trackPageView('/dashboard/videos')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'page_viewed',
        expect.objectContaining({ path: '/dashboard/videos' })
      )
    })

    it('includes previous path when provided', () => {
      trackPageView('/videos/123', '/dashboard')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'page_viewed',
        expect.objectContaining({
          path: '/videos/123',
          previousPath: '/dashboard',
        })
      )
    })

    it('handles undefined previous path', () => {
      trackPageView('/home')

      const callArgs = mockOnEvent.mock.calls[0][1]
      expect(callArgs.path).toBe('/home')
      expect(callArgs.previousPath).toBeUndefined()
    })
  })

  describe('trackFeature', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks feature usage with name', () => {
      trackFeature('dark_mode_toggle')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'feature_used',
        expect.objectContaining({ featureName: 'dark_mode_toggle' })
      )
    })

    it('handles feature names with special characters', () => {
      trackFeature('copy_to_clipboard::prompt')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'feature_used',
        expect.objectContaining({ featureName: 'copy_to_clipboard::prompt' })
      )
    })
  })

  describe('trackError', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks error with message', () => {
      trackError('Failed to generate prompt')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'error_occurred',
        expect.objectContaining({ errorMessage: 'Failed to generate prompt' })
      )
    })

    it('includes optional error properties', () => {
      trackError('API timeout', {
        errorCode: 'TIMEOUT',
        component: 'RoundtablePanel',
        action: 'generatePrompt',
      })

      expect(mockOnEvent).toHaveBeenCalledWith(
        'error_occurred',
        expect.objectContaining({
          errorMessage: 'API timeout',
          errorCode: 'TIMEOUT',
          component: 'RoundtablePanel',
          action: 'generatePrompt',
        })
      )
    })

    it('handles empty options', () => {
      trackError('Unknown error', {})

      expect(mockOnEvent).toHaveBeenCalledWith(
        'error_occurred',
        expect.objectContaining({ errorMessage: 'Unknown error' })
      )
    })
  })

  describe('videoEvents', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks video created', () => {
      videoEvents.created('v123', { platform: 'youtube' })

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_created',
        expect.objectContaining({ videoId: 'v123', platform: 'youtube' })
      )
    })

    it('tracks video deleted', () => {
      videoEvents.deleted('v456')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_deleted',
        expect.objectContaining({ videoId: 'v456' })
      )
    })

    it('tracks prompt generated', () => {
      videoEvents.promptGenerated('v789', 500, 'advanced')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_prompt_generated',
        expect.objectContaining({
          videoId: 'v789',
          promptLength: 500,
          agentMode: 'advanced',
        })
      )
    })

    it('tracks roundtable started', () => {
      videoEvents.roundtableStarted('v100', 'basic')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_roundtable_started',
        expect.objectContaining({ videoId: 'v100', agentMode: 'basic' })
      )
    })

    it('tracks roundtable completed', () => {
      videoEvents.roundtableCompleted('v200', 'advanced')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_roundtable_completed',
        expect.objectContaining({ videoId: 'v200', agentMode: 'advanced' })
      )
    })

    it('tracks video exported', () => {
      videoEvents.exported('v300', 'tiktok')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_exported',
        expect.objectContaining({ videoId: 'v300', platform: 'tiktok' })
      )
    })

    it('tracks prompt copied', () => {
      videoEvents.promptCopied('v400')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'video_copied_prompt',
        expect.objectContaining({ videoId: 'v400' })
      )
    })
  })

  describe('seriesEvents', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks series created', () => {
      seriesEvents.created('s123', 'comedy')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'series_created',
        expect.objectContaining({ seriesId: 's123', genre: 'comedy' })
      )
    })

    it('tracks series deleted', () => {
      seriesEvents.deleted('s456')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'series_deleted',
        expect.objectContaining({ seriesId: 's456' })
      )
    })

    it('tracks series updated', () => {
      seriesEvents.updated('s789')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'series_updated',
        expect.objectContaining({ seriesId: 's789' })
      )
    })

    it('tracks episode added', () => {
      seriesEvents.episodeAdded('s100', 5)

      expect(mockOnEvent).toHaveBeenCalledWith(
        'series_episode_added',
        expect.objectContaining({ seriesId: 's100', episodeCount: 5 })
      )
    })
  })

  describe('segmentEvents', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks segment created', () => {
      segmentEvents.created('seg123', 'ep456')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'segment_created',
        expect.objectContaining({ segmentId: 'seg123', episodeId: 'ep456' })
      )
    })

    it('tracks segment deleted', () => {
      segmentEvents.deleted('seg789')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'segment_deleted',
        expect.objectContaining({ segmentId: 'seg789' })
      )
    })

    it('tracks segment generated', () => {
      segmentEvents.generated('seg100')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'segment_generated',
        expect.objectContaining({ segmentId: 'seg100' })
      )
    })

    it('tracks batch started', () => {
      segmentEvents.batchStarted('group123', 10)

      expect(mockOnEvent).toHaveBeenCalledWith(
        'segment_batch_started',
        expect.objectContaining({
          segmentGroupId: 'group123',
          segmentCount: 10,
        })
      )
    })

    it('tracks batch completed', () => {
      segmentEvents.batchCompleted('group456', 8, 5000)

      expect(mockOnEvent).toHaveBeenCalledWith(
        'segment_batch_completed',
        expect.objectContaining({
          segmentGroupId: 'group456',
          segmentCount: 8,
          duration: 5000,
        })
      )
    })

    it('tracks batch failed', () => {
      segmentEvents.batchFailed('group789', 'Network timeout')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'segment_batch_failed',
        expect.objectContaining({
          segmentGroupId: 'group789',
          errorMessage: 'Network timeout',
        })
      )
    })
  })

  describe('userEvents', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks user signed up', () => {
      userEvents.signedUp('google')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_signed_up',
        expect.objectContaining({ provider: 'google' })
      )
    })

    it('tracks user logged in', () => {
      userEvents.loggedIn('github')

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_logged_in',
        expect.objectContaining({ provider: 'github' })
      )
    })

    it('tracks user logged out', () => {
      userEvents.loggedOut()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_logged_out',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('tracks settings updated', () => {
      userEvents.settingsUpdated()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_settings_updated',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('tracks API key added', () => {
      userEvents.apiKeyAdded()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_api_key_added',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('tracks API key removed', () => {
      userEvents.apiKeyRemoved()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'user_api_key_removed',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })
  })

  describe('onboardingEvents', () => {
    beforeEach(() => {
      configureAnalytics({ enabled: true, debug: false, onEvent: mockOnEvent })
    })

    it('tracks onboarding started', () => {
      onboardingEvents.started()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'onboarding_started',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('tracks onboarding completed', () => {
      onboardingEvents.completed(5)

      expect(mockOnEvent).toHaveBeenCalledWith(
        'onboarding_completed',
        expect.objectContaining({ totalSteps: 5 })
      )
    })

    it('tracks onboarding skipped', () => {
      onboardingEvents.skipped(2, 5)

      expect(mockOnEvent).toHaveBeenCalledWith(
        'onboarding_skipped',
        expect.objectContaining({ step: 2, totalSteps: 5 })
      )
    })

    it('tracks tour started', () => {
      onboardingEvents.tourStarted()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'tour_started',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('tracks tour completed', () => {
      onboardingEvents.tourCompleted()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'tour_completed',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })

    it('tracks help opened', () => {
      onboardingEvents.helpOpened()

      expect(mockOnEvent).toHaveBeenCalledWith(
        'help_opened',
        expect.objectContaining({ timestamp: expect.any(Number) })
      )
    })
  })

  describe('Debug Logging Format', () => {
    it('logs with purple color and Analytics prefix', () => {
      configureAnalytics({ enabled: true, debug: true })
      track('video_created', { videoId: 'test' })

      expect(consoleSpy).toHaveBeenCalledWith(
        '%c[Analytics] video_created',
        'color: #8B5CF6; font-weight: bold;',
        expect.any(Object)
      )
    })
  })
})
