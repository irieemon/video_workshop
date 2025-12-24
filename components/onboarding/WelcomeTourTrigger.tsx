'use client'

import { useEffect, useState } from 'react'
import { useTour } from './TourProvider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sparkles } from 'lucide-react'

/**
 * WelcomeTourTrigger
 *
 * Automatically shows a welcome dialog for first-time users,
 * offering to start the welcome tour.
 *
 * Uses localStorage to track if the user has seen the welcome prompt.
 */

const WELCOME_SHOWN_KEY = 'scenra-welcome-shown'

export function WelcomeTourTrigger() {
  const [showWelcome, setShowWelcome] = useState(false)
  const { startTour, isTourCompleted } = useTour()

  useEffect(() => {
    // Check if welcome has been shown before
    const hasSeenWelcome = localStorage.getItem(WELCOME_SHOWN_KEY)
    const tourComplete = isTourCompleted('welcome')

    // Show welcome dialog if:
    // 1. User hasn't seen it before
    // 2. User hasn't completed the welcome tour
    if (!hasSeenWelcome && !tourComplete) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowWelcome(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isTourCompleted])

  const handleStartTour = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true')
    setShowWelcome(false)
    // Small delay for dialog close animation
    setTimeout(() => {
      startTour('welcome')
    }, 150)
  }

  const handleSkip = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true')
    setShowWelcome(false)
  }

  return (
    <AlertDialog open={showWelcome} onOpenChange={setShowWelcome}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-scenra-amber/10">
              <Sparkles className="h-6 w-6 text-scenra-amber" />
            </div>
            <AlertDialogTitle className="text-xl">
              Welcome to Scenra Studio!
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Would you like a quick tour of the platform? It only takes about 2
            minutes and will help you get started creating amazing AI-powered
            videos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={handleSkip}>
            Skip for now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleStartTour}
            className="bg-scenra-amber hover:bg-scenra-amber/90 text-black"
          >
            Take the tour
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
