/**
 * Onboarding Components Export
 *
 * Central export for all onboarding and guided tour components.
 */

// Tour system
export { TourProvider, useTour, TourTrigger } from './TourProvider'
export type { TourId, TourDefinition } from './tours/tour-definitions'
export { tourDefinitions, getToursForPath } from './tours/tour-definitions'

// Help modal and floating button
export { HelpModal, FloatingHelpButton } from './HelpModal'

// First-visit welcome trigger
export { WelcomeTourTrigger } from './WelcomeTourTrigger'

// Styles (imported in layout for CSS to be available)
import './tour-styles.css'
