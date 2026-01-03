import { Variants, Transition } from 'framer-motion'

/**
 * Standard easing curves for consistent feel across animations
 */
export const easings = {
  // Smooth, natural feeling
  smooth: [0.4, 0, 0.2, 1],
  // Quick start, slow end (good for entrances)
  easeOut: [0, 0, 0.2, 1],
  // Slow start, quick end (good for exits)
  easeIn: [0.4, 0, 1, 1],
  // Bouncy, playful
  bounce: [0.68, -0.55, 0.265, 1.55],
  // Spring-like
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const

/**
 * Standard transition presets
 */
export const transitions: Record<string, Transition> = {
  fast: { duration: 0.15, ease: easings.smooth },
  normal: { duration: 0.25, ease: easings.smooth },
  slow: { duration: 0.4, ease: easings.smooth },
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  springBouncy: { type: 'spring', stiffness: 300, damping: 20 },
}

/**
 * Fade in/out animation
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    transition: transitions.fast
  }
}

/**
 * Fade + slide up animation (great for page content)
 */
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: transitions.fast
  }
}

/**
 * Fade + slide down animation
 */
export const fadeDownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: transitions.fast
  }
}

/**
 * Scale + fade animation (great for modals, cards)
 */
export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast
  }
}

/**
 * Slide from left
 */
export const slideLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -30
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: transitions.fast
  }
}

/**
 * Slide from right
 */
export const slideRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 30
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: transitions.fast
  }
}

/**
 * Staggered children animation
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
}

/**
 * Child item for staggered animations
 */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: transitions.fast
  }
}

/**
 * Card hover animation
 */
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: transitions.spring
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast
  }
}

/**
 * Button press animation
 */
export const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
}

/**
 * Pulse animation (for loading indicators)
 */
export const pulseVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

/**
 * Shake animation (for errors)
 */
export const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
}

/**
 * Success checkmark animation
 */
export const checkmarkVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.4, ease: 'easeOut' },
      opacity: { duration: 0.2 }
    }
  }
}

/**
 * Page transition variants
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeOut
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: easings.easeIn
    }
  }
}

/**
 * Drawer/Sheet slide animation
 */
export const drawerVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: transitions.fast
  }
}

/**
 * Modal backdrop animation
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
}

/**
 * Tooltip animation
 */
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 5
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.fast
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.1 }
  }
}

/**
 * List reorder animation
 */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    marginBottom: 0
  },
  visible: {
    opacity: 1,
    height: 'auto',
    marginBottom: 12,
    transition: transitions.spring
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: transitions.fast
  }
}
