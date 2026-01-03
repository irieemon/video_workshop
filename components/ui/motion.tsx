'use client'

import { forwardRef, ReactNode } from 'react'
import {
  motion,
  AnimatePresence,
  HTMLMotionProps,
  MotionProps,
  useReducedMotion
} from 'framer-motion'
import {
  fadeVariants,
  fadeUpVariants,
  fadeDownVariants,
  scaleVariants,
  slideLeftVariants,
  slideRightVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverVariants,
  buttonPressVariants,
  pageTransitionVariants
} from '@/lib/animations/variants'
import { cn } from '@/lib/utils'

/**
 * Motion wrapper that respects reduced motion preferences
 */
interface MotionWrapperProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  /** If true, animation is disabled entirely */
  disabled?: boolean
}

export const MotionDiv = forwardRef<HTMLDivElement, MotionWrapperProps>(
  ({ children, className, disabled, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion()

    if (disabled || shouldReduceMotion) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      )
    }

    return (
      <motion.div ref={ref} className={className} {...props}>
        {children}
      </motion.div>
    )
  }
)
MotionDiv.displayName = 'MotionDiv'

/**
 * Fade animation wrapper
 */
interface FadeProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
  /** Direction: 'up' | 'down' | 'none' */
  direction?: 'up' | 'down' | 'none'
  /** Delay before animation starts */
  delay?: number
}

export function Fade({
  children,
  className,
  direction = 'none',
  delay = 0,
  ...props
}: FadeProps) {
  const shouldReduceMotion = useReducedMotion()

  const variants = direction === 'up'
    ? fadeUpVariants
    : direction === 'down'
    ? fadeDownVariants
    : fadeVariants

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Scale animation wrapper (good for modals, cards appearing)
 */
interface ScaleProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
  delay?: number
}

export function Scale({ children, className, delay = 0, ...props }: ScaleProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Slide animation wrapper
 */
interface SlideProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
  /** Direction: 'left' | 'right' */
  direction?: 'left' | 'right'
  delay?: number
}

export function Slide({
  children,
  className,
  direction = 'left',
  delay = 0,
  ...props
}: SlideProps) {
  const shouldReduceMotion = useReducedMotion()
  const variants = direction === 'left' ? slideLeftVariants : slideRightVariants

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered list container
 */
interface StaggerContainerProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
  /** Delay between each child animation */
  staggerDelay?: number
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
  ...props
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={{
        ...staggerContainerVariants,
        visible: {
          ...staggerContainerVariants.visible,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1
          }
        }
      }}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered list item (use inside StaggerContainer)
 */
interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={staggerItemVariants}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Interactive card with hover/tap animations
 */
interface MotionCardProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
  /** Disable hover effects */
  disableHover?: boolean
}

export function MotionCard({
  children,
  className,
  disableHover = false,
  ...props
}: MotionCardProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion || disableHover) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn('cursor-pointer', className)}
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Button with press animation
 */
interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'variants'> {
  children: ReactNode
  className?: string
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion()

    if (shouldReduceMotion) {
      return (
        <button ref={ref} className={className} {...(props as any)}>
          {children}
        </button>
      )
    }

    return (
      <motion.button
        ref={ref}
        className={className}
        variants={buttonPressVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)
MotionButton.displayName = 'MotionButton'

/**
 * Page transition wrapper
 */
interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

/**
 * Animated presence wrapper (for exit animations)
 */
interface PresenceProps {
  children: ReactNode
  /** Key to track element identity */
  presenceKey?: string | number
  /** Animation mode */
  mode?: 'sync' | 'wait' | 'popLayout'
}

export function Presence({ children, presenceKey, mode = 'wait' }: PresenceProps) {
  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div key={presenceKey}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Animated number counter
 */
interface AnimatedNumberProps {
  value: number
  className?: string
  /** Duration of the animation */
  duration?: number
  /** Format function */
  format?: (value: number) => string
}

export function AnimatedNumber({
  value,
  className,
  duration = 0.5,
  format = (v) => Math.round(v).toString()
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <span className={className}>{format(value)}</span>
  }

  return (
    <motion.span
      className={className}
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
    >
      {format(value)}
    </motion.span>
  )
}

/**
 * Shimmer loading animation
 */
interface ShimmerProps {
  className?: string
  /** Width of the shimmer element */
  width?: string | number
  /** Height of the shimmer element */
  height?: string | number
}

export function Shimmer({ className, width, height }: ShimmerProps) {
  const shouldReduceMotion = useReducedMotion()

  const baseStyles = cn(
    'rounded bg-muted',
    className
  )

  if (shouldReduceMotion) {
    return (
      <div
        className={cn(baseStyles, 'animate-pulse')}
        style={{ width, height }}
      />
    )
  }

  return (
    <motion.div
      className={cn(baseStyles, 'overflow-hidden relative')}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </motion.div>
  )
}

// Re-export framer-motion utilities for convenience
export { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
