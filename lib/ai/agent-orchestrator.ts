import OpenAI from 'openai'
import { AgentName, AgentResponse, AgentDiscussion, DetailedBreakdown, VisualTemplate, Shot } from '../types/database.types'
import { agentSystemPrompts } from './agent-prompts'

// Lazy initialization to avoid build-time API key requirement
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface RoundtableInput {
  brief: string
  platform: 'tiktok' | 'instagram'
  visualTemplate?: VisualTemplate
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
  const { brief, platform, visualTemplate } = input

  // Round 1: Parallel agent responses
  const agents: AgentName[] = [
    'director',
    'photography_director',
    'platform_expert',
    'social_media_marketer',
    'music_producer',
  ]

  const round1Promises = agents.map(agent =>
    callAgent(agent, brief, platform, visualTemplate)
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
  visualTemplate?: VisualTemplate
): Promise<AgentResponse> {
  const systemPrompt = agentSystemPrompts[agentName]

  const userMessage = `Brief: ${brief}\nPlatform: ${platform}${
    visualTemplate ? `\nSeries Template: ${JSON.stringify(visualTemplate)}` : ''
  }`

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
You are synthesizing a creative film crew roundtable discussion into structured video prompt outputs.

CRITICAL COPYRIGHT SAFETY RULES:
- REMOVE all copyrighted brand names, product names, celebrity names, character names
- REMOVE all references to specific movies, TV shows, songs, artists, albums
- REMOVE all trademarked terms, logos, or IP references
- REPLACE with GENERIC descriptions: "luxury car" not "Ferrari", "action hero" not "Iron Man"
- ENSURE the final Sora prompt is 100% copyright-safe and will not trigger violations
- If discussion contains copyrighted content, translate to generic equivalents

DISCUSSION SUMMARY:
${JSON.stringify(data, null, 2)}

Generate THREE outputs:

1. DETAILED BREAKDOWN (structured sections):
- Scene Structure (with timestamps)
- Visual Specifications (aspect ratio, lighting, camera, color)
- Audio Direction (GENERIC music moods/styles ONLY - NO specific songs/artists)
- Platform Optimization (${data.platform}-specific)
- Recommended Hashtags (5-10 tags, NO branded hashtags without permission)

2. OPTIMIZED SORA2 PROMPT (character-limited, under 500 chars):
- Concise, technical, Sora-optimized format
- Preserve critical visual/narrative elements
- Remove redundancy
- MUST BE 100% COPYRIGHT-SAFE (no brands, IPs, celebrities, songs)

3. SUGGESTED SHOT LIST (3-6 shots based on discussion):
- Break down the video into specific shots with timing
- Include description, camera movement, and lighting for each shot
- Order shots sequentially from 1 to N

Return JSON:
{
  "breakdown": {
    "scene_structure": "...",
    "visual_specs": "...",
    "audio": "... (GENERIC music description only)",
    "platform_optimization": "...",
    "hashtags": ["tag1", "tag2", ...]
  },
  "optimized_prompt": "... (COPYRIGHT-SAFE prompt)",
  "character_count": 437,
  "suggested_shots": [
    {
      "timing": "0-3s",
      "description": "Wide establishing shot description",
      "camera": "Slow dolly in, eye level",
      "order": 1,
      "lighting": "Natural, warm tones",
      "notes": "Optional specific details"
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
        content: 'You are an expert at distilling creative discussions into structured, COPYRIGHT-SAFE video prompts. You MUST remove all copyrighted content and replace with generic descriptions.',
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
  const { brief, platform, visualTemplate, userPromptEdits, shotList, additionalGuidance } = input

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
  ]

  const round1Promises = agents.map(agent =>
    callAgent(agent, enhancedBrief, platform, visualTemplate)
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
You are synthesizing a creative film crew roundtable discussion into structured video prompt outputs.

CRITICAL COPYRIGHT SAFETY RULES:
- REMOVE all copyrighted brand names, product names, celebrity names, character names
- REMOVE all references to specific movies, TV shows, songs, artists, albums
- REMOVE all trademarked terms, logos, or IP references
- REPLACE with GENERIC descriptions: "luxury car" not "Ferrari", "action hero" not "Iron Man"
- ENSURE the final Sora prompt is 100% copyright-safe and will not trigger violations
- If discussion contains copyrighted content, translate to generic equivalents

${data.userPromptEdits ? `USER'S DIRECT PROMPT EDITS:\n${data.userPromptEdits}\n\nIMPORTANT: Respect the user's edits while ensuring copyright safety.\n` : ''}

${data.shotList && data.shotList.length > 0 ? `USER'S REQUESTED SHOT LIST:\n${data.shotList.map(s => `Shot ${s.order} (${s.timing}): ${s.description}${s.camera ? ` | Camera: ${s.camera}` : ''}${s.lighting ? ` | Lighting: ${s.lighting}` : ''}`).join('\n')}\n\nIMPORTANT: Incorporate this shot structure into the final prompt.\n` : ''}

DISCUSSION SUMMARY:
${JSON.stringify({ round1: data.round1, round2: data.round2 }, null, 2)}

Generate THREE outputs:

1. DETAILED BREAKDOWN (structured sections):
- Scene Structure (with timestamps${data.shotList ? ' - MATCH USER SHOT LIST' : ''})
- Visual Specifications (aspect ratio, lighting, camera, color)
- Audio Direction (GENERIC music moods/styles ONLY - NO specific songs/artists)
- Platform Optimization (${data.platform}-specific)
- Recommended Hashtags (5-10 tags, NO branded hashtags without permission)

2. OPTIMIZED SORA2 PROMPT (character-limited, under 500 chars):
- Concise, technical, Sora-optimized format
- Preserve critical visual/narrative elements
- Remove redundancy
- MUST BE 100% COPYRIGHT-SAFE (no brands, IPs, celebrities, songs)
${data.userPromptEdits ? '- INCORPORATE user prompt edits while maintaining quality' : ''}
${data.shotList ? '- REFLECT shot list structure in prompt' : ''}

3. SUGGESTED SHOT LIST (3-6 shots based on discussion):
${data.shotList ? '- REFINE and improve the user-provided shot list' : '- Generate new shot list based on discussion'}
- Break down the video into specific shots with timing
- Include description, camera movement, and lighting for each shot
- Order shots sequentially from 1 to N

Return JSON:
{
  "breakdown": {
    "scene_structure": "...",
    "visual_specs": "...",
    "audio": "... (GENERIC music description only)",
    "platform_optimization": "...",
    "hashtags": ["tag1", "tag2", ...]
  },
  "optimized_prompt": "... (COPYRIGHT-SAFE prompt)",
  "character_count": 437,
  "suggested_shots": [
    {
      "timing": "0-3s",
      "description": "Wide establishing shot description",
      "camera": "Slow dolly in, eye level",
      "order": 1,
      "lighting": "Natural, warm tones",
      "notes": "Optional specific details"
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
        content: 'You are an expert at distilling creative discussions into structured, COPYRIGHT-SAFE video prompts. You MUST remove all copyrighted content and replace with generic descriptions. When users provide edits or shot lists, respect their creative vision while ensuring copyright safety.',
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
