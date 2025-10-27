/**
 * Enhanced context gathering for screenplay AI
 * Provides comprehensive series, character, and relationship context
 */

export interface EnhancedSeriesContext {
  // Series basics
  seriesId: string
  seriesName: string
  description: string | null
  genre: string | null
  tone: string | null

  // Screenplay data (if from concept)
  screenplay_data?: {
    tone?: string
    genre?: string
    logline?: string
    premise?: string
    themes?: string[]
    seasons?: Array<{
      season_number: number
      title: string
      arc: string
      episodes: Array<{
        episode_number: number
        title: string
        logline: string
        plot_summary: string
        character_focus: string[]
      }>
    }>
  }

  // Characters
  characters: Array<{
    id: string
    name: string
    role: string | null
    description: string | null
    visual_fingerprint: string | null
    voice_profile: string | null
    sora_prompt_template: string | null
  }>

  // Settings/Locations
  settings: Array<{
    id: string
    name: string
    description: string | null
    visual_details: string | null
    mood: string | null
  }>

  // Visual assets
  visual_assets?: Array<{
    id: string
    asset_type: string
    description: string | null
    reference_url: string | null
  }>

  // Character relationships (if available)
  relationships?: Array<{
    character_a_id: string
    character_b_id: string
    relationship_type: string
    description: string | null
  }>

  // Continuity settings
  enforce_continuity: boolean
  allow_continuity_breaks: boolean

  // Sora visual settings
  sora_camera_style: string | null
  sora_lighting_mood: string | null
  sora_color_palette: string | null
  sora_overall_tone: string | null
  sora_narrative_prefix: string | null
}

/**
 * Build enhanced context prompt for AI screenplay agent
 */
export function buildEnhancedContextPrompt(context: EnhancedSeriesContext): string {
  const sections: string[] = []

  // Series overview
  sections.push('# SERIES CONTEXT')
  sections.push(`**Series:** ${context.seriesName}`)
  if (context.description) {
    sections.push(`**Description:** ${context.description}`)
  }
  if (context.genre) {
    sections.push(`**Genre:** ${context.genre}`)
  }
  if (context.tone || context.screenplay_data?.tone) {
    sections.push(`**Tone:** ${context.tone || context.screenplay_data?.tone}`)
  }

  // Screenplay concept data (if from series concept agent)
  if (context.screenplay_data) {
    sections.push('\n## Series Concept')
    if (context.screenplay_data.logline) {
      sections.push(`**Logline:** ${context.screenplay_data.logline}`)
    }
    if (context.screenplay_data.premise) {
      sections.push(`**Premise:** ${context.screenplay_data.premise}`)
    }
    if (context.screenplay_data.themes && context.screenplay_data.themes.length > 0) {
      sections.push(`**Themes:** ${context.screenplay_data.themes.join(', ')}`)
    }
  }

  // Characters
  if (context.characters.length > 0) {
    sections.push('\n# CHARACTERS')
    context.characters.forEach(char => {
      sections.push(`\n## ${char.name}`)
      if (char.role) sections.push(`**Role:** ${char.role}`)
      if (char.description) sections.push(`**Description:** ${char.description}`)
      if (char.visual_fingerprint) sections.push(`**Visual Identity:** ${char.visual_fingerprint}`)
      if (char.voice_profile) sections.push(`**Voice/Personality:** ${char.voice_profile}`)
    })
  }

  // Character relationships
  if (context.relationships && context.relationships.length > 0) {
    sections.push('\n# CHARACTER RELATIONSHIPS')
    context.relationships.forEach(rel => {
      const charA = context.characters.find(c => c.id === rel.character_a_id)
      const charB = context.characters.find(c => c.id === rel.character_b_id)
      if (charA && charB) {
        sections.push(`\n**${charA.name} ↔ ${charB.name}**`)
        sections.push(`Type: ${rel.relationship_type}`)
        if (rel.description) sections.push(`Details: ${rel.description}`)
      }
    })
  }

  // Settings/Locations
  if (context.settings.length > 0) {
    sections.push('\n# LOCATIONS & SETTINGS')
    context.settings.forEach(setting => {
      sections.push(`\n## ${setting.name}`)
      if (setting.description) sections.push(`**Description:** ${setting.description}`)
      if (setting.visual_details) sections.push(`**Visual Details:** ${setting.visual_details}`)
      if (setting.mood) sections.push(`**Mood/Atmosphere:** ${setting.mood}`)
    })
  }

  // Visual style (Sora settings)
  const hasVisualSettings = context.sora_camera_style || context.sora_lighting_mood ||
                           context.sora_color_palette || context.sora_overall_tone
  if (hasVisualSettings) {
    sections.push('\n# VISUAL STYLE')
    if (context.sora_camera_style) sections.push(`**Camera Style:** ${context.sora_camera_style}`)
    if (context.sora_lighting_mood) sections.push(`**Lighting Mood:** ${context.sora_lighting_mood}`)
    if (context.sora_color_palette) sections.push(`**Color Palette:** ${context.sora_color_palette}`)
    if (context.sora_overall_tone) sections.push(`**Overall Tone:** ${context.sora_overall_tone}`)
    if (context.sora_narrative_prefix) sections.push(`**Narrative Style:** ${context.sora_narrative_prefix}`)
  }

  // Continuity requirements
  sections.push('\n# CONTINUITY REQUIREMENTS')
  if (context.enforce_continuity) {
    sections.push('- **Strict continuity enforcement** - Maintain consistency with established characters, locations, and story elements')
    if (context.allow_continuity_breaks) {
      sections.push('- Continuity breaks allowed with explicit justification')
    } else {
      sections.push('- No continuity breaks permitted')
    }
  } else {
    sections.push('- Flexible continuity - Creative freedom prioritized over strict consistency')
  }

  // Usage instructions
  sections.push('\n# INSTRUCTIONS FOR EPISODE DEVELOPMENT')
  sections.push('Use the above context to:')
  sections.push('1. Ensure all scenes align with established character personalities and relationships')
  sections.push('2. Utilize the defined locations and visual style in scene descriptions')
  sections.push('3. Maintain consistency with the overall series tone and genre')
  sections.push('4. Reference character backstories and relationships to create authentic interactions')
  sections.push('5. Apply the visual style guidelines when describing shots and cinematography')

  return sections.join('\n')
}

/**
 * Build episode-specific context prompt
 */
export function buildEpisodeContextPrompt(
  episodeConcept: {
    season_number: number
    episode_number: number
    title: string
    logline: string
    plot_summary: string
    character_focus: string[]
    season_title?: string
    season_arc?: string
  },
  seriesContext: EnhancedSeriesContext
): string {
  const sections: string[] = []

  sections.push('# EPISODE ASSIGNMENT')
  sections.push(`**Series:** ${seriesContext.seriesName}`)
  sections.push(`**Season ${episodeConcept.season_number}, Episode ${episodeConcept.episode_number}:** ${episodeConcept.title}`)

  if (episodeConcept.season_title) {
    sections.push(`**Season Arc:** ${episodeConcept.season_title}`)
    if (episodeConcept.season_arc) {
      sections.push(`**Season Theme:** ${episodeConcept.season_arc}`)
    }
  }

  sections.push('\n## Episode Concept')
  sections.push(`**Logline:** ${episodeConcept.logline}`)
  sections.push('\n**Plot Summary:**')
  sections.push(episodeConcept.plot_summary)

  if (episodeConcept.character_focus.length > 0) {
    sections.push(`\n**Focus Characters:** ${episodeConcept.character_focus.join(', ')}`)

    // Provide detailed info on focus characters
    const focusChars = seriesContext.characters.filter(c =>
      episodeConcept.character_focus.some(fc =>
        c.name.toLowerCase().includes(fc.toLowerCase()) ||
        fc.toLowerCase().includes(c.name.toLowerCase())
      )
    )

    if (focusChars.length > 0) {
      sections.push('\n### Focus Character Details:')
      focusChars.forEach(char => {
        sections.push(`\n**${char.name}:**`)
        if (char.description) sections.push(`- ${char.description}`)
        if (char.voice_profile) sections.push(`- Personality: ${char.voice_profile}`)
      })
    }
  }

  sections.push('\n---\n')
  sections.push('**YOUR TASK:** Help develop this episode concept into a complete screenplay with:')
  sections.push('- Detailed scene breakdown (INT/EXT, location, time)')
  sections.push('- Scene-by-scene story beats')
  sections.push('- Character arcs within the episode')
  sections.push('- Key dialogue moments')
  sections.push('- Visual descriptions aligned with series style')
  sections.push('\nUse the series context below as your foundation.\n')

  return sections.join('\n')
}
