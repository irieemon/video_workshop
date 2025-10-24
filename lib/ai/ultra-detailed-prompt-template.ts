/**
 * Ultra-Detailed Sora Prompt Template
 * Based on OpenAI Sora 2 Prompting Guide best practices
 *
 * This template generates highly detailed, cinematographer-style prompts
 * with professional technical specifications for maximum Sora quality.
 *
 * Target length: 2000-3000 characters (vs. previous 800-1000)
 * Format: Structured technical sections with professional terminology
 */

export interface UltraDetailedPromptSections {
  // Technical Specifications
  formatAndLook: {
    duration: string                    // "4s", "8s", "12s"
    shutter: string                     // "180° shutter", "90° shutter"
    captureFormat: string               // "digital capture emulating 65mm photochemical"
    grainQuality: string                // "fine grain", "medium grain"
    opticalEffects: string[]            // ["subtle halation on speculars", "no gate weave"]
  }

  // Lens & Filtration
  lensesAndFilteration: {
    lenses: string[]                    // ["32mm spherical prime", "50mm spherical prime"]
    filters: string[]                   // ["Black Pro-Mist 1/4", "CPL rotation to manage reflections"]
    notes?: string                      // Additional technical notes
  }

  // Color Grading
  gradeAndPalette: {
    highlights: string                  // "clean morning sunlight with amber lift"
    mids: string                        // "balanced neutrals with slight teal cast in shadows"
    blacks: string                      // "soft, neutral with mild lift for haze retention"
    lookDescription?: string            // Overall grade description
  }

  // Lighting Design
  lightingAndAtmosphere: {
    keyLight: {
      source: string                    // "natural sunlight", "tungsten practical"
      direction: string                 // "camera left, low angle (07:30 AM)"
      quality: string                   // "hard", "soft", "diffused"
    }
    fillLight?: {
      source: string
      placement: string
    }
    practicals?: string[]               // ["sodium platform lights on dim fade"]
    atmosphere: string[]                // ["gentle mist", "train exhaust drift through light beam"]
    negativeFill?: string               // "from opposite wall"
  }

  // Location & Framing
  locationAndFraming: {
    location: string                    // "Urban commuter platform, dawn"
    foreground: string[]                // ["yellow safety line", "coffee cup on bench"]
    midground: string[]                 // ["waiting passengers silhouetted in haze"]
    background: string[]                // ["arriving train braking to a stop"]
    avoidances: string[]                // ["signage", "corporate branding"]
  }

  // Character & Props
  wardrobePropsExtras: {
    mainSubject?: string                // "mid-30s traveler, navy coat, backpack..."
    characters?: Array<{
      name: string
      description: string               // From character consistency system
    }>
    extras?: string[]                   // ["commuters in muted tones", "one cyclist pushing bike"]
    props: string[]                     // ["paper coffee cup", "rolling luggage"]
  }

  // Audio Design
  sound: {
    type: 'diegetic' | 'non-diegetic' | 'mixed'
    characterVocals?: string[]          // ["Lyle: high-pitched, playful tone", "Dad: warm baritone, neutral accent"]
    elements: string[]                  // ["faint rail screech", "train brakes hiss"]
    levels?: string                     // "(-20 LUFS)"
    exclusions?: string[]               // ["no score", "no added foley"]
  }

  // Shot List
  optimizedShotList: Array<{
    timing: string                      // "0.00-2.40"
    title: string                       // "Arrival Drift"
    lens: string                        // "32mm"
    cameraMovement: string              // "shoulder-mounted slow dolly left"
    description: string                 // Detailed shot description
    purpose: string                     // "establish setting and tone, hint anticipation"
  }>

  // Camera Notes
  cameraNotes: {
    eyeline?: string                    // "low and close to lens axis for intimacy"
    opticalEffects?: string[]           // ["allow micro flares from train glass"]
    handheldQuality?: string            // "preserve subtle handheld imperfection for realism"
    exposureGuidance?: string           // "do not break silhouette clarity with overexposed flare"
  }

  // Post-Production
  finishing: {
    grain?: string                      // "fine-grain overlay with mild chroma noise"
    halation?: string                   // "restrained halation on practicals"
    lut?: string                        // "warm-cool LUT for morning split tone"
    audioMix?: string                   // "prioritize train and ambient detail"
    posterFrame?: string                // "traveler mid-turn, golden rim light"
  }
}

/**
 * Generate ultra-detailed Sora prompt from structured sections
 */
export function generateUltraDetailedPrompt(sections: UltraDetailedPromptSections): string {
  const parts: string[] = []

  // Format & Look
  parts.push('Format & Look')
  parts.push(`Duration ${sections.formatAndLook.duration}; ${sections.formatAndLook.shutter}; ${sections.formatAndLook.captureFormat}; ${sections.formatAndLook.grainQuality}; ${sections.formatAndLook.opticalEffects.join('; ')}.`)
  parts.push('')

  // Lenses & Filtration
  parts.push('Lenses & Filtration')
  parts.push(`${sections.lensesAndFilteration.lenses.join(' / ')}; ${sections.lensesAndFilteration.filters.join('; ')}.`)
  if (sections.lensesAndFilteration.notes) {
    parts.push(sections.lensesAndFilteration.notes)
  }
  parts.push('')

  // Grade / Palette
  parts.push('Grade / Palette')
  parts.push(`Highlights: ${sections.gradeAndPalette.highlights}.`)
  parts.push(`Mids: ${sections.gradeAndPalette.mids}.`)
  parts.push(`Blacks: ${sections.gradeAndPalette.blacks}.`)
  parts.push('')

  // Lighting & Atmosphere
  parts.push('Lighting & Atmosphere')
  parts.push(`${sections.lightingAndAtmosphere.keyLight.source} from ${sections.lightingAndAtmosphere.keyLight.direction}.`)
  if (sections.lightingAndAtmosphere.fillLight) {
    parts.push(`Fill: ${sections.lightingAndAtmosphere.fillLight.source} ${sections.lightingAndAtmosphere.fillLight.placement}.`)
  }
  if (sections.lightingAndAtmosphere.negativeFill) {
    parts.push(`Negative fill ${sections.lightingAndAtmosphere.negativeFill}.`)
  }
  if (sections.lightingAndAtmosphere.practicals && sections.lightingAndAtmosphere.practicals.length > 0) {
    parts.push(`Practical: ${sections.lightingAndAtmosphere.practicals.join('; ')}.`)
  }
  parts.push(`Atmos: ${sections.lightingAndAtmosphere.atmosphere.join('; ')}.`)
  parts.push('')

  // Location & Framing
  parts.push('Location & Framing')
  parts.push(sections.locationAndFraming.location + '.')
  parts.push(`Foreground: ${sections.locationAndFraming.foreground.join(', ')}.`)
  parts.push(`Midground: ${sections.locationAndFraming.midground.join(', ')}.`)
  parts.push(`Background: ${sections.locationAndFraming.background.join(', ')}.`)
  if (sections.locationAndFraming.avoidances.length > 0) {
    parts.push(`Avoid ${sections.locationAndFraming.avoidances.join(' or ')}.`)
  }
  parts.push('')

  // Wardrobe / Props / Extras
  parts.push('Wardrobe / Props / Extras')
  if (sections.wardrobePropsExtras.mainSubject) {
    parts.push(`Main subject: ${sections.wardrobePropsExtras.mainSubject}.`)
  }
  if (sections.wardrobePropsExtras.characters && sections.wardrobePropsExtras.characters.length > 0) {
    parts.push(`Characters: ${sections.wardrobePropsExtras.characters.map(c => `${c.name} - ${c.description}`).join('; ')}.`)
  }
  if (sections.wardrobePropsExtras.extras && sections.wardrobePropsExtras.extras.length > 0) {
    parts.push(`Extras: ${sections.wardrobePropsExtras.extras.join('; ')}.`)
  }
  parts.push(`Props: ${sections.wardrobePropsExtras.props.join(', ')}.`)
  parts.push('')

  // Sound
  parts.push('Sound')
  if (sections.sound.characterVocals && sections.sound.characterVocals.length > 0) {
    parts.push(`Character vocals: ${sections.sound.characterVocals.join('; ')}.`)
  }
  parts.push(`${sections.sound.type.charAt(0).toUpperCase() + sections.sound.type.slice(1)} audio: ${sections.sound.elements.join(', ')}${sections.sound.levels ? ` ${sections.sound.levels}` : ''}.`)
  if (sections.sound.exclusions && sections.sound.exclusions.length > 0) {
    parts.push(sections.sound.exclusions.join('; ') + '.')
  }
  parts.push('')

  // Optimized Shot List
  parts.push(`Optimized Shot List (${sections.optimizedShotList.length} shots / ${sections.formatAndLook.duration} total)`)
  parts.push('')
  sections.optimizedShotList.forEach((shot) => {
    parts.push(`${shot.timing} — "${shot.title}" (${shot.lens}, ${shot.cameraMovement})`)
    parts.push(shot.description)
    parts.push(`Purpose: ${shot.purpose}.`)
    parts.push('')
  })

  // Camera Notes
  if (sections.cameraNotes && Object.keys(sections.cameraNotes).length > 0) {
    parts.push('Camera Notes (Why It Reads)')
    if (sections.cameraNotes.eyeline) {
      parts.push(`Keep eyeline ${sections.cameraNotes.eyeline}.`)
    }
    if (sections.cameraNotes.opticalEffects) {
      sections.cameraNotes.opticalEffects.forEach(effect => parts.push(effect + '.'))
    }
    if (sections.cameraNotes.handheldQuality) {
      parts.push(sections.cameraNotes.handheldQuality + '.')
    }
    if (sections.cameraNotes.exposureGuidance) {
      parts.push(sections.cameraNotes.exposureGuidance + '.')
    }
    parts.push('')
  }

  // Finishing
  if (sections.finishing && Object.keys(sections.finishing).length > 0) {
    parts.push('Finishing')
    const finishingParts: string[] = []
    if (sections.finishing.grain) finishingParts.push(sections.finishing.grain)
    if (sections.finishing.halation) finishingParts.push(sections.finishing.halation)
    if (sections.finishing.lut) finishingParts.push(sections.finishing.lut)
    if (finishingParts.length > 0) {
      parts.push(finishingParts.join('; ') + '.')
    }
    if (sections.finishing.audioMix) {
      parts.push(`Mix: ${sections.finishing.audioMix}.`)
    }
    if (sections.finishing.posterFrame) {
      parts.push(`Poster frame: ${sections.finishing.posterFrame}.`)
    }
  }

  return parts.join('\n')
}

/**
 * Example usage template for reference
 */
export const ULTRA_DETAILED_TEMPLATE_EXAMPLE: UltraDetailedPromptSections = {
  formatAndLook: {
    duration: '4s',
    shutter: '180° shutter',
    captureFormat: 'digital capture emulating 65mm photochemical contrast',
    grainQuality: 'fine grain',
    opticalEffects: ['subtle halation on speculars', 'no gate weave']
  },
  lensesAndFilteration: {
    lenses: ['32mm spherical prime', '50mm spherical prime'],
    filters: ['Black Pro-Mist 1/4', 'slight CPL rotation to manage glass reflections on train windows']
  },
  gradeAndPalette: {
    highlights: 'clean morning sunlight with amber lift',
    mids: 'balanced neutrals with slight teal cast in shadows',
    blacks: 'soft, neutral with mild lift for haze retention'
  },
  lightingAndAtmosphere: {
    keyLight: {
      source: 'Natural sunlight',
      direction: 'camera left, low angle (07:30 AM)',
      quality: 'hard'
    },
    fillLight: {
      source: '4×4 ultrabounce silver',
      placement: 'from trackside'
    },
    negativeFill: 'from opposite wall',
    practicals: ['sodium platform lights on dim fade'],
    atmosphere: ['gentle mist', 'train exhaust drift through light beam']
  },
  locationAndFraming: {
    location: 'Urban commuter platform, dawn',
    foreground: ['yellow safety line', 'coffee cup on bench'],
    midground: ['waiting passengers silhouetted in haze'],
    background: ['arriving train braking to a stop'],
    avoidances: ['signage', 'corporate branding']
  },
  wardrobePropsExtras: {
    mainSubject: 'mid-30s traveler, navy coat, backpack slung on one shoulder, holding phone loosely at side',
    extras: ['commuters in muted tones', 'one cyclist pushing bike'],
    props: ['paper coffee cup', 'rolling luggage', 'LED departure board (generic destinations)']
  },
  sound: {
    type: 'diegetic',
    elements: ['faint rail screech', 'train brakes hiss', 'distant announcement muffled', 'low ambient hum'],
    levels: '(-20 LUFS)',
    exclusions: ['no score', 'no added foley']
  },
  optimizedShotList: [
    {
      timing: '0.00-2.40',
      title: 'Arrival Drift',
      lens: '32mm',
      cameraMovement: 'shoulder-mounted slow dolly left',
      description: 'Camera slides past platform signage edge; shallow focus reveals traveler mid-frame looking down tracks. Morning light blooms across lens; train headlights flare softly through mist.',
      purpose: 'establish setting and tone, hint anticipation'
    },
    {
      timing: '2.40-4.00',
      title: 'Turn and Pause',
      lens: '50mm',
      cameraMovement: 'slow arc in',
      description: 'Cut to tighter over-shoulder arc as train halts; traveler turns slightly toward camera, catching sunlight rim across cheek and phone screen reflection. Eyes flick up toward something unseen.',
      purpose: 'create human focal moment with minimal motion'
    }
  ],
  cameraNotes: {
    eyeline: 'low and close to lens axis for intimacy',
    opticalEffects: ['Allow micro flares from train glass as aesthetic texture'],
    handheldQuality: 'Preserve subtle handheld imperfection for realism',
    exposureGuidance: 'Do not break silhouette clarity with overexposed flare; retain skin highlight roll-off'
  },
  finishing: {
    grain: 'Fine-grain overlay with mild chroma noise for realism',
    halation: 'restrained halation on practicals',
    lut: 'warm-cool LUT for morning split tone',
    audioMix: 'prioritize train and ambient detail over footstep transients',
    posterFrame: 'traveler mid-turn, golden rim light, arriving train soft-focus in background haze'
  }
}
