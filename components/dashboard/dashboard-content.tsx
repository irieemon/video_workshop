'use client'

import { ReactNode } from 'react'
import { UsageWarningBanner } from '@/components/billing'

interface DashboardContentProps {
  children: ReactNode
}

/**
 * Wrapper for dashboard content that includes:
 * - Usage warning banner (shows when approaching/at limits)
 * - Content area with proper scrolling
 */
export function DashboardContent({ children }: DashboardContentProps) {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-background">
      {/* Usage Warning Banner */}
      <div className="px-4 md:px-6 pt-4">
        <UsageWarningBanner dismissible />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </main>
  )
}
