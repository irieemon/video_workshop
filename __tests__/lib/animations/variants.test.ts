/**
 * @jest-environment jsdom
 */

import {
  easings,
  transitions,
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
  pulseVariants,
  shakeVariants,
  checkmarkVariants,
  pageTransitionVariants,
  drawerVariants,
  backdropVariants,
  tooltipVariants,
  listItemVariants,
} from '@/lib/animations/variants'

describe('Animation Variants', () => {
  // ============================================================================
  // Easings
  // ============================================================================
  describe('easings', () => {
    it('exports smooth easing curve', () => {
      expect(easings.smooth).toEqual([0.4, 0, 0.2, 1])
    })

    it('exports easeOut curve for entrances', () => {
      expect(easings.easeOut).toEqual([0, 0, 0.2, 1])
    })

    it('exports easeIn curve for exits', () => {
      expect(easings.easeIn).toEqual([0.4, 0, 1, 1])
    })

    it('exports bounce curve', () => {
      expect(easings.bounce).toEqual([0.68, -0.55, 0.265, 1.55])
    })

    it('exports spring configuration', () => {
      expect(easings.spring).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 30,
      })
    })

    it('has all cubic bezier arrays with 4 values', () => {
      expect(easings.smooth).toHaveLength(4)
      expect(easings.easeOut).toHaveLength(4)
      expect(easings.easeIn).toHaveLength(4)
      expect(easings.bounce).toHaveLength(4)
    })
  })

  // ============================================================================
  // Transitions
  // ============================================================================
  describe('transitions', () => {
    it('exports fast transition', () => {
      expect(transitions.fast).toEqual({
        duration: 0.15,
        ease: easings.smooth,
      })
    })

    it('exports normal transition', () => {
      expect(transitions.normal).toEqual({
        duration: 0.25,
        ease: easings.smooth,
      })
    })

    it('exports slow transition', () => {
      expect(transitions.slow).toEqual({
        duration: 0.4,
        ease: easings.smooth,
      })
    })

    it('exports spring transition', () => {
      expect(transitions.spring).toEqual({
        type: 'spring',
        stiffness: 400,
        damping: 30,
      })
    })

    it('exports springBouncy transition', () => {
      expect(transitions.springBouncy).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 20,
      })
    })

    it('has increasing durations from fast to slow', () => {
      expect(transitions.fast.duration).toBeLessThan(transitions.normal.duration as number)
      expect(transitions.normal.duration).toBeLessThan(transitions.slow.duration as number)
    })
  })

  // ============================================================================
  // Fade Variants
  // ============================================================================
  describe('fadeVariants', () => {
    it('has hidden state with zero opacity', () => {
      expect(fadeVariants.hidden).toEqual({ opacity: 0 })
    })

    it('has visible state with full opacity', () => {
      expect(fadeVariants.visible).toMatchObject({ opacity: 1 })
    })

    it('has exit state with zero opacity', () => {
      expect(fadeVariants.exit).toMatchObject({ opacity: 0 })
    })

    it('uses normal transition for visible state', () => {
      expect((fadeVariants.visible as any).transition).toEqual(transitions.normal)
    })

    it('uses fast transition for exit state', () => {
      expect((fadeVariants.exit as any).transition).toEqual(transitions.fast)
    })
  })

  // ============================================================================
  // Fade Up Variants
  // ============================================================================
  describe('fadeUpVariants', () => {
    it('has hidden state with opacity 0 and y offset', () => {
      expect(fadeUpVariants.hidden).toEqual({ opacity: 0, y: 20 })
    })

    it('has visible state at origin', () => {
      expect(fadeUpVariants.visible).toMatchObject({ opacity: 1, y: 0 })
    })

    it('has exit state moving up', () => {
      expect(fadeUpVariants.exit).toMatchObject({ opacity: 0, y: -10 })
    })
  })

  // ============================================================================
  // Fade Down Variants
  // ============================================================================
  describe('fadeDownVariants', () => {
    it('has hidden state above viewport', () => {
      expect(fadeDownVariants.hidden).toEqual({ opacity: 0, y: -20 })
    })

    it('has visible state at origin', () => {
      expect(fadeDownVariants.visible).toMatchObject({ opacity: 1, y: 0 })
    })

    it('has exit state moving down', () => {
      expect(fadeDownVariants.exit).toMatchObject({ opacity: 0, y: 20 })
    })
  })

  // ============================================================================
  // Scale Variants
  // ============================================================================
  describe('scaleVariants', () => {
    it('has hidden state scaled down', () => {
      expect(scaleVariants.hidden).toEqual({ opacity: 0, scale: 0.95 })
    })

    it('has visible state at full scale', () => {
      expect(scaleVariants.visible).toMatchObject({ opacity: 1, scale: 1 })
    })

    it('uses spring transition for visible', () => {
      expect((scaleVariants.visible as any).transition).toEqual(transitions.spring)
    })

    it('has exit state scaled down', () => {
      expect(scaleVariants.exit).toMatchObject({ opacity: 0, scale: 0.95 })
    })
  })

  // ============================================================================
  // Slide Variants
  // ============================================================================
  describe('slideLeftVariants', () => {
    it('starts from left of viewport', () => {
      expect(slideLeftVariants.hidden).toEqual({ opacity: 0, x: -30 })
    })

    it('slides to origin when visible', () => {
      expect(slideLeftVariants.visible).toMatchObject({ opacity: 1, x: 0 })
    })

    it('exits to the right', () => {
      expect(slideLeftVariants.exit).toMatchObject({ opacity: 0, x: 30 })
    })
  })

  describe('slideRightVariants', () => {
    it('starts from right of viewport', () => {
      expect(slideRightVariants.hidden).toEqual({ opacity: 0, x: 30 })
    })

    it('slides to origin when visible', () => {
      expect(slideRightVariants.visible).toMatchObject({ opacity: 1, x: 0 })
    })

    it('exits to the left', () => {
      expect(slideRightVariants.exit).toMatchObject({ opacity: 0, x: -30 })
    })
  })

  // ============================================================================
  // Stagger Variants
  // ============================================================================
  describe('staggerContainerVariants', () => {
    it('has hidden state with zero opacity', () => {
      expect(staggerContainerVariants.hidden).toEqual({ opacity: 0 })
    })

    it('has visible state with stagger configuration', () => {
      const visible = staggerContainerVariants.visible as any
      expect(visible.opacity).toBe(1)
      expect(visible.transition.staggerChildren).toBe(0.05)
      expect(visible.transition.delayChildren).toBe(0.1)
    })

    it('has exit with reverse stagger', () => {
      const exit = staggerContainerVariants.exit as any
      expect(exit.transition.staggerDirection).toBe(-1)
    })
  })

  describe('staggerItemVariants', () => {
    it('has hidden state offset down', () => {
      expect(staggerItemVariants.hidden).toEqual({ opacity: 0, y: 10 })
    })

    it('has visible state at origin', () => {
      expect(staggerItemVariants.visible).toMatchObject({ opacity: 1, y: 0 })
    })

    it('has exit state offset up', () => {
      expect(staggerItemVariants.exit).toMatchObject({ opacity: 0, y: -5 })
    })
  })

  // ============================================================================
  // Interactive Variants
  // ============================================================================
  describe('cardHoverVariants', () => {
    it('has rest state at normal scale', () => {
      expect(cardHoverVariants.rest).toMatchObject({ scale: 1 })
    })

    it('has hover state slightly scaled up', () => {
      expect(cardHoverVariants.hover).toMatchObject({ scale: 1.02 })
    })

    it('has tap state scaled down', () => {
      expect(cardHoverVariants.tap).toMatchObject({ scale: 0.98 })
    })

    it('includes box shadow in rest state', () => {
      expect((cardHoverVariants.rest as any).boxShadow).toBeDefined()
    })

    it('includes elevated shadow in hover state', () => {
      expect((cardHoverVariants.hover as any).boxShadow).toBeDefined()
    })
  })

  describe('buttonPressVariants', () => {
    it('has rest state at scale 1', () => {
      expect(buttonPressVariants.rest).toEqual({ scale: 1 })
    })

    it('has hover state slightly larger', () => {
      expect(buttonPressVariants.hover).toEqual({ scale: 1.02 })
    })

    it('has tap state slightly smaller', () => {
      expect(buttonPressVariants.tap).toEqual({ scale: 0.98 })
    })
  })

  // ============================================================================
  // Animation Effect Variants
  // ============================================================================
  describe('pulseVariants', () => {
    it('has initial state at half opacity', () => {
      expect(pulseVariants.initial).toEqual({ opacity: 0.5 })
    })

    it('has animate state with opacity keyframes', () => {
      const animate = pulseVariants.animate as any
      expect(animate.opacity).toEqual([0.5, 1, 0.5])
    })

    it('has infinite repeat animation', () => {
      const animate = pulseVariants.animate as any
      expect(animate.transition.repeat).toBe(Infinity)
    })
  })

  describe('shakeVariants', () => {
    it('has shake state with x keyframes', () => {
      expect((shakeVariants.shake as any).x).toEqual([0, -10, 10, -10, 10, 0])
    })

    it('completes shake in 0.5 seconds', () => {
      expect((shakeVariants.shake as any).transition.duration).toBe(0.5)
    })
  })

  describe('checkmarkVariants', () => {
    it('has hidden state with zero path length', () => {
      expect(checkmarkVariants.hidden).toEqual({ pathLength: 0, opacity: 0 })
    })

    it('has visible state with full path', () => {
      expect(checkmarkVariants.visible).toMatchObject({ pathLength: 1, opacity: 1 })
    })
  })

  // ============================================================================
  // Page & Modal Variants
  // ============================================================================
  describe('pageTransitionVariants', () => {
    it('has initial state offset down', () => {
      expect(pageTransitionVariants.initial).toEqual({ opacity: 0, y: 8 })
    })

    it('has enter state at origin', () => {
      expect(pageTransitionVariants.enter).toMatchObject({ opacity: 1, y: 0 })
    })

    it('has exit state offset up', () => {
      expect(pageTransitionVariants.exit).toMatchObject({ opacity: 0, y: -8 })
    })

    it('uses easeOut for enter transition', () => {
      expect((pageTransitionVariants.enter as any).transition.ease).toEqual(easings.easeOut)
    })

    it('uses easeIn for exit transition', () => {
      expect((pageTransitionVariants.exit as any).transition.ease).toEqual(easings.easeIn)
    })
  })

  describe('drawerVariants', () => {
    it('has hidden state off screen to right', () => {
      expect(drawerVariants.hidden).toEqual({ x: '100%', opacity: 0 })
    })

    it('has visible state on screen', () => {
      expect(drawerVariants.visible).toMatchObject({ x: 0, opacity: 1 })
    })

    it('uses spring transition for visible', () => {
      const visible = drawerVariants.visible as any
      expect(visible.transition.type).toBe('spring')
    })

    it('exits off screen to right', () => {
      expect(drawerVariants.exit).toMatchObject({ x: '100%', opacity: 0 })
    })
  })

  describe('backdropVariants', () => {
    it('has hidden state transparent', () => {
      expect(backdropVariants.hidden).toEqual({ opacity: 0 })
    })

    it('has visible state opaque', () => {
      expect(backdropVariants.visible).toMatchObject({ opacity: 1 })
    })

    it('fades in over 0.2 seconds', () => {
      expect((backdropVariants.visible as any).transition.duration).toBe(0.2)
    })

    it('fades out over 0.15 seconds', () => {
      expect((backdropVariants.exit as any).transition.duration).toBe(0.15)
    })
  })

  describe('tooltipVariants', () => {
    it('has hidden state scaled down and offset', () => {
      expect(tooltipVariants.hidden).toEqual({
        opacity: 0,
        scale: 0.95,
        y: 5,
      })
    })

    it('has visible state at origin', () => {
      expect(tooltipVariants.visible).toMatchObject({
        opacity: 1,
        scale: 1,
        y: 0,
      })
    })

    it('uses fast transition for visible', () => {
      expect((tooltipVariants.visible as any).transition).toEqual(transitions.fast)
    })
  })

  describe('listItemVariants', () => {
    it('has hidden state collapsed', () => {
      expect(listItemVariants.hidden).toEqual({
        opacity: 0,
        height: 0,
        marginBottom: 0,
      })
    })

    it('has visible state expanded', () => {
      expect(listItemVariants.visible).toMatchObject({
        opacity: 1,
        height: 'auto',
        marginBottom: 12,
      })
    })

    it('uses spring transition for visible', () => {
      expect((listItemVariants.visible as any).transition).toEqual(transitions.spring)
    })

    it('collapses on exit', () => {
      expect(listItemVariants.exit).toMatchObject({
        opacity: 0,
        height: 0,
        marginBottom: 0,
      })
    })
  })

  // ============================================================================
  // Export Verification
  // ============================================================================
  describe('exports', () => {
    it('exports all animation variant objects', () => {
      const exports = [
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
        pulseVariants,
        shakeVariants,
        checkmarkVariants,
        pageTransitionVariants,
        drawerVariants,
        backdropVariants,
        tooltipVariants,
        listItemVariants,
      ]

      exports.forEach((variant) => {
        expect(variant).toBeDefined()
        expect(typeof variant).toBe('object')
      })
    })

    it('exports easings object', () => {
      expect(easings).toBeDefined()
      expect(Object.keys(easings)).toHaveLength(5)
    })

    it('exports transitions object', () => {
      expect(transitions).toBeDefined()
      expect(Object.keys(transitions)).toHaveLength(5)
    })
  })
})
