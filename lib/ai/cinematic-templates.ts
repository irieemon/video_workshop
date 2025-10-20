/**
 * Cinematic Narrative Templates for Sora2
 *
 * These templates guide the synthesis of natural language prompts
 * that blend storytelling with cinematography in Sora2-optimized format.
 *
 * Target: 800-1000 characters
 * Balance: 50% narrative / 50% technical
 * Style: Director's shot notes in natural prose
 */

export interface CinematicTemplate {
  sceneSetup: string // 20% - Environment, time, mood, context
  subjectAction: string // 30% - Who, what they're doing, emotional beats
  cameraDirection: string // 25% - Framing, lens, movement
  lightingAtmosphere: string // 15% - Light quality, color palette
  audioCue: string // 10% - Sound design notes
}

/**
 * Template section guidelines based on Sora2 research
 */
export const templateGuidelines = {
  sceneSetup: {
    length: '2-3 sentences',
    focus: 'Environment, time of day, weather, atmosphere',
    style: 'Natural prose, evocative but specific',
    example: 'A minimalist desk sits beneath a tall window, morning light streaming through translucent curtains. The space feels quiet and intentional, like the opening moments of a daily ritual.',
  },

  subjectAction: {
    length: '3-4 sentences with timing beats',
    focus: 'Subject identity, actions, emotional quality, pacing',
    style: 'Shot list structure in natural language',
    example: 'A pair of hands enters the frame from the left, fingers moving with deliberate care (0-2s). They begin unwrapping layers of white tissue paper, each fold revealing more of the product beneath (2-5s). Finally, the hands lift a luxury serum bottle to eye level, holding it steady with quiet confidence (5-7s).',
  },

  cameraDirection: {
    length: '2-3 sentences',
    focus: 'Shot type, lens choice, camera movement, framing',
    style: 'Professional cinematography language, no abbreviations',
    example: 'Medium shot captured with a 50mm lens at eye level, camera locked on a tripod for stability. The composition follows the rule of thirds, with the product positioned in the upper right intersection and hands framing the lower left quadrant.',
  },

  lightingAtmosphere: {
    length: '2 sentences',
    focus: 'Light sources, direction, quality, color palette',
    style: 'Descriptive lighting notes, physics-aware language',
    example: 'Soft directional window light from 45 degrees creates gentle shadows across the scene, with subtle fill from the left reducing harsh contrast. The warm color palette with amber tones evokes a sense of morning luxury and aspiration.',
  },

  audioCue: {
    length: '1 sentence',
    focus: 'Sound design, foley, music mood (generic)',
    style: 'Brief audio direction',
    example: 'Gentle foley of tissue paper rustling and glass touching skin, with ambient morning room tone.',
  },
}

/**
 * Natural language cinematography vocabulary
 * Replace technical abbreviations with these terms
 */
export const cinematographyVocabulary = {
  // Shot types (replace MS, CU, WS, etc.)
  shotTypes: [
    'wide shot',
    'medium shot',
    'close-up',
    'extreme close-up',
    'over-the-shoulder',
    'establishing shot',
    'two-shot',
  ],

  // Focal lengths (use natural description)
  lenses: [
    '24mm wide angle',
    '35mm standard wide',
    '50mm standard',
    '85mm portrait',
    '135mm telephoto',
  ],

  // Camera movement (replace DOLLY-IN, TRACK, etc.)
  movements: [
    'slow dolly push',
    'slow dolly pull back',
    'smooth tracking shot',
    'gentle pan left',
    'gentle pan right',
    'crane up',
    'crane down',
    'handheld',
    'steadicam',
    'locked on tripod',
    'orbiting around subject',
  ],

  // Framing (replace eye-level, overhead, etc.)
  framing: [
    'at eye level',
    'slightly above eye level',
    'low angle looking up',
    'high angle looking down',
    'overhead bird\'s eye view',
  ],

  // Depth of field
  depthOfField: [
    'shallow depth of field at f/1.4',
    'moderate depth at f/2.8',
    'deep focus at f/8',
    'background falls into bokeh',
    'everything in sharp focus',
  ],

  // Lighting direction (replace K45°R, etc.)
  lightingDirection: [
    'soft directional light from 45 degrees',
    'backlight from behind subject',
    'side light from the left',
    'side light from the right',
    'overhead lighting',
    'natural window light',
    'diffused ambient light',
  ],

  // Light quality (replace SOFT, HARD)
  lightQuality: [
    'soft diffused light',
    'hard direct light',
    'bounced light',
    'filtered light',
    'volumetric light rays',
    'dappled light',
  ],

  // Color temperature (replace 5600K, 3200K)
  colorTemperature: [
    'cool daylight tones',
    'warm tungsten tones',
    'neutral balanced light',
    'golden hour warmth',
    'blue twilight hues',
  ],

  // Composition (replace ROT, CNTR, etc.)
  composition: [
    'following the rule of thirds',
    'centered composition',
    'leading lines draw the eye',
    'symmetrical framing',
    'diagonal composition',
    'positioned in upper third',
    'positioned in lower third',
    'positioned in left third',
    'positioned in right third',
  ],

  // Subject performance (replace DELIB, CONF, SUBTLE)
  performance: [
    'deliberate and unhurried',
    'confident movements',
    'subtle and restrained',
    'energetic and dynamic',
    'hesitant and careful',
    'practiced and fluid',
    'with quiet reverence',
  ],

  // Timing descriptors
  pacing: [
    'in the opening moments (0-2s)',
    'as the scene unfolds (2-5s)',
    'in the final beat (5-7s)',
    'throughout the sequence',
    'building gradually',
    'with steady rhythm',
  ],
}

/**
 * Platform-specific formatting notes
 */
export const platformGuidelines = {
  tiktok: {
    aspectRatio: 'Vertical 9:16 frame',
    safezones: 'with subject positioned in upper two-thirds to clear space for UI overlays',
    duration: 'optimized for 7-15 second clips',
  },
  instagram: {
    aspectRatio: 'Vertical 9:16 frame for Reels',
    safezones: 'with subject positioned to avoid UI elements at top and bottom',
    duration: 'optimized for 9-15 second clips',
  },
}

/**
 * Template synthesis pattern for final prompt
 *
 * This is the structure agents should aim for when contributing
 */
export const synthesisPattern = `
[SCENE SETUP - Natural prose setting the environment and mood]

[SUBJECT ACTION - Shot list in natural language with timing beats]

[CAMERA DIRECTION - Professional cinematography notes without abbreviations]

[LIGHTING & ATMOSPHERE - Descriptive lighting and color palette]

[AUDIO CUE - Brief sound design note] [PLATFORM NOTE - Aspect ratio and framing consideration]
`.trim()

/**
 * Example complete cinematic narrative prompt
 */
export const examplePrompt = `
A minimalist desk sits beneath a tall window in a sun-drenched room, morning light streaming through translucent curtains casting soft patterns across the surface. The space feels quiet and intentional, like the opening moments of a daily self-care ritual. White tissue paper and a sleek product box rest on the pristine desk surface.

A pair of hands enters the frame from the left, fingers moving with deliberate care and practiced grace (0-2s). They begin unwrapping layers of white tissue paper, each fold revealing more of the luxury product beneath, movements unhurried and reverent (2-5s). The hands lift a glass serum bottle to eye level, rotating it slowly to catch the light, holding it steady with quiet confidence (5-7s). Finally, they present the product to camera, fingers framing it with subtle tremor that adds human authenticity (7-10s).

Medium shot captured with a 50mm lens at eye level, camera locked on a tripod for stability and precision. The composition follows the rule of thirds—serum bottle positioned in the upper right intersection, hands framing the lower left quadrant. Background falls into a beautiful bokeh at f/2.8, keeping focus tight on the unboxing ritual while maintaining soft context.

Soft directional window light from 45 degrees creates gentle shadows across the scene, with subtle fill from the left reducing harsh contrast. The warm color palette with amber tones evokes morning luxury and aspiration. Background desaturated slightly to keep attention on the product's jewel-like quality.

Gentle foley of tissue paper rustling and glass touching skin, with ambient morning room tone. Vertical 9:16 frame with product positioned in upper two-thirds to clear space for UI overlays.
`.trim()

// Character count: ~980 chars
// Readability: Natural cinematography language
// Technical precision: Specific without being coded
// Narrative flow: Story and technique woven together
