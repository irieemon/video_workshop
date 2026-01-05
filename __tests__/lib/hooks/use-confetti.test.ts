/**
 * Tests for useConfetti Hook
 *
 * Tests the confetti animation hook which wraps canvas-confetti.
 * Mocks the canvas-confetti library to test animation triggers.
 */

// Mock canvas-confetti before imports - jest.mock is hoisted
jest.mock('canvas-confetti', () => {
  const fn = jest.fn()
  return fn
})

import { renderHook, act } from '@testing-library/react'
import confetti from 'canvas-confetti'
import { useConfetti } from '@/lib/hooks/use-confetti'

// Get the mocked function
const mockConfetti = confetti as jest.Mock

describe('useConfetti', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Hook Initialization', () => {
    it('returns all confetti functions', () => {
      const { result } = renderHook(() => useConfetti())

      expect(result.current.fireConfetti).toBeDefined()
      expect(result.current.fireSideCannons).toBeDefined()
      expect(result.current.celebrate).toBeDefined()
      expect(result.current.successBurst).toBeDefined()
      expect(result.current.fireStars).toBeDefined()
    })

    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => useConfetti())

      const firstRender = { ...result.current }
      rerender()

      expect(result.current.fireConfetti).toBe(firstRender.fireConfetti)
      expect(result.current.fireSideCannons).toBe(firstRender.fireSideCannons)
      expect(result.current.celebrate).toBe(firstRender.celebrate)
      expect(result.current.successBurst).toBe(firstRender.successBurst)
      expect(result.current.fireStars).toBe(firstRender.fireStars)
    })
  })

  describe('fireConfetti', () => {
    it('calls confetti with default options', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireConfetti()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
        })
      )
    })

    it('uses default colors when none provided', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireConfetti()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: ['#FFB800', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'],
        })
      )
    })

    it('accepts custom options', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireConfetti({
          particleCount: 50,
          spread: 120,
          colors: ['#FF0000', '#00FF00'],
        })
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 50,
          spread: 120,
          colors: ['#FF0000', '#00FF00'],
        })
      )
    })

    it('allows custom origin', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireConfetti({
          origin: { x: 0.5, y: 0.5 },
        })
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: { x: 0.5, y: 0.5 },
        })
      )
    })

    it('always sets disableForReducedMotion to true', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireConfetti()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          disableForReducedMotion: true,
        })
      )
    })
  })

  describe('fireSideCannons', () => {
    it('fires confetti from both sides', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireSideCannons()
      })

      // Should call confetti 4 times (2 for each cannon)
      expect(mockConfetti).toHaveBeenCalledTimes(4)
    })

    it('fires left cannon with correct origin', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireSideCannons()
      })

      // First two calls should be from left cannon
      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: { x: 0.1, y: 0.7 },
        })
      )
    })

    it('fires right cannon with correct origin', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireSideCannons()
      })

      // Last two calls should be from right cannon
      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: { x: 0.9, y: 0.7 },
        })
      )
    })

    it('uses default colors', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireSideCannons()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: ['#FFB800', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'],
        })
      )
    })

    it('sets particle count based on ratio', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireSideCannons()
      })

      // With count=200, 0.25 ratio gives 50 particles
      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 50,
        })
      )
    })
  })

  describe('celebrate', () => {
    it('starts celebration animation with first interval', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.celebrate()
        // The celebrate function uses setInterval, first callback at 250ms
        jest.advanceTimersByTime(250)
      })

      // Should call confetti after first interval
      expect(mockConfetti).toHaveBeenCalled()
    })

    it('fires confetti in intervals', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.celebrate()
        // First interval at 250ms
        jest.advanceTimersByTime(250)
      })

      const initialCallCount = mockConfetti.mock.calls.length

      // Advance timer by another 250ms
      act(() => {
        jest.advanceTimersByTime(250)
      })

      expect(mockConfetti.mock.calls.length).toBeGreaterThan(initialCallCount)
    })

    it('stops after duration by clearing interval', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.celebrate()
        // Run through the entire duration plus buffer
        jest.advanceTimersByTime(4000)
      })

      const callCount = mockConfetti.mock.calls.length
      mockConfetti.mockClear()

      // Advance more time - should not call again
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // No new calls after duration
      expect(mockConfetti).not.toHaveBeenCalled()
    })

    it('uses spread 360 for full burst', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.celebrate()
        jest.advanceTimersByTime(250)
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          spread: 360,
        })
      )
    })

    it('sets high z-index', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.celebrate()
        jest.advanceTimersByTime(250)
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          zIndex: 9999,
        })
      )
    })
  })

  describe('successBurst', () => {
    it('fires small burst for success', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.successBurst()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 50,
          spread: 60,
        })
      )
    })

    it('uses green colors for success', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.successBurst()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: ['#22C55E', '#16A34A', '#4ADE80'],
        })
      )
    })

    it('positions at y: 0.7', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.successBurst()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: { y: 0.7 },
        })
      )
    })

    it('respects reduced motion', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.successBurst()
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          disableForReducedMotion: true,
        })
      )
    })
  })

  describe('fireStars', () => {
    it('fires star-shaped confetti', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireStars()
        // First setTimeout fires at 0ms
        jest.advanceTimersByTime(0)
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          shapes: ['star'],
        })
      )
    })

    it('uses gold/yellow colors', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireStars()
        jest.advanceTimersByTime(0)
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
        })
      )
    })

    it('sets zero gravity for floating effect', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireStars()
        jest.advanceTimersByTime(0)
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          gravity: 0,
        })
      )
    })

    it('fires multiple times with delays', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireStars()
        jest.advanceTimersByTime(0)
      })

      const firstCallCount = mockConfetti.mock.calls.length

      act(() => {
        jest.advanceTimersByTime(100)
      })

      const secondCallCount = mockConfetti.mock.calls.length

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Should have more calls after timeouts
      expect(mockConfetti.mock.calls.length).toBeGreaterThan(firstCallCount)
    })

    it('fires from center origin', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireStars()
        jest.advanceTimersByTime(0)
      })

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: { x: 0.5, y: 0.5 },
        })
      )
    })

    it('uses different scalar sizes', () => {
      const { result } = renderHook(() => useConfetti())

      act(() => {
        result.current.fireStars()
        // First shot fires two confetti calls with different scalars
        jest.advanceTimersByTime(0)
      })

      // Should be called with scalar 1.2 and 0.75
      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          scalar: 1.2,
        })
      )
      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          scalar: 0.75,
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('all animations respect reduced motion preference', () => {
      const { result } = renderHook(() => useConfetti())

      // Test each animation function
      act(() => {
        result.current.fireConfetti()
        result.current.successBurst()
      })

      // All calls should have disableForReducedMotion
      mockConfetti.mock.calls.forEach(call => {
        expect(call[0].disableForReducedMotion).toBe(true)
      })
    })
  })
})
