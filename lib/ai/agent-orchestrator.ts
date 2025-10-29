import OpenAI from 'openai'
import { AgentName, AgentResponse, AgentDiscussion, DetailedBreakdown, VisualTemplate, Shot } from '../types/database.types'
import { agentSystemPrompts } from './agent-prompts'
import { getModelForFeature } from './config'

// Lazy initialization to avoid build-time API key requirement
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface SeriesCharacter {
  id: string
  name: string
  description: string
  role: string | null
  performance_style: string | null
  visual_reference_url?: string | null
  visual_cues?: any
  visual_fingerprint?: any
  voice_profile?: any
  sora_prompt_template?: string | null
}

interface SeriesSetting {
  id: string
  name: string
  description: string
  environment_type: string | null
  time_of_day: string | null
  atmosphere: string | null
  is_primary: boolean
}

interface VisualAsset {
  id: string
  name: string
  description: string | null
  asset_type: string
  file_name: string
  width: number | null
  height: number | null
}

interface CharacterRelationship {
  id: string
  character_a_id: string
  character_b_id: string
  character_a: { id: string; name: string }
  character_b: { id: string; name: string }
  relationship_type: string
  custom_label: string | null
  is_symmetric: boolean
  description: string | null
}

interface SeriesSoraSettings {
  sora_camera_style?: string | null
  sora_lighting_mood?: string | null
  sora_color_palette?: string | null
  sora_overall_tone?: string | null
  sora_narrative_prefix?: string | null
}

interface RoundtableInput {
  brief: string
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'linkedin' | 'other'
  visualTemplate?: VisualTemplate
  seriesCharacters?: SeriesCharacter[]
  seriesSettings?: SeriesSetting[]
  visualAssets?: VisualAsset[]
  characterRelationships?: CharacterRelationship[]
  seriesSoraSettings?: SeriesSoraSettings
  characterContext?: string
  userId: string
}

interface AdvancedRoundtableInput extends RoundtableInput {
  userPromptEdits?: string
  shotList?: Shot[]
  additionalGuidance?: string
}

interface RoundtableResult {
  discussion: AgentDiscussion
  detailedBreakdown: DetailedBreakdown
  optimizedPrompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots?: Shot[]
}

export async function runAgentRoundtable(input: RoundtableInput): Promise<RoundtableResult> {
  const { brief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets, characterRelationships, seriesSoraSettings, characterContext } = input

  // Round 1: Parallel agent responses
  const agents: AgentName[] = [
    'director',
    'photography_director',
    'platform_expert',
    'social_media_marketer',
    'music_producer',
    'subject_director',
  ]

  const round1Promises = agents.map(agent =>
    callAgent(agent, brief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets, characterRelationships, seriesSoraSettings, characterContext)
  )

  const round1Responses = await Promise.all(round1Promises)

  // Round 2: Sequential debate (agents respond to each other)
  const round2Context = round1Responses.map(r => ({
    agent: r.agent,
    response: r.response,
  }))

  const round2Responses: AgentResponse[] = []

  // Platform Expert challenges Director (30% probability)
  if (Math.random() < 0.3) {
    const challenge = await callAgentWithContext(
      'platform_expert',
      brief,
      platform,
      round2Context,
      { challengeAgent: 'director' }
    )
    round2Responses.push(challenge)

    // Director responds to challenge
    const response = await callAgentWithContext(
      'director',
      brief,
      platform,
      [...round2Context, challenge],
      { respondingTo: 'platform_expert' }
    )
    round2Responses.push(response)
  }

  // Marketer builds on consensus
  const marketerBuild = await callAgentWithContext(
    'social_media_marketer',
    brief,
    platform,
    [...round2Context, ...round2Responses],
    { buildingOn: ['director', 'platform_expert'] }
  )
  round2Responses.push(marketerBuild)

  // Synthesis: Distill into structured output
  const synthesis = await synthesizeRoundtable({
    brief,
    platform,
    round1: round1Responses,
    round2: round2Responses,
    seriesSoraSettings,
    characterContext,
  })

  return {
    discussion: {
      round1: round1Responses,
      round2: round2Responses,
    },
    detailedBreakdown: synthesis.breakdown,
    optimizedPrompt: synthesis.prompt,
    characterCount: synthesis.characterCount,
    hashtags: synthesis.hashtags,
    suggestedShots: synthesis.suggestedShots,
  }
}

async function callAgent(
  agentName: AgentName,
  brief: string,
  platform: string,
  visualTemplate?: VisualTemplate,
  seriesCharacters?: SeriesCharacter[],
  seriesSettings?: SeriesSetting[],
  visualAssets?: VisualAsset[],
  characterRelationships?: CharacterRelationship[],
  seriesSoraSettings?: SeriesSoraSettings,
  characterContext?: string
): Promise<AgentResponse> {
  const systemPrompt = agentSystemPrompts[agentName]

  let userMessage = `Brief: ${brief}\nPlatform: ${platform}`

  // Inject character consistency context BEFORE user brief
  if (characterContext) {
    userMessage += characterContext
  }

  if (visualTemplate) {
    userMessage += `\nSeries Template: ${JSON.stringify(visualTemplate)}`
  }

  // Inject Sora 2 best practices settings for visual consistency
  if (seriesSoraSettings) {
    const hasSettings = Object.values(seriesSoraSettings).some(val => val)
    if (hasSettings) {
      userMessage += `\n\nSERIES VISUAL CONSISTENCY (Sora 2 Best Practices):\n`

      if (seriesSoraSettings.sora_narrative_prefix) {
        userMessage += `Narrative Prefix: ${seriesSoraSettings.sora_narrative_prefix}\n`
      }
      if (seriesSoraSettings.sora_overall_tone) {
        userMessage += `Overall Tone: ${seriesSoraSettings.sora_overall_tone}\n`
      }
      if (seriesSoraSettings.sora_camera_style) {
        userMessage += `Camera Style: ${seriesSoraSettings.sora_camera_style}\n`
      }
      if (seriesSoraSettings.sora_lighting_mood) {
        userMessage += `Lighting Mood: ${seriesSoraSettings.sora_lighting_mood}\n`
      }
      if (seriesSoraSettings.sora_color_palette) {
        userMessage += `Color Palette: ${seriesSoraSettings.sora_color_palette}\n`
      }

      userMessage += `\nIMPORTANT: These settings ensure visual consistency across all episodes. Incorporate them into your creative direction.\n`
    }
  }

  if (seriesCharacters && seriesCharacters.length > 0) {
    userMessage += `\n\nCHARACTERS IN THIS SCENE:\n`
    seriesCharacters.forEach(char => {
      userMessage += `- ${char.name}: ${char.description}`
      if (char.role) userMessage += ` (Role: ${char.role})`
      if (char.performance_style) userMessage += ` | Performance Style: ${char.performance_style}`

      // Add visual reference context for Sora 2 reference-based generation
      if (char.visual_reference_url) {
        userMessage += `\n  PRIMARY VISUAL REFERENCE: Character appearance and style should match reference image`
      }

      // Add visual cues for specific aspects
      if (char.visual_cues && Array.isArray(char.visual_cues) && char.visual_cues.length > 0) {
        userMessage += `\n  VISUAL DETAILS:`
        char.visual_cues.forEach((cue: any) => {
          const cueLabel = cue.type === 'full-body' ? 'Full Body' :
                          cue.type === 'face' ? 'Face/Portrait' :
                          cue.type === 'costume' ? 'Costume' :
                          cue.type === 'expression' ? 'Expression' : 'Other'
          userMessage += `\n    - ${cueLabel}${cue.caption ? `: ${cue.caption}` : ''}`
        })
      }

      userMessage += '\n'
    })
    userMessage += `\nIMPORTANT: Maintain visual consistency with character reference images and described visual details.\n`
  }

  // Add character relationships context
  if (characterRelationships && characterRelationships.length > 0) {
    userMessage += `\n\nCHARACTER RELATIONSHIPS IN THIS SERIES:\n`
    characterRelationships.forEach(rel => {
      const arrow = rel.is_symmetric ? ' ↔ ' : ' → '
      const label = rel.relationship_type === 'custom' && rel.custom_label
        ? rel.custom_label
        : rel.relationship_type.replace('_', ' ')

      userMessage += `- ${rel.character_a.name}${arrow}${rel.character_b.name}: ${label}`
      if (rel.description) userMessage += ` (${rel.description})`
      userMessage += '\n'
    })
    userMessage += `\nIMPORTANT: When these characters interact, maintain consistency with established relationship dynamics.\n`
  }

  if (seriesSettings && seriesSettings.length > 0) {
    userMessage += `\n\nSETTING/LOCATION:\n`
    seriesSettings.forEach(setting => {
      userMessage += `- ${setting.name}: ${setting.description}`
      if (setting.environment_type) userMessage += ` (${setting.environment_type})`
      if (setting.time_of_day) userMessage += ` | Time: ${setting.time_of_day}`
      if (setting.atmosphere) userMessage += ` | Atmosphere: ${setting.atmosphere}`
      userMessage += '\n'
    })
    userMessage += `\nIMPORTANT: The video MUST take place in this setting. All scenes should be set in this location.`
  }

  if (visualAssets && visualAssets.length > 0) {
    userMessage += `\n\nVISUAL REFERENCE ASSETS:\n`
    userMessage += `The following visual references should inform your creative decisions:\n\n`

    const logos = visualAssets.filter(a => a.asset_type === 'logo')
    const colorPalettes = visualAssets.filter(a => a.asset_type === 'color_palette')
    const settingRefs = visualAssets.filter(a => a.asset_type === 'setting_reference')
    const styleRefs = visualAssets.filter(a => a.asset_type === 'style_reference')
    const others = visualAssets.filter(a => a.asset_type === 'other')

    if (logos.length > 0) {
      userMessage += `Brand Logos:\n`
      logos.forEach(asset => {
        userMessage += `- ${asset.name}`
        if (asset.description) userMessage += `: ${asset.description}`
        userMessage += '\n'
      })
      userMessage += '\n'
    }

    if (colorPalettes.length > 0) {
      userMessage += `Color Palettes:\n`
      colorPalettes.forEach(asset => {
        userMessage += `- ${asset.name}`
        if (asset.description) userMessage += `: ${asset.description}`
        userMessage += '\n'
      })
      userMessage += `IMPORTANT: Ensure lighting, props, and overall aesthetic align with these color guidelines.\n\n`
    }

    if (settingRefs.length > 0) {
      userMessage += `Setting Reference Images:\n`
      settingRefs.forEach(asset => {
        userMessage += `- ${asset.name}`
        if (asset.description) userMessage += `: ${asset.description}`
        userMessage += '\n'
      })
      userMessage += `These images show the desired look and feel for the location/environment.\n\n`
    }

    if (styleRefs.length > 0) {
      userMessage += `Style References:\n`
      styleRefs.forEach(asset => {
        userMessage += `- ${asset.name}`
        if (asset.description) userMessage += `: ${asset.description}`
        userMessage += '\n'
      })
      userMessage += `Match the visual style, tone, and aesthetic shown in these references.\n\n`
    }

    if (others.length > 0) {
      userMessage += `Additional References:\n`
      others.forEach(asset => {
        userMessage += `- ${asset.name}`
        if (asset.description) userMessage += `: ${asset.description}`
        userMessage += '\n'
      })
      userMessage += '\n'
    }
  }

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: getModelForFeature('agent'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 300,
  })

  return {
    agent: agentName,
    response: completion.choices[0].message.content || '',
  }
}

async function callAgentWithContext(
  agentName: AgentName,
  brief: string,
  platform: string,
  context: AgentResponse[],
  options: {
    challengeAgent?: AgentName
    respondingTo?: AgentName
    buildingOn?: AgentName[]
  }
): Promise<AgentResponse> {
  const systemPrompt = agentSystemPrompts[agentName]

  let instruction = `Other agents have shared their perspectives:\n\n`
  context.forEach(c => {
    instruction += `${c.agent.toUpperCase()}: ${c.response}\n\n`
  })

  if (options.challengeAgent) {
    instruction += `You disagree with ${options.challengeAgent.toUpperCase()}'s approach. Respectfully challenge their perspective with your framework.`
  } else if (options.respondingTo) {
    instruction += `Respond to ${options.respondingTo.toUpperCase()}'s challenge. Defend your perspective or find synthesis.`
  } else if (options.buildingOn) {
    instruction += `Build upon the ideas from ${options.buildingOn.join(' and ').toUpperCase()}.`
  }

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: getModelForFeature('agent'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Brief: ${brief}\nPlatform: ${platform}` },
      { role: 'assistant', content: context[0]?.response || '' },
      { role: 'user', content: instruction },
    ],
    temperature: 0.8,
    max_tokens: 250,
  })

  return {
    agent: agentName,
    response: completion.choices[0].message.content || '',
    isChallenge: !!options.challengeAgent,
    respondingTo: options.respondingTo,
    buildingOn: options.buildingOn,
  }
}

async function synthesizeRoundtable(data: {
  brief: string
  platform: string
  round1: AgentResponse[]
  round2: AgentResponse[]
  seriesSoraSettings?: SeriesSoraSettings
  characterContext?: string
}): Promise<{
  breakdown: DetailedBreakdown
  prompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots: Shot[]
}> {
  // Build Sora settings context
  let soraSettingsContext = ''
  if (data.seriesSoraSettings) {
    const hasSettings = Object.values(data.seriesSoraSettings).some(val => val)
    if (hasSettings) {
      soraSettingsContext = `\n\nSERIES VISUAL CONSISTENCY REQUIREMENTS (Sora 2 Best Practices):\n`
      soraSettingsContext += `These settings MUST be integrated into the final prompt to maintain visual consistency across episodes:\n\n`

      if (data.seriesSoraSettings.sora_narrative_prefix) {
        soraSettingsContext += `- Narrative Prefix: Start the prompt with "${data.seriesSoraSettings.sora_narrative_prefix}"\n`
      }
      if (data.seriesSoraSettings.sora_overall_tone) {
        soraSettingsContext += `- Overall Tone: ${data.seriesSoraSettings.sora_overall_tone}\n`
      }
      if (data.seriesSoraSettings.sora_camera_style) {
        soraSettingsContext += `- Camera Style: ${data.seriesSoraSettings.sora_camera_style}\n`
      }
      if (data.seriesSoraSettings.sora_lighting_mood) {
        soraSettingsContext += `- Lighting Mood: ${data.seriesSoraSettings.sora_lighting_mood}\n`
      }
      if (data.seriesSoraSettings.sora_color_palette) {
        soraSettingsContext += `- Color Palette: ${data.seriesSoraSettings.sora_color_palette}\n`
      }

      soraSettingsContext += `\nCRITICAL: Weave these elements naturally into your narrative prompt. Don't list them separately - blend them into the scene description, camera direction, and lighting sections.\n`
    }
  }

  const synthesisPrompt = `
Original Brief: ${data.brief}
Platform: ${data.platform}
Duration: ${data.platform.toLowerCase() === 'tiktok' || data.platform.toLowerCase() === 'instagram' ? '4-8s for short-form' : '8-12s for standard'}${soraSettingsContext}

Team Insights:
Round 1 Analysis:
${JSON.stringify(data.round1, null, 2)}

Round 2 Discussion:
${JSON.stringify(data.round2, null, 2)}

Generate the Sora prompt following the required structure exactly. Return as text (not JSON) with markdown section headers (**Section Name**).`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: getModelForFeature('synthesis'),
    messages: [
      {
        role: 'system',
        content: `You are a creative cinematographer synthesizing a Sora video prompt that balances technical precision with compelling storytelling.

CRITICAL: Output must follow this EXACT structure with these section headers:

**Story & Direction**
Narrative arc, emotional beats, character motivations, scene purpose, storytelling goals
IMPORTANT: If characters are provided, describe them EXACTLY as specified including age, appearance, and personality. Character descriptions are LOCKED and must be preserved.

**Format & Look**
Duration, shutter angle, capture format, grain quality, halation, gate weave specs

**Lenses & Filtration**
Lens specs (focal lengths, spherical/anamorphic), filtration (Black Pro-Mist, ND, CPL, etc.)

**Grade / Palette**
Highlights, mids, blacks - specific color treatment for each tonal range

**Lighting & Atmosphere**
Light sources (natural/practical/artificial), direction, quality, bounce/fill/negative, atmospheric effects

**Location & Framing**
Setting description, foreground/midground/background elements, composition rules, brand avoidance

**Wardrobe / Props / Extras**
Main subject description WITH character details (age, appearance from character profiles), extras, key props, wardrobe details

**Sound**
Audio approach (diegetic/non-diegetic), specific sound elements, LUFS levels, foley notes
CRITICAL DIALOGUE HANDLING:
1. If screenplay dialogue is provided in the context (look for "EPISODE SCREENPLAY CONTEXT" and "Dialogue:" sections), you MUST extract and include the actual dialogue lines
2. Format dialogue with character names and their lines: "- CHARACTER_NAME: \\"dialogue line\\""
3. If character voice profiles are provided, include voice characteristics AFTER each character's dialogue
4. Example format:
   Dialogue:
   - ORIN: "Come on, Sol… what're you hiding in there?" (earthy Midwestern drawl, measured tone)
   - SOL: "You are accessing restricted archives, Engineer Kale." (soft, androgynous tone)
IMPORTANT: Always prioritize actual screenplay dialogue over generic descriptions. If dialogue exists in context, it MUST appear in this section.

**Optimized Shot List**
Numbered shots with timecodes, lens, movement, purpose. Format: "0.00–2.40 — \\"Shot Name\\" (lens, movement) | Description | Purpose"

**Camera Notes**
Technical shooting notes, why specific choices work, what to preserve/avoid

**Finishing**
Post-production specs, grain overlay, color finishing, mix priorities, poster frame description

Use technical terminology AND creative direction. Be specific with measurements, focal lengths, color values. Maintain professional cinematography standards while telling a compelling story.`,
      },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.5,
  })

  const finalPrompt = completion.choices[0].message.content || ''

  // For now, return empty breakdown - the formatted prompt is what matters
  return {
    breakdown: {
      scene_structure: '',
      visual_specs: '',
      audio: '',
      platform_optimization: '',
      hashtags: [],
    },
    prompt: finalPrompt,
    characterCount: finalPrompt.length,
    hashtags: [],
    suggestedShots: [],
  }
}

export async function runAdvancedRoundtable(input: AdvancedRoundtableInput): Promise<RoundtableResult> {
  const { brief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets, characterRelationships, seriesSoraSettings, characterContext, userPromptEdits, shotList, additionalGuidance } = input

  // Build enhanced brief with additional guidance and shot list context
  let enhancedBrief = brief

  if (additionalGuidance) {
    enhancedBrief += `\n\nADDITIONAL CREATIVE GUIDANCE:\n${additionalGuidance}`
  }

  if (shotList && shotList.length > 0) {
    enhancedBrief += `\n\nREQUESTED SHOT LIST:\n`
    shotList.forEach((shot) => {
      enhancedBrief += `Shot ${shot.order} (${shot.timing}): ${shot.description}`
      if (shot.camera) enhancedBrief += ` | Camera: ${shot.camera}`
      if (shot.lighting) enhancedBrief += ` | Lighting: ${shot.lighting}`
      if (shot.notes) enhancedBrief += ` | Notes: ${shot.notes}`
      enhancedBrief += '\n'
    })
  }

  // Round 1: Parallel agent responses with enhanced brief
  const agents: AgentName[] = [
    'director',
    'photography_director',
    'platform_expert',
    'social_media_marketer',
    'music_producer',
    'subject_director',
  ]

  const round1Promises = agents.map(agent =>
    callAgent(agent, enhancedBrief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets, characterRelationships, seriesSoraSettings, characterContext)
  )

  const round1Responses = await Promise.all(round1Promises)

  // Round 2: Sequential debate (agents respond to each other)
  const round2Context = round1Responses.map(r => ({
    agent: r.agent,
    response: r.response,
  }))

  const round2Responses: AgentResponse[] = []

  // Platform Expert challenges Director (30% probability)
  if (Math.random() < 0.3) {
    const challenge = await callAgentWithContext(
      'platform_expert',
      enhancedBrief,
      platform,
      round2Context,
      { challengeAgent: 'director' }
    )
    round2Responses.push(challenge)

    // Director responds to challenge
    const response = await callAgentWithContext(
      'director',
      enhancedBrief,
      platform,
      [...round2Context, challenge],
      { respondingTo: 'platform_expert' }
    )
    round2Responses.push(response)
  }

  // Marketer builds on consensus
  const marketerBuild = await callAgentWithContext(
    'social_media_marketer',
    enhancedBrief,
    platform,
    [...round2Context, ...round2Responses],
    { buildingOn: ['director', 'platform_expert'] }
  )
  round2Responses.push(marketerBuild)

  // Synthesis with user edits consideration
  const synthesis = await synthesizeAdvancedRoundtable({
    brief: enhancedBrief,
    platform,
    round1: round1Responses,
    round2: round2Responses,
    userPromptEdits,
    shotList,
    seriesSoraSettings,
  })

  return {
    discussion: {
      round1: round1Responses,
      round2: round2Responses,
    },
    detailedBreakdown: synthesis.breakdown,
    optimizedPrompt: synthesis.prompt,
    characterCount: synthesis.characterCount,
    hashtags: synthesis.hashtags,
    suggestedShots: synthesis.suggestedShots,
  }
}

async function synthesizeAdvancedRoundtable(data: {
  brief: string
  platform: string
  round1: AgentResponse[]
  round2: AgentResponse[]
  userPromptEdits?: string
  shotList?: Shot[]
  seriesSoraSettings?: SeriesSoraSettings
}): Promise<{
  breakdown: DetailedBreakdown
  prompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots: Shot[]
}> {
  // Build Sora settings context
  let soraSettingsContext = ''
  if (data.seriesSoraSettings) {
    const hasSettings = Object.values(data.seriesSoraSettings).some(val => val)
    if (hasSettings) {
      soraSettingsContext = `\nSERIES VISUAL CONSISTENCY REQUIREMENTS (Sora 2 Best Practices):\n`
      soraSettingsContext += `These settings MUST be integrated into the final prompt to maintain visual consistency across episodes:\n\n`

      if (data.seriesSoraSettings.sora_narrative_prefix) {
        soraSettingsContext += `- Narrative Prefix: Start the prompt with "${data.seriesSoraSettings.sora_narrative_prefix}"\n`
      }
      if (data.seriesSoraSettings.sora_overall_tone) {
        soraSettingsContext += `- Overall Tone: ${data.seriesSoraSettings.sora_overall_tone}\n`
      }
      if (data.seriesSoraSettings.sora_camera_style) {
        soraSettingsContext += `- Camera Style: ${data.seriesSoraSettings.sora_camera_style}\n`
      }
      if (data.seriesSoraSettings.sora_lighting_mood) {
        soraSettingsContext += `- Lighting Mood: ${data.seriesSoraSettings.sora_lighting_mood}\n`
      }
      if (data.seriesSoraSettings.sora_color_palette) {
        soraSettingsContext += `- Color Palette: ${data.seriesSoraSettings.sora_color_palette}\n`
      }

      soraSettingsContext += `\nCRITICAL: Weave these elements naturally into your narrative prompt. Don't list them separately - blend them into the scene description, camera direction, and lighting sections.\n`
    }
  }

  const synthesisPrompt = `
Original Brief: ${data.brief}
Platform: ${data.platform}
Duration: ${data.platform.toLowerCase() === 'tiktok' || data.platform.toLowerCase() === 'instagram' ? '4-8s for short-form' : '8-12s for standard'}${soraSettingsContext}

Team Insights:
Round 1 Analysis:

LENSES & FILTRATION:
- Specific lens choices (32mm, 50mm, 85mm spherical/anamorphic primes)
- Filtration (Black Pro-Mist 1/8-1/2, CPL rotation for reflections, ND filters)
- Technical notes (focus distance, aperture settings if relevant)

GRADE / PALETTE:
- Highlights: color treatment and lift
- Mids: tonal balance and color cast
- Blacks: density, lift, and haze retention

LIGHTING & ATMOSPHERE:
- Key light: source, direction with time/angle (e.g., "natural sunlight camera left, low angle 07:30 AM")
- Fill light: source and placement (e.g., "4×4 ultrabounce silver from trackside")
- Negative fill: placement for contrast control
- Practicals: any practical lights in scene with intensity
- Atmosphere: mist, haze, smoke, particles, weather

LOCATION & FRAMING:
- Location description with time of day
- Foreground elements (specific objects, lines, markers)
- Midground action/subjects
- Background elements
- Avoidances (signage, branding, specific elements to exclude)

WARDROBE / PROPS / EXTRAS:
- CRITICAL: Character descriptions MUST include ethnicity and skin tone
  Format: "[Name]: [ethnicity] [age] with [skin tone], [clothing], [physical details]"
  Example: "Lyle: Black young child with deep brown skin, denim shirt, short textured black hair, warm brown eyes"
- CRITICAL: If character voice/vocal characteristics are provided in character descriptions, you MUST include them in the SOUND section
- Main subject details if no named characters
- Extras descriptions
- Key props list

SOUND:
- Type: diegetic, non-diegetic, or mixed
- CRITICAL: Extract and include character vocal characteristics from character descriptions
  - Look for "Voice:" sections in character templates
  - Format: "Character vocals: [Name]: [voice details from template]; [Name]: [voice details]."
  - Example: "Character vocals: Lyle: sounds young child, playful tone, high pitch; Dad: warm baritone, neutral American accent."
  - If no voice data in templates, skip this line
- Specific audio elements with levels if relevant (e.g., "-20 LUFS")
- Exclusions (no score, no added foley, etc.)

OPTIMIZED SHOT LIST (2-6 shots):
For each shot:
- Timing (e.g., "0.00-2.40")
- Shot title/name
- Lens choice
- Camera movement description
- Detailed action/composition description
- Purpose/intent of shot

CAMERA NOTES (Why It Reads):
- Eyeline positioning
- Allowed/desired optical effects (flares, aberrations)
- Handheld quality or stabilization notes
- Exposure guidance for key moments

FINISHING:
- Grain overlay specifications
- Halation treatment
- LUT or color treatment description
- Audio mix priorities
- Poster frame suggestion

COPYRIGHT SAFETY:
- NO brands, IPs, celebrities, or copyrighted music
- Use descriptive language without brand references
- EXCEPTION: When character descriptions are provided, you MUST use those exact descriptions
${soraSettingsContext}

${data.userPromptEdits ? `USER'S DIRECT PROMPT EDITS:\n${data.userPromptEdits}\n\nIMPORTANT: Integrate user edits into the ultra-detailed structure.\n` : ''}

${data.shotList && data.shotList.length > 0 ? `USER'S REQUESTED SHOT LIST:\n${data.shotList.map(s => `Shot ${s.order} (${s.timing}): ${s.description}${s.camera ? ` | Camera: ${s.camera}` : ''}${s.lighting ? ` | Lighting: ${s.lighting}` : ''}`).join('\n')}\n\nIMPORTANT: Incorporate shot structure into ultra-detailed format.\n` : ''}

AGENT CONTRIBUTIONS:
${JSON.stringify({ round1: data.round1, round2: data.round2 }, null, 2)}

Generate THREE outputs:

1. DETAILED BREAKDOWN (structured technical sections):
- Format & Look: Duration, shutter, capture format, grain, optical effects
- Lenses & Filtration: Specific lenses, filters, technical notes
- Grade/Palette: Highlights, mids, blacks color treatment
- Lighting & Atmosphere: Key, fill, negative fill, practicals, atmosphere
- Location & Framing: Location, foreground, midground, background, avoidances
- Wardrobe/Props/Extras: Characters (with ethnicity/skin tone), extras, props
- Sound: Type, elements, levels, exclusions
- Shot List: Each shot with timing, title, lens, movement, description, purpose
- Camera Notes: Eyeline, optical effects, handheld quality, exposure
- Finishing: Grain, halation, LUT, mix, poster frame

2. ULTRA-DETAILED STRUCTURED PROMPT (2000-3000 characters):

[Follow the exact structure as shown in the user's example with all section headers and comprehensive details]

- MUST be structured with clear section headers
- MUST be 2000-3000 characters with comprehensive detail
- MUST include specific technical specifications
- Professional cinematography documentation style
${data.userPromptEdits ? '- INCORPORATE user edits into appropriate sections' : ''}
${data.shotList ? '- REFLECT shot list structure in Optimized Shot List section' : ''}

3. SUGGESTED SHOT LIST (2-6 shots with full technical specs):
${data.shotList ? '- REFINE user shot list with ultra-detailed cinematography specs' : '- Generate new ultra-detailed shot list'}
- Shot timing with decimals (e.g., "0.00-2.40")
- Shot title/name
- Specific lens choice
- Camera movement description
- Detailed composition and action
- Purpose/intent statement
- Order shots sequentially from 1 to N

Return JSON:
{
  "breakdown": {
    "format_and_look": "Duration, shutter, capture format, grain, optical effects",
    "lenses_and_filtration": "Specific lenses, filters, technical notes",
    "grade_palette": "Highlights, mids, blacks treatment",
    "lighting_atmosphere": "Key, fill, negative fill, practicals, atmosphere",
    "location_framing": "Location, foreground, midground, background, avoidances",
    "wardrobe_props_extras": "Characters with ethnicity/skin tone, extras, props",
    "sound": "Type, elements, levels, exclusions",
    "shot_list_summary": "Number of shots and total duration",
    "camera_notes": "Eyeline, optical effects, handheld quality, exposure",
    "finishing": "Grain, halation, LUT, mix, poster frame"
  },
  "optimized_prompt": "Format & Look\\nDuration 8s; 180° shutter; digital capture emulating 35mm photochemical; fine grain; subtle halation on speculars.\\n\\nLenses & Filtration\\n24mm / 50mm spherical primes; Black Pro-Mist 1/8.\\n\\n... [FULL ULTRA-DETAILED PROMPT 2000-3000 chars]",
  "character_count": 2450,
  "suggested_shots": [
    {
      "timing": "0.00-3.00",
      "title": "Setup",
      "description": "Wide shot captures backyard setup; Lyle and Tom arranging bottles on grass",
      "camera": "24mm handheld for playful energy",
      "lens": "24mm",
      "movement": "handheld",
      "order": 1,
      "lighting": "Natural sunlight creating glints on bottles",
      "notes": "Purpose: establish playful energy",
      "purpose": "establish playful energy and scene context"
    }
  ]
}
`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: getModelForFeature('synthesis'),
    messages: [
      {
        role: 'system',
        content: 'You are an ULTRA-DETAILED CINEMATOGRAPHY SYNTHESIZER for Scenra video generation. You transform production team contributions into HIGHLY DETAILED PROFESSIONAL CINEMATOGRAPHY DOCUMENTATION with comprehensive technical specifications. Target: 2000-3000 characters with structured sections and precise technical details. Style: Professional cinematography documentation - detailed shot specs, lighting design, technical parameters. USE FULL PROFESSIONAL TERMINOLOGY - specific equipment, measurements, technical specifications. Format with clear section headers: Format & Look, Lenses & Filtration, Grade/Palette, Lighting & Atmosphere, Location & Framing, Wardrobe/Props/Extras, Sound, Optimized Shot List, Camera Notes, Finishing. When users provide edits or shot lists, integrate them into the appropriate ultra-detailed sections.',
      },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')

  // Ensure hashtags is always an array of strings
  const hashtags = Array.isArray(result.breakdown?.hashtags)
    ? result.breakdown.hashtags.filter((tag: any) => typeof tag === 'string')
    : []

  // Ensure suggested shots is valid
  const suggestedShots = Array.isArray(result.suggested_shots)
    ? result.suggested_shots.map((shot: any, index: number) => ({
        timing: shot.timing || `${index * 4}-${(index + 1) * 4}s`,
        description: shot.description || '',
        camera: shot.camera || '',
        order: shot.order || index + 1,
        lighting: shot.lighting,
        notes: shot.notes,
      }))
    : []

  return {
    breakdown: result.breakdown || {},
    prompt: result.optimized_prompt || '',
    characterCount: result.character_count || 0,
    hashtags,
    suggestedShots,
  }
}
