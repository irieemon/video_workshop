// Character Consistency Types for Sora Prompt Generation

export interface VisualFingerprint {
  // Core Physical Attributes
  age: string // "early 30s", "mid-40s", "late 20s"
  ethnicity: string // "South Asian", "East Asian", "Caucasian", "African American", etc.

  // Hair
  hair: string // "shoulder-length wavy black hair", "short curly brown hair"

  // Eyes
  eyes: string // "amber eyes", "dark brown eyes", "green eyes"

  // Face
  face_shape: string // "oval", "square", "heart-shaped", "round"
  distinctive_features?: string[] | string // ["scar on left eyebrow", "dimples"] or string for backwards compatibility

  // Body
  body_type: string // "slim", "athletic", "average", "curvy"
  height?: string // "tall", "average", "short" or specific like "5'8\""

  // Skin Tone - CRITICAL for Sora visual consistency
  skin_tone: string // "deep brown with warm undertones", "fair with cool undertones", "medium olive"

  // Clothing
  default_clothing: string // "business casual blazer and slacks", "casual jeans and t-shirt"

  // Additional cues from uploaded images
  additional_cues?: string[] // Free-form notes from visual references
}

export interface VoiceProfile {
  // Age Sound
  age_sound: string // "sounds late 20s", "sounds mid-40s"

  // Accent & Dialect
  accent: string // "neutral American", "British RP", "Southern US", "New York"

  // Vocal Characteristics
  pitch: 'high' | 'medium' | 'low'
  tone: string // "warm", "authoritative", "playful", "serious"
  pace: 'fast' | 'moderate' | 'slow'
  energy: 'high' | 'moderate' | 'calm' | 'low'

  // Distinctive Traits
  distinctive_traits?: string[] // ["slight rasp", "precise enunciation", "laughs easily"]
}

export interface InteractionContext {
  // Relationship Basics
  familiarity_level: 'strangers' | 'acquaintances' | 'friends' | 'close_friends' | 'family'

  // Communication Style
  communication_style: string // "formal", "casual", "professional", "intimate"

  // Dynamics
  typical_dynamics?: string // "playful banter", "respectful distance", "protective", "competitive"

  // Context Notes
  how_they_know: string // "college roommates", "coworkers", "childhood friends", "siblings"
}

// Enhanced character type with consistency fields
export interface CharacterWithConsistency {
  id: string
  series_id: string
  name: string
  description: string
  role: 'protagonist' | 'supporting' | 'background' | 'other' | null

  // Legacy fields
  appearance_details: any
  performance_style: string | null
  visual_reference_url: string | null
  visual_cues: any

  // New consistency fields
  visual_fingerprint: VisualFingerprint | null
  voice_profile: VoiceProfile | null
  sora_prompt_template: string | null // Auto-generated from fingerprints

  created_at: string
  updated_at: string
}

// Helper function to generate Sora-optimized character description
export function generateCharacterPromptBlock(character: CharacterWithConsistency): string {
  if (character.sora_prompt_template) {
    return character.sora_prompt_template
  }

  // Fallback if template not generated
  const parts: string[] = []

  // Name
  parts.push(character.name)

  // Visual fingerprint
  if (character.visual_fingerprint) {
    const vf = character.visual_fingerprint
    const visualParts: string[] = []

    if (vf.age) visualParts.push(vf.age)
    if (vf.ethnicity) visualParts.push(vf.ethnicity)
    if (vf.hair) visualParts.push(vf.hair)
    if (vf.eyes) visualParts.push(vf.eyes)
    if (vf.face_shape) visualParts.push(vf.face_shape + ' face')
    if (vf.body_type) visualParts.push(vf.body_type + ' build')
    if (vf.default_clothing) visualParts.push('wearing ' + vf.default_clothing)
    if (vf.skin_tone) visualParts.push('Skin tone: ' + vf.skin_tone)

    if (visualParts.length > 0) {
      parts.push(visualParts.join(', '))
    }
  }

  // Voice profile
  if (character.voice_profile) {
    const vp = character.voice_profile
    const voiceParts: string[] = []

    if (vp.age_sound) voiceParts.push('sounds ' + vp.age_sound)
    if (vp.accent) voiceParts.push(vp.accent + ' accent')
    if (vp.pitch) voiceParts.push(vp.pitch + ' pitch')
    if (vp.tone) voiceParts.push(vp.tone + ' tone')

    if (voiceParts.length > 0) {
      parts.push('Voice: ' + voiceParts.join(', '))
    }
  }

  // Performance style
  if (character.performance_style) {
    parts.push('Performance: ' + character.performance_style)
  }

  return parts.join('. ')
}

// Helper to generate relationship context for prompts
export function generateRelationshipContext(
  characterA: CharacterWithConsistency,
  characterB: CharacterWithConsistency,
  interaction: InteractionContext
): string {
  const parts: string[] = []

  parts.push(`${characterA.name} and ${characterB.name}`)
  parts.push(interaction.how_they_know)

  if (interaction.communication_style) {
    parts.push(`communicate ${interaction.communication_style}`)
  }

  if (interaction.typical_dynamics) {
    parts.push(`with ${interaction.typical_dynamics}`)
  }

  return parts.join(', ')
}
