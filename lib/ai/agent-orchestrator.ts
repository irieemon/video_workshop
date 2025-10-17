import OpenAI from 'openai'
import { AgentName, AgentResponse, AgentDiscussion, DetailedBreakdown, VisualTemplate } from '../types/database.types'
import { agentSystemPrompts } from './agent-prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface RoundtableInput {
  brief: string
  platform: 'tiktok' | 'instagram'
  visualTemplate?: VisualTemplate
  userId: string
}

interface RoundtableResult {
  discussion: AgentDiscussion
  detailedBreakdown: DetailedBreakdown
  optimizedPrompt: string
  characterCount: number
  hashtags: string[]
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
}> {
  const synthesisPrompt = `
You are synthesizing a creative film crew roundtable discussion into structured video prompt outputs.

DISCUSSION SUMMARY:
${JSON.stringify(data, null, 2)}

Generate TWO outputs:

1. DETAILED BREAKDOWN (structured sections):
- Scene Structure (with timestamps)
- Visual Specifications (aspect ratio, lighting, camera, color)
- Audio Direction (music/sound)
- Platform Optimization (${data.platform}-specific)
- Recommended Hashtags (5-10 tags)

2. OPTIMIZED SORA2 PROMPT (character-limited, under 500 chars):
- Concise, technical, Sora-optimized format
- Preserve critical visual/narrative elements
- Remove redundancy

Return JSON:
{
  "breakdown": {
    "scene_structure": "...",
    "visual_specs": "...",
    "audio": "...",
    "platform_optimization": "...",
    "hashtags": ["tag1", "tag2", ...]
  },
  "optimized_prompt": "...",
  "character_count": 437
}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at distilling creative discussions into structured video prompts.',
      },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')

  return {
    breakdown: result.breakdown,
    prompt: result.optimized_prompt,
    characterCount: result.character_count,
    hashtags: result.breakdown.hashtags,
  }
}
