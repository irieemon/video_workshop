'use client'

import { useCallback } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiOptions {
  particleCount?: number
  spread?: number
  origin?: { x: number; y: number }
  colors?: string[]
  duration?: number
}

/**
 * Hook for triggering confetti animations.
 * Provides different celebration styles for various achievements.
 */
export function useConfetti() {
  /**
   * Basic confetti burst
   */
  const fireConfetti = useCallback((options: ConfettiOptions = {}) => {
    const defaults = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFB800', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'],
      ...options
    }

    confetti({
      ...defaults,
      disableForReducedMotion: true
    })
  }, [])

  /**
   * Side cannons - fires from both sides
   */
  const fireSideCannons = useCallback(() => {
    const count = 200
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#FFB800', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'],
      disableForReducedMotion: true
    }

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      })
    }

    // Left cannon
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      origin: { x: 0.1, y: 0.7 }
    })

    fire(0.2, {
      spread: 60,
      origin: { x: 0.1, y: 0.7 }
    })

    // Right cannon
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      origin: { x: 0.9, y: 0.7 }
    })

    fire(0.2, {
      spread: 60,
      origin: { x: 0.9, y: 0.7 }
    })
  }, [])

  /**
   * Celebration burst - multiple waves
   */
  const celebrate = useCallback(() => {
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: ['#FFB800', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'],
      disableForReducedMotion: true
    }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)
  }, [])

  /**
   * Subtle success - small burst, good for inline celebrations
   */
  const successBurst = useCallback(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#22C55E', '#16A34A', '#4ADE80'],
      disableForReducedMotion: true
    })
  }, [])

  /**
   * Stars effect - shaped confetti
   */
  const fireStars = useCallback(() => {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
      shapes: ['star'] as confetti.Shape[],
      disableForReducedMotion: true
    }

    function shoot() {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        origin: { x: 0.5, y: 0.5 }
      })

      confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        origin: { x: 0.5, y: 0.5 }
      })
    }

    setTimeout(shoot, 0)
    setTimeout(shoot, 100)
    setTimeout(shoot, 200)
  }, [])

  return {
    fireConfetti,
    fireSideCannons,
    celebrate,
    successBurst,
    fireStars
  }
}
