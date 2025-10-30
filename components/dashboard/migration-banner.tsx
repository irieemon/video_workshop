'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Sparkles } from 'lucide-react'
import Link from 'next/link'

const BANNER_STORAGE_KEY = 'scenra-series-first-banner-dismissed'

export function MigrationBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if banner was already dismissed
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY)
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(BANNER_STORAGE_KEY, 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <Alert className="mb-6 border-scenra-amber/50 bg-scenra-amber/10 dark:bg-scenra-amber/5">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-scenra-amber mt-0.5" />
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-2">
            ✨ Welcome to the New Video-First Experience!
          </AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>
              We've simplified video creation based on your feedback. Here's what's new:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Quick Create</strong>: Create videos in 2 clicks instead of 5
              </li>
              <li>
                <strong>Series-First</strong>: Organize content by series without projects
              </li>
              <li>
                <strong>Smart Defaults</strong>: Remembers your last-used series
              </li>
              <li>
                <strong>Standalone Videos</strong>: Create one-off videos without creating a series
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" size="sm" asChild className="border-scenra-amber text-scenra-amber hover:bg-scenra-amber/10">
                <Link href="/dashboard/videos">
                  Explore Videos
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-scenra-amber text-scenra-amber hover:bg-scenra-amber/10">
                <Link href="/dashboard/series">
                  Browse Series
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  )
}
