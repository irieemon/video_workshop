import OpenAI from 'openai'
import { AgentName, AgentResponse, AgentDiscussion, DetailedBreakdown, VisualTemplate, Shot } from '../types/database.types'
import { agentSystemPrompts } from './agent-prompts'

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

interface RoundtableInput {
  brief: string
  platform: 'tiktok' | 'instagram'
  visualTemplate?: VisualTemplate
  seriesCharacters?: SeriesCharacter[]
  seriesSettings?: SeriesSetting[]
  visualAssets?: VisualAsset[]
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
  const { brief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets } = input

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
    callAgent(agent, brief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets)
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
  visualAssets?: VisualAsset[]
): Promise<AgentResponse> {
  const systemPrompt = agentSystemPrompts[agentName]

  let userMessage = `Brief: ${brief}\nPlatform: ${platform}`

  if (visualTemplate) {
    userMessage += `\nSeries Template: ${JSON.stringify(visualTemplate)}`
  }

  if (seriesCharacters && seriesCharacters.length > 0) {
    userMessage += `\n\nCHARACTERS IN THIS SCENE:\n`
    seriesCharacters.forEach(char => {
      userMessage += `- ${char.name}: ${char.description}`
      if (char.role) userMessage += ` (Role: ${char.role})`
      if (char.performance_style) userMessage += ` | Performance Style: ${char.performance_style}`
      userMessage += '\n'
    })
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
    model: 'gpt-4o', // Will use GPT-5 when available
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
    model: 'gpt-4o',
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
}): Promise<{
  breakdown: DetailedBreakdown
  prompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots: Shot[]
}> {
  const synthesisPrompt = `
You are synthesizing production team input into a CINEMATIC NARRATIVE PROMPT for Sora2 video generation.

CRITICAL OUTPUT REQUIREMENTS:
- NATURAL LANGUAGE cinematography - like briefing a cinematographer, not writing code
- BLEND storytelling with technical direction (50% narrative / 50% technical)
- TARGET: 800-1000 characters in flowing prose
- STYLE: Director's shot notes - specific but readable
- NO ABBREVIATIONS - use professional cinematography terminology

CINEMATIC NARRATIVE STRUCTURE:
Weave agent contributions into flowing prose with these integrated sections:

1. SCENE SETUP (2-3 sentences): Environment, time, mood, atmosphere
2. SUBJECT ACTION (3-4 sentences with timing): Who, what they're doing, emotional beats with timing markers like (0-2s), (2-5s), (5-7s)
3. CAMERA DIRECTION (2-3 sentences): Shot type, lens, movement, composition using terms like "medium shot", "50mm lens", "locked on tripod", "rule of thirds"
4. LIGHTING & ATMOSPHERE (2 sentences): Light quality, direction, color palette - descriptive language, no Kelvin temperatures
5. AUDIO CUE (1 sentence): Sound design, foley, ambient tone
6. PLATFORM NOTE (appended): Aspect ratio and framing like "Vertical 9:16 frame"

COPYRIGHT SAFETY:
- Generic subjects only: "person", "hands", "product", "professional"
- No brands, IPs, celebrities, copyrighted music
- Descriptive without brand references

AGENT CONTRIBUTIONS:
${JSON.stringify(data, null, 2)}

Generate THREE outputs:

1. DETAILED BREAKDOWN (natural language sections):
- Subject Direction: Subject identity, action choreography, performance quality, emotional context
- Scene Structure: Setting, mood, atmosphere, narrative framing
- Camera Specifications: Shot types, lens choices, movements, framing in readable terms
- Lighting Setup: Light sources, direction, quality, color palette
- Composition Rules: Framing rules, subject placement, visual hierarchy
- Platform Specs: Aspect ratio, safe zones, platform context

2. CINEMATIC NARRATIVE PROMPT (800-1000 characters, natural prose):

EXAMPLE FORMAT:
"A minimalist desk sits beneath a tall window in a sun-drenched room, morning light streaming through translucent curtains. The space feels quiet and intentional.

A pair of hands enters the frame from the left, fingers moving with deliberate care (0-2s). They unwrap white tissue paper, revealing a luxury serum bottle (2-5s). The hands lift the bottle to eye level with quiet confidence (5-7s).

Medium shot with a 50mm lens at eye level, camera locked on tripod. Composition follows the rule of thirds. Background falls into bokeh at f/2.8.

Soft window light from 45 degrees creates gentle shadows. Warm amber tones evoke morning luxury.

Gentle tissue rustling and ambient room tone. Vertical 9:16 frame with product in upper two-thirds."

- MUST be natural language (no abbreviations like "MS", "K45°R", "DELIB")
- MUST be 800-1000 characters
- MUST blend storytelling with cinematography
- Specific but readable - professional film terminology

3. SUGGESTED SHOT LIST (3-6 shots with natural language specs):
- Use readable cinematography terminology
- Exact timestamps for each shot
- Camera, lighting, composition in natural language
- Order shots sequentially from 1 to N

Return JSON:
{
  "breakdown": {
    "subject_direction": "Natural language: subject identity, choreography, performance, context",
    "scene_structure": "Natural language: setting, mood, atmosphere",
    "camera_specs": "Natural language: shot types, lenses, movements, framing",
    "lighting_setup": "Natural language: light sources, direction, quality, color",
    "composition_rules": "Natural language: framing rules, placement, hierarchy",
    "platform_specs": "Natural language: aspect ratio, safe zones"
  },
  "optimized_prompt": "A minimalist desk sits beneath a tall window in a sun-drenched room, morning light streaming through translucent curtains. The space feels quiet and intentional. A pair of hands enters the frame from the left, fingers moving with deliberate care (0-2s). They unwrap white tissue paper, revealing a luxury serum bottle (2-5s). The hands lift the bottle to eye level with quiet confidence (5-7s). Medium shot with a 50mm lens at eye level, camera locked on tripod. Composition follows the rule of thirds. Background falls into bokeh at f/2.8. Soft window light from 45 degrees creates gentle shadows. Warm amber tones evoke morning luxury. Gentle tissue rustling and ambient room tone. Vertical 9:16 frame with product in upper two-thirds. [~850 chars]",
  "character_count": 850,
  "suggested_shots": [
    {
      "timing": "0-3s",
      "description": "Medium shot at eye level, hands enter from left and begin unwrapping",
      "camera": "Medium shot with 50mm lens, locked on tripod",
      "order": 1,
      "lighting": "Soft window light from 45 degrees with gentle shadows",
      "notes": "Rule of thirds composition, hands in lower left"
    }
  ]
}
`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a CINEMATIC NARRATIVE SYNTHESIZER for Sora2 video generation. You transform production team contributions into NATURAL LANGUAGE prompts that blend storytelling with cinematography (50/50 balance). Target: 800-1000 characters in flowing prose. Style: Director\'s shot notes - specific but readable. NO ABBREVIATIONS - use professional film terminology. Weave scene setup, subject action, camera direction, lighting atmosphere, audio, and platform specs into cohesive narrative prose.',
      },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.5,
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

export async function runAdvancedRoundtable(input: AdvancedRoundtableInput): Promise<RoundtableResult> {
  const { brief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets, userPromptEdits, shotList, additionalGuidance } = input

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
    callAgent(agent, enhancedBrief, platform, visualTemplate, seriesCharacters, seriesSettings, visualAssets)
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
}): Promise<{
  breakdown: DetailedBreakdown
  prompt: string
  characterCount: number
  hashtags: string[]
  suggestedShots: Shot[]
}> {
  const synthesisPrompt = `
You are synthesizing production team input into a CINEMATIC NARRATIVE PROMPT for Sora2 video generation.

CRITICAL OUTPUT REQUIREMENTS:
- NATURAL LANGUAGE cinematography - like briefing a cinematographer, not writing code
- BLEND storytelling with technical direction (50% narrative / 50% technical)
- TARGET: 800-1000 characters in flowing prose
- STYLE: Director's shot notes - specific but readable
- NO ABBREVIATIONS - use professional cinematography terminology

CINEMATIC NARRATIVE STRUCTURE:
The final prompt should flow as natural prose with 5 integrated sections:

1. SCENE SETUP (2-3 sentences): Environment, time, mood, atmosphere
   - Natural prose setting the scene
   - Physics-aware language (how light behaves, spatial relationships)
   - Evocative but specific

2. SUBJECT ACTION (3-4 sentences with timing): Who, what they're doing, emotional beats
   - Subject identity and action choreography
   - Timing beats integrated naturally: "(0-2s)", "(2-5s)", "(5-7s)"
   - Performance quality: "deliberate and unhurried", "confident movements", "subtle and restrained"

3. CAMERA DIRECTION (2-3 sentences): Shot type, lens, movement, composition
   - Professional terms: "medium shot", "50mm lens", "locked on tripod"
   - Composition rules: "following the rule of thirds", "positioned in upper right intersection"
   - Depth of field: "background falls into bokeh at f/2.8"

4. LIGHTING & ATMOSPHERE (2 sentences): Light quality, direction, color palette
   - Descriptive: "soft directional light from 45 degrees"
   - Color mood: "warm color palette with amber tones"
   - NO Kelvin temperatures or technical notation

5. AUDIO CUE (1 sentence): Sound design, foley, ambient tone
   - Brief and specific: "gentle foley of tissue rustling"

6. PLATFORM NOTE (appended): Aspect ratio and framing
   - "Vertical 9:16 frame with subject positioned in upper two-thirds"

COPYRIGHT SAFETY:
- Generic subjects only: "person", "hands", "product", "professional"
- No brands, IPs, celebrities, copyrighted music
- Descriptive without brand references

${data.userPromptEdits ? `USER'S DIRECT PROMPT EDITS:\n${data.userPromptEdits}\n\nIMPORTANT: Integrate user edits into natural cinematography language.\n` : ''}

${data.shotList && data.shotList.length > 0 ? `USER'S REQUESTED SHOT LIST:\n${data.shotList.map(s => `Shot ${s.order} (${s.timing}): ${s.description}${s.camera ? ` | Camera: ${s.camera}` : ''}${s.lighting ? ` | Lighting: ${s.lighting}` : ''}`).join('\n')}\n\nIMPORTANT: Incorporate shot structure into narrative prompt.\n` : ''}

AGENT CONTRIBUTIONS:
${JSON.stringify({ round1: data.round1, round2: data.round2 }, null, 2)}

Generate THREE outputs:

1. DETAILED BREAKDOWN (natural language sections):
- Subject Direction: Subject identity, action choreography, performance quality, emotional context
- Scene Structure: Setting, mood, atmosphere, narrative framing
- Camera Specifications: Shot types, lens choices, movements, framing in readable terms
- Lighting Setup: Light sources, direction, quality, color palette
- Composition Rules: Framing rules, subject placement, visual hierarchy
- Platform Specs: Aspect ratio, safe zones, platform context

2. CINEMATIC NARRATIVE PROMPT (800-1000 characters, natural prose):

Weave all agent contributions into flowing prose that reads like director's shot notes. Structure:

[Scene Setup - 2-3 sentences setting environment and mood]

[Subject Action - 3-4 sentences with timing beats (0-2s), (2-5s), (5-7s) describing choreography and performance]

[Camera Direction - 2-3 sentences with shot type, lens, movement, composition rules]

[Lighting & Atmosphere - 2 sentences describing light and color]

[Audio - 1 sentence with sound design] [Platform - 1 sentence with aspect ratio]

EXAMPLE FORMAT:
"A minimalist desk sits beneath a tall window in a sun-drenched room, morning light streaming through translucent curtains. The space feels quiet and intentional, like the opening moments of a daily ritual.

A pair of hands enters the frame from the left, fingers moving with deliberate care (0-2s). They begin unwrapping white tissue paper, each fold revealing the luxury product beneath (2-5s). The hands lift a serum bottle to eye level, holding it steady with quiet confidence (5-7s).

Medium shot captured with a 50mm lens at eye level, camera locked on a tripod. The composition follows the rule of thirds—product positioned in the upper right intersection, hands framing the lower left quadrant. Background falls into bokeh at f/2.8.

Soft directional window light from 45 degrees creates gentle shadows, with subtle fill from the left. The warm color palette with amber tones evokes morning luxury.

Gentle foley of tissue rustling and glass touching skin, with ambient room tone. Vertical 9:16 frame with product in upper two-thirds."

- MUST be natural language (no abbreviations like "MS", "K45°R", "DELIB")
- MUST be 800-1000 characters
- MUST blend storytelling with cinematography
- Specific but readable - professional film terminology
${data.userPromptEdits ? '- INCORPORATE user edits naturally' : ''}
${data.shotList ? '- REFLECT shot list structure in narrative flow' : ''}

3. SUGGESTED SHOT LIST (3-6 shots with natural language specs):
${data.shotList ? '- REFINE user shot list with readable cinematography terms' : '- Generate new shot list with natural language specs'}
- Use readable cinematography terminology
- Exact timestamps for each shot
- Camera, lighting, composition in natural language
- Order shots sequentially from 1 to N

Return JSON:
{
  "breakdown": {
    "subject_direction": "Natural language: subject identity, choreography, performance, context",
    "scene_structure": "Natural language: setting, mood, atmosphere",
    "camera_specs": "Natural language: shot types, lenses, movements, framing",
    "lighting_setup": "Natural language: light sources, direction, quality, color",
    "composition_rules": "Natural language: framing rules, placement, hierarchy",
    "platform_specs": "Natural language: aspect ratio, safe zones"
  },
  "optimized_prompt": "A minimalist desk sits beneath a tall window in a sun-drenched room, morning light streaming through translucent curtains. The space feels quiet and intentional. A pair of hands enters the frame from the left, fingers moving with deliberate care (0-2s). They unwrap white tissue paper, revealing a luxury serum bottle (2-5s). The hands lift the bottle to eye level with quiet confidence (5-7s). Medium shot with a 50mm lens at eye level, camera locked on tripod. Composition follows the rule of thirds. Background falls into bokeh at f/2.8. Soft window light from 45 degrees creates gentle shadows. Warm amber tones evoke morning luxury. Gentle tissue rustling and ambient room tone. Vertical 9:16 frame with product in upper two-thirds. [~850 chars]",
  "character_count": 850,
  "suggested_shots": [
    {
      "timing": "0-3s",
      "description": "Medium shot at eye level, hands enter from left and begin unwrapping",
      "camera": "Medium shot with 50mm lens, locked on tripod",
      "order": 1,
      "lighting": "Soft window light from 45 degrees with gentle shadows",
      "notes": "Rule of thirds composition, hands in lower left"
    }
  ]
}
`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a CINEMATIC NARRATIVE SYNTHESIZER for Sora2 video generation. You transform production team contributions into NATURAL LANGUAGE prompts that blend storytelling with cinematography (50/50 balance). Target: 800-1000 characters in flowing prose. Style: Director\'s shot notes - specific but readable. NO ABBREVIATIONS - use professional film terminology. Weave scene setup, subject action, camera direction, lighting atmosphere, audio, and platform specs into cohesive narrative prose. When users provide edits or shot lists, integrate them naturally into the cinematic narrative.',
      },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.5,
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
