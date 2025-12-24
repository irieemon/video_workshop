'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react'
import { driver, type Driver, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'
import { usePathname } from 'next/navigation'
import { tourDefinitions, type TourId, type TourDefinition } from './tours/tour-definitions'

// ============================================================
// TYPES
// ============================================================

interface TourProgress {
  completedTours: TourId[]
  currentTour: TourId | null
  currentStep: number
}

interface TourContextValue {
  // State
  isRunning: boolean
  currentTour: TourId | null
  progress: TourProgress

  // Actions
  startTour: (tourId: TourId) => void
  stopTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void

  // Queries
  isTourCompleted: (tourId: TourId) => boolean
  getAvailableTours: () => TourDefinition[]
  resetTourProgress: () => void
}

// ============================================================
// CONTEXT
// ============================================================

const TourContext = createContext<TourContextValue | null>(null)

// ============================================================
// STORAGE HELPERS
// ============================================================

const STORAGE_KEY = 'scenra-tour-progress'

function loadProgress(): TourProgress {
  if (typeof window === 'undefined') {
    return { completedTours: [], currentTour: null, currentStep: 0 }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load tour progress:', e)
  }

  return { completedTours: [], currentTour: null, currentStep: 0 }
}

function saveProgress(progress: TourProgress): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (e) {
    console.warn('Failed to save tour progress:', e)
  }
}

// ============================================================
// PROVIDER COMPONENT
// ============================================================

interface TourProviderProps {
  children: React.ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const pathname = usePathname()
  const driverRef = useRef<Driver | null>(null)

  const [progress, setProgress] = useState<TourProgress>(() => loadProgress())
  const [isRunning, setIsRunning] = useState(false)

  // Persist progress changes
  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  // Cleanup driver on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [])

  // Create driver configuration
  const createDriverConfig = useCallback((tourId: TourId): Config => {
    const tour = tourDefinitions[tourId]
    if (!tour) {
      throw new Error(`Tour "${tourId}" not found`)
    }

    return {
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.75)',
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'scenra-tour-popover',

      steps: tour.steps,

      onHighlightStarted: (element, step, options) => {
        setProgress(prev => ({
          ...prev,
          currentStep: options.state.activeIndex ?? 0,
        }))
      },

      onDestroyStarted: () => {
        // Check if tour was completed (on last step)
        const currentIndex = driverRef.current?.getActiveIndex() ?? 0
        const totalSteps = tour.steps.length

        if (currentIndex >= totalSteps - 1) {
          // Tour completed
          setProgress(prev => ({
            ...prev,
            completedTours: prev.completedTours.includes(tourId)
              ? prev.completedTours
              : [...prev.completedTours, tourId],
            currentTour: null,
            currentStep: 0,
          }))
        } else {
          // Tour abandoned
          setProgress(prev => ({
            ...prev,
            currentTour: null,
            currentStep: 0,
          }))
        }

        setIsRunning(false)

        // IMPORTANT: Must call destroy() to actually close the popover
        // driver.js requires explicit destroy call in onDestroyStarted
        driverRef.current?.destroy()
      },
    }
  }, [])

  // Start a tour
  const startTour = useCallback((tourId: TourId) => {
    // Destroy existing driver if any
    if (driverRef.current) {
      driverRef.current.destroy()
    }

    const config = createDriverConfig(tourId)
    driverRef.current = driver(config)

    setProgress(prev => ({
      ...prev,
      currentTour: tourId,
      currentStep: 0,
    }))
    setIsRunning(true)

    // Start the tour
    driverRef.current.drive()
  }, [createDriverConfig])

  // Stop the current tour
  const stopTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy()
    }
    setIsRunning(false)
  }, [])

  // Navigation helpers
  const nextStep = useCallback(() => {
    if (driverRef.current?.hasNextStep()) {
      driverRef.current.moveNext()
    }
  }, [])

  const prevStep = useCallback(() => {
    if (driverRef.current?.hasPreviousStep()) {
      driverRef.current.movePrevious()
    }
  }, [])

  const goToStep = useCallback((index: number) => {
    driverRef.current?.drive(index)
  }, [])

  // Query helpers
  const isTourCompleted = useCallback((tourId: TourId) => {
    return progress.completedTours.includes(tourId)
  }, [progress.completedTours])

  const getAvailableTours = useCallback(() => {
    return Object.values(tourDefinitions).filter(tour =>
      !tour.requiredPath || pathname.startsWith(tour.requiredPath)
    )
  }, [pathname])

  const resetTourProgress = useCallback(() => {
    setProgress({
      completedTours: [],
      currentTour: null,
      currentStep: 0,
    })
  }, [])

  const value: TourContextValue = {
    isRunning,
    currentTour: progress.currentTour,
    progress,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    goToStep,
    isTourCompleted,
    getAvailableTours,
    resetTourProgress,
  }

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

export function useTour(): TourContextValue {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}

// ============================================================
// TOUR TRIGGER COMPONENT
// ============================================================

interface TourTriggerProps {
  tourId: TourId
  children: React.ReactNode
  className?: string
  showIfCompleted?: boolean
}

export function TourTrigger({
  tourId,
  children,
  className,
  showIfCompleted = true,
}: TourTriggerProps) {
  const { startTour, isTourCompleted } = useTour()

  if (!showIfCompleted && isTourCompleted(tourId)) {
    return null
  }

  return (
    <button
      onClick={() => startTour(tourId)}
      className={className}
      type="button"
    >
      {children}
    </button>
  )
}
