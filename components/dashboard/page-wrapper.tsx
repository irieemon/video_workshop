'use client'

import { ReactNode } from 'react'
import { Fade, StaggerContainer, useReducedMotion } from '@/components/ui/motion'

interface PageWrapperProps {
  children: ReactNode
  className?: string
  /** Animation direction for the fade effect */
  direction?: 'up' | 'down' | 'none'
  /** Additional delay before animation starts */
  delay?: number
}

/**
 * Client-side wrapper that adds page transition animations.
 * Designed to wrap Server Component page content.
 *
 * Usage in page.tsx:
 * ```tsx
 * export default async function Page() {
 *   return (
 *     <PageWrapper direction="up">
 *       <YourContent />
 *     </PageWrapper>
 *   )
 * }
 * ```
 */
export function PageWrapper({
  children,
  className,
  direction = 'up',
  delay = 0
}: PageWrapperProps) {
  return (
    <Fade direction={direction} delay={delay} className={className}>
      {children}
    </Fade>
  )
}

interface StaggeredPageWrapperProps {
  children: ReactNode
  className?: string
  /** Delay between each child animation */
  staggerDelay?: number
}

/**
 * Page wrapper that staggers animations for child elements.
 * Useful for pages with multiple cards or list items.
 *
 * Children should be wrapped with StaggerItem for proper animation.
 */
export function StaggeredPageWrapper({
  children,
  className,
  staggerDelay = 0.05
}: StaggeredPageWrapperProps) {
  return (
    <StaggerContainer staggerDelay={staggerDelay} className={className}>
      {children}
    </StaggerContainer>
  )
}
