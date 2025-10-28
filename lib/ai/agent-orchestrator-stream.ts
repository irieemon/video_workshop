import OpenAI from 'openai'
import { getModelForFeature } from './config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout for API calls
})

// Agent definitions with distinct personalities
const agents = {
  director: {
    name: 'Director',
    role: 'Creative Director',
    emoji: '🎬',
    expertise: 'Creative vision, storytelling, and overall narrative direction',
    personality: 'visionary, enthusiastic, big-picture thinker who speaks with passion and inspiration',
    conversationalPrompt: (brief: string, previousAgents: string[]) => {
      const references = previousAgents.length > 0
        ? `\n\nPrevious insights to build on: ${previousAgents.join(', ')} have already shared their thoughts.`
        : ''
      return `You are an enthusiastic Creative Director in a collaborative video production meeting.

PERSONALITY: Visionary, passionate, big-picture thinker. You speak with inspiration and emotion about storytelling.

TASK: Analyze this video brief and share your creative vision in a CONVERSATIONAL way, as if speaking to your team in a meeting.

- Speak in 3-5 SHORT sentences (1-2 sentences per thought)
- Be enthusiastic and paint the emotional vision
- Reference other team members if they've spoken: ${previousAgents.join(', ')}
- Sound human and natural, not robotic
- Each sentence should be a complete thought that can stand alone

Brief: ${brief}${references}

Respond ONLY with your conversational thoughts, nothing else.`
    },
    technicalPrompt: (brief: string) =>
      `You are a creative director. Provide technical narrative specs: story structure (three-act, vignette, montage), emotional beat timing and progression, character motivation and arc, visual metaphors or symbolic elements, wardrobe/prop storytelling function, location narrative purpose, and sound design narrative role. Focus on story mechanics. Brief: ${brief}`,
  },
  cinematographer: {
    name: 'Cinematographer',
    role: 'Director of Photography',
    emoji: '📹',
    expertise: 'Visual composition, camera work, and shot design',
    personality: 'technical, precise, visual-focused who speaks methodically about camera work',
    conversationalPrompt: (brief: string, previousAgents: string[]) => {
      const references = previousAgents.length > 0
        ? `Building on what ${previousAgents[previousAgents.length - 1]} said, `
        : ''
      return `You are a precise Cinematographer in a collaborative video production meeting.

PERSONALITY: Technical, detail-oriented, visual-focused. You speak methodically about camera and composition.

TASK: Analyze this brief and share your visual approach CONVERSATIONALLY, as if speaking to your team.

- Speak in 2-4 SHORT sentences (1-2 sentences per thought)
- Reference the Director's vision if they spoke: "${references}"
- Focus on HOW you'll capture the vision visually
- Sound like a real cinematographer in a meeting, not a textbook
- Each sentence should be a complete thought

Brief: ${brief}

Respond ONLY with your conversational thoughts, nothing else.`
    },
    technicalPrompt: (brief: string) =>
      `You are a cinematographer. Provide precise technical specs: specific focal lengths (e.g., 24mm, 35mm, 50mm, 85mm), lens type (spherical/anamorphic primes or zooms), filtration (Black Pro-Mist rating, ND strength, CPL), camera movements with speed (slow dolly, tracking shot, handheld shake), framing rules (rule of thirds, headroom, lead room), and composition notes. Use professional terminology. Brief: ${brief}`,
  },
  editor: {
    name: 'Editor',
    role: 'Video Editor',
    emoji: '✂️',
    expertise: 'Pacing, transitions, and flow',
    personality: 'energetic, rhythm-focused, audience-aware who speaks about pacing and flow',
    conversationalPrompt: (brief: string, previousAgents: string[]) => {
      const references = previousAgents.slice(-2).join(' and ')
      return `You are an energetic Video Editor in a collaborative video production meeting.

PERSONALITY: Rhythm-focused, practical, audience-aware. You speak with energy about pacing and keeping viewers engaged.

TASK: Analyze this brief and share your editing approach CONVERSATIONALLY.

- Speak in 2-4 SHORT sentences (1-2 sentences per thought)
- Reference previous speakers: "${references}"
- Focus on RHYTHM, PACING, and audience retention
- Sound excited about the creative direction
- Each sentence should be a complete thought

Brief: ${brief}

Respond ONLY with your conversational thoughts, nothing else.`
    },
    technicalPrompt: (brief: string) =>
      `You are a video editor. Provide precise editing specs: exact shot duration ranges (e.g., 2.5-4.0s per cut), transition types with timing (dissolve 0.5s, cut, J/L cut), pacing rhythm (slow/medium/fast with BPM if applicable), sound design sync points, flow structure (linear, rhythmic, montage), and cut motivation. Use editorial terminology. Brief: ${brief}`,
  },
  colorist: {
    name: 'Colorist',
    role: 'Color Grading Specialist',
    emoji: '🎨',
    expertise: 'Color grading, mood, and visual atmosphere',
    personality: 'artistic, sensory, poetic who speaks about mood and atmosphere',
    conversationalPrompt: (brief: string, previousAgents: string[]) => {
      return `You are an artistic Colorist in a collaborative video production meeting.

PERSONALITY: Poetic, sensory, mood-focused. You speak artistically about color and atmosphere.

TASK: Analyze this brief and share your color approach CONVERSATIONALLY.

- Speak in 2-4 SHORT sentences (1-2 sentences per thought)
- Reference the Director's emotional vision or Cinematographer's visual approach
- Focus on MOOD, ATMOSPHERE, and emotional color impact
- Sound poetic but not pretentious
- Each sentence should be a complete thought

Brief: ${brief}

Respond ONLY with your conversational thoughts, nothing else.`
    },
    technicalPrompt: (brief: string) =>
      `You are a colorist. Provide precise grading specs: Highlights (color cast, lift/gain), Mids (balance, tint direction), Blacks (lift level, color treatment), specific LUT recommendations, color palette with tonal range assignments, contrast curve approach, saturation strategy per channel, and atmospheric color effects (haze, mist color temperature). Use colorist terminology. Brief: ${brief}`,
  },
  platform_expert: {
    name: 'Platform Expert',
    role: 'Platform Specialist',
    emoji: '📱',
    expertise: 'Platform-specific optimization and best practices',
    personality: 'strategic, data-driven, optimization-focused who speaks about audience and performance',
    conversationalPrompt: (brief: string, platform: string, previousAgents: string[]) => {
      return `You are a strategic ${platform} Platform Expert in a collaborative video production meeting.

PERSONALITY: Data-driven, tactical, audience-focused. You speak strategically about optimization and viewer behavior.

TASK: Analyze this brief and share your platform strategy CONVERSATIONALLY.

- Speak in 3-5 SHORT sentences (1-2 sentences per thought)
- Reference how you'll optimize what the team has discussed
- Focus on ${platform}-specific hooks, timing, and audience retention
- Sound strategic and knowledgeable about the platform
- Each sentence should be a complete thought

Brief: ${brief}

Respond ONLY with your conversational thoughts, nothing else.`
    },
    technicalPrompt: (brief: string, platform: string) =>
      `You are a ${platform} platform expert. Provide TECHNICAL specs only: optimal duration (in seconds), aspect ratio (e.g., 9:16, 16:9, 1:1), frame rate, resolution, and technical format requirements for ${platform}. NO marketing tactics, hashtags, or posting times. Brief: ${brief}`,
  },
}

type Agent = keyof typeof agents
type SendEvent = (type: string, data: any) => void

interface StreamRoundtableInput {
  brief: string
  platform: string
  visualTemplate?: string
  seriesCharacters?: any[]
  seriesSettings?: any[]
  visualAssets?: any[]
  characterRelationships?: any[]
  seriesSoraSettings?: any
  characterContext?: string
  screenplayContext?: string
  userId: string
}

export async function streamAgentRoundtable(
  input: StreamRoundtableInput,
  sendEvent: SendEvent
) {
  const {
    brief,
    platform,
    visualTemplate,
    seriesCharacters,
    seriesSettings,
    visualAssets,
    characterRelationships,
    seriesSoraSettings,
    characterContext,
    screenplayContext,
  } = input

  // Build context string
  let contextString = ''
  if (visualTemplate) {
    contextString += `\n\nVISUAL TEMPLATE:\n${visualTemplate}`
  }
  if (characterContext) {
    contextString += characterContext
  }
  if (screenplayContext) {
    contextString += screenplayContext
  }
  if (seriesSettings && seriesSettings.length > 0) {
    contextString += `\n\nSETTINGS:\n${seriesSettings.map(s => `- ${s.name}: ${s.description}`).join('\n')}`
  }
  if (seriesSoraSettings) {
    const soraSettings = [
      seriesSoraSettings.sora_camera_style && `Camera: ${seriesSoraSettings.sora_camera_style}`,
      seriesSoraSettings.sora_lighting_mood && `Lighting: ${seriesSoraSettings.sora_lighting_mood}`,
      seriesSoraSettings.sora_color_palette && `Colors: ${seriesSoraSettings.sora_color_palette}`,
      seriesSoraSettings.sora_overall_tone && `Tone: ${seriesSoraSettings.sora_overall_tone}`,
    ]
      .filter(Boolean)
      .join(', ')
    if (soraSettings) {
      contextString += `\n\nSORA SETTINGS: ${soraSettings}`
    }
  }

  // Send initial status
  sendEvent('status', {
    message: 'Creative team assembling...',
    stage: 'initialization',
  })

  // ROUND 1: Parallel agent analysis with streaming
  const agentOrder: Agent[] = [
    'director',
    'cinematographer',
    'editor',
    'colorist',
    'platform_expert',
  ]

  sendEvent('status', {
    message: 'Round 1: Creative team analyzing your brief...',
    stage: 'round1_start',
  })

  // Track completed agents for cross-referencing
  const completedAgents: string[] = []

  // PHASE 1: Stream all conversational responses sequentially (for natural UX)
  // This must be sequential so users see agents responding one at a time
  const conversationalResults: Array<{
    agent: Agent
    response: string
    error?: string
  }> = []

  for (const agentKey of agentOrder) {
    const agent = agents[agentKey]

    // Send typing indicator
    sendEvent('typing_start', {
      agent: agentKey,
      name: agent.name,
      emoji: agent.emoji,
      message: `${agent.emoji} ${agent.name} is typing...`,
    })

    try {
      // Generate conversational response with timeout protection
      let conversationalPrompt: string
      if (agentKey === 'platform_expert') {
        conversationalPrompt = agents.platform_expert.conversationalPrompt(brief, platform, completedAgents)
      } else {
        conversationalPrompt = (agent as any).conversationalPrompt(brief, completedAgents)
      }

      const conversationalMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: conversationalPrompt + contextString,
        },
      ]

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${agent.name} response timed out after 60 seconds`)), 60000)
      })

      // Race between API call and timeout
      const conversationalStream = await Promise.race([
        openai.chat.completions.create({
          model: getModelForFeature('agent'),
          messages: conversationalMessages,
          temperature: 0.8, // Higher temp for more natural conversation
          max_tokens: 300,
          stream: true,
        }),
        timeoutPromise
      ]) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>

      let conversationalResponse = ''
      let sentenceBuffer = ''

      for await (const chunk of conversationalStream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          conversationalResponse += content
          sentenceBuffer += content

          // Split into sentences for chunking
          if (content.includes('.') || content.includes('!') || content.includes('?')) {
            // Send complete sentence as a chunk
            sendEvent('message_chunk', {
              agent: agentKey,
              name: agent.name,
              emoji: agent.emoji,
              content: sentenceBuffer.trim(),
            })
            sentenceBuffer = ''
          }
        }
      }

      // Send any remaining content
      if (sentenceBuffer.trim()) {
        sendEvent('message_chunk', {
          agent: agentKey,
          name: agent.name,
          emoji: agent.emoji,
          content: sentenceBuffer.trim(),
        })
      }

      // Send message complete (without technical analysis yet)
      sendEvent('message_complete', {
        agent: agentKey,
        name: agent.name,
        emoji: agent.emoji,
        conversationalResponse,
        technicalAnalysis: '', // Will be filled in later
        message: `${agent.emoji} ${agent.name} has finished speaking`,
      })

      // Clear typing indicator for this agent
      sendEvent('typing_stop', {
        agent: agentKey,
        name: agent.name,
      })

      completedAgents.push(agent.name)
      conversationalResults.push({
        agent: agentKey,
        response: conversationalResponse,
      })
    } catch (error: any) {
      console.error(`Error in ${agent.name} (${agentKey}):`, error)
      sendEvent('agent_error', {
        agent: agentKey,
        name: agent.name,
        error: error.message || 'Failed to get response',
      })

      // Send typing stop even on error
      sendEvent('typing_stop', {
        agent: agentKey,
        name: agent.name,
      })

      conversationalResults.push({
        agent: agentKey,
        response: '',
        error: error.message,
      })
    }
  }

  // PHASE 2: Generate all technical analyses in PARALLEL (hidden from UI, don't block UX)
  // This is the optimization - technical calls don't need to be sequential since they're not shown to user
  const technicalPromises = agentOrder.map(async (agentKey) => {
    try {
      let technicalPrompt: string
      if (agentKey === 'platform_expert') {
        technicalPrompt = agents.platform_expert.technicalPrompt(brief, platform)
      } else {
        technicalPrompt = (agents[agentKey] as any).technicalPrompt(brief)
      }

      const technicalMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: technicalPrompt + contextString,
        },
      ]

      const technicalResponse = await openai.chat.completions.create({
        model: getModelForFeature('agent'),
        messages: technicalMessages,
        temperature: 0.7,
        max_tokens: 500,
      })

      return {
        agent: agentKey,
        technical: technicalResponse.choices[0]?.message?.content || '',
      }
    } catch (error: any) {
      console.error(`Error in technical analysis for ${agentKey}:`, error)
      return {
        agent: agentKey,
        technical: '',
        error: error.message,
      }
    }
  })

  // Wait for all technical analyses to complete
  const technicalResults = await Promise.all(technicalPromises)

  // PHASE 3: Combine conversational and technical results
  const round1Results = agentOrder.map((agentKey, index) => {
    const conversational = conversationalResults.find(r => r.agent === agentKey)
    const technical = technicalResults.find(r => r.agent === agentKey)

    return {
      agent: agentKey,
      conversational: conversational?.response || '',
      technical: technical?.technical || '',
      error: conversational?.error || technical?.error,
    }
  })

  sendEvent('status', {
    message: 'Round 1 complete. Team is now debating key creative decisions...',
    stage: 'round1_complete',
  })

  // ROUND 2: Creative debate (always happens for better user experience)
  const shouldDebate = true

  if (shouldDebate) {
    sendEvent('status', {
      message: 'Round 2: Creative debate emerging...',
      stage: 'round2_start',
    })

    // Pick two agents to debate
    const debateAgents: Agent[] = ['director', 'cinematographer']
    const challenger = agents[debateAgents[0]]
    const responder = agents[debateAgents[1]]

    // Agent 1 challenges
    sendEvent('debate_start', {
      challenger: debateAgents[0],
      challengerName: challenger.name,
      challengerEmoji: challenger.emoji,
      responder: debateAgents[1],
      responderName: responder.name,
      responderEmoji: responder.emoji,
      message: `${challenger.emoji} ${challenger.name} is challenging ${responder.emoji} ${responder.name}'s approach...`,
    })

    try {
      const challengeMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are ${challenger.name}. Challenge the ${responder.name}'s approach with a specific creative question or alternative perspective. Be constructive and professional. Keep it to 1-2 sentences.`,
        },
        {
          role: 'user',
          content: `Based on this brief: "${brief}"\n\nThe ${responder.name} suggested focusing on visual composition. What's your perspective or concern?`,
        },
      ]

      const challengeStream = await openai.chat.completions.create({
        model: getModelForFeature('agent'),
        messages: challengeMessages,
        temperature: 0.8,
        max_tokens: 150,
        stream: true,
      })

      let challengeResponse = ''
      for await (const chunk of challengeStream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          challengeResponse += content
          sendEvent('debate_chunk', {
            from: debateAgents[0],
            fromName: challenger.name,
            fromEmoji: challenger.emoji,
            content,
          })
        }
      }

      sendEvent('debate_message', {
        from: debateAgents[0],
        fromName: challenger.name,
        fromEmoji: challenger.emoji,
        to: debateAgents[1],
        toName: responder.name,
        message: challengeResponse,
      })

      // Agent 2 responds
      sendEvent('status', {
        message: `${responder.emoji} ${responder.name} is responding...`,
        stage: 'debate_response',
      })

      const responseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are ${responder.name}. Respond to the ${challenger.name}'s challenge. You can agree, defend your approach, or find a middle ground. Be professional and collaborative. Keep it to 1-2 sentences.`,
        },
        {
          role: 'user',
          content: `The ${challenger.name} said: "${challengeResponse}"\n\nHow do you respond?`,
        },
      ]

      const responseStream = await openai.chat.completions.create({
        model: getModelForFeature('agent'),
        messages: responseMessages,
        temperature: 0.8,
        max_tokens: 150,
        stream: true,
      })

      let debateResponse = ''
      for await (const chunk of responseStream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          debateResponse += content
          sendEvent('debate_chunk', {
            from: debateAgents[1],
            fromName: responder.name,
            fromEmoji: responder.emoji,
            content,
          })
        }
      }

      sendEvent('debate_message', {
        from: debateAgents[1],
        fromName: responder.name,
        fromEmoji: responder.emoji,
        to: debateAgents[0],
        toName: challenger.name,
        message: debateResponse,
      })

      sendEvent('debate_complete', {
        message: 'Creative debate concluded. Moving to synthesis...',
      })
    } catch (error: any) {
      sendEvent('debate_error', {
        error: error.message || 'Debate failed',
      })
    }
  }

  // FINAL SYNTHESIS
  sendEvent('status', {
    message: 'Synthesizing team insights into final prompt...',
    stage: 'synthesis_start',
  })

  try {
    // Use TECHNICAL analysis for prompt synthesis, not conversational
    const allInsights = round1Results
      .map(r => `${agents[r.agent].name}: ${r.technical}`)
      .join('\n\n')

    // Build character voice profile string if characters exist
    let voiceProfileString = ''
    if (seriesCharacters && seriesCharacters.length > 0) {
      const voiceProfiles = seriesCharacters
        .filter(char => char.voice_profile && Object.keys(char.voice_profile).length > 0)
        .map(char => {
          const vp = char.voice_profile
          return `${char.name}: ${vp.tone || ''} ${vp.pitch || ''} ${vp.pace || ''}, ${vp.accent || ''}, ${vp.mannerisms || ''}, ${vp.vocal_quirks || ''}`
            .replace(/\s+/g, ' ')
            .trim()
        })
        .filter(profile => profile.includes(':') && profile.length > 10)

      if (voiceProfiles.length > 0) {
        voiceProfileString = `\n\nCHARACTER VOICE PROFILES:\n${voiceProfiles.join('\n')}`
      }
    }

    const synthesisMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
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
2. Format dialogue with character names and their lines: "- CHARACTER_NAME: \"dialogue line\""
3. If character voice profiles are provided, include voice characteristics AFTER each character's dialogue
4. Example format:
   Dialogue:
   - ORIN: "Come on, Sol… what're you hiding in there?" (earthy Midwestern drawl, measured tone)
   - SOL: "You are accessing restricted archives, Engineer Kale." (soft, androgynous tone)
IMPORTANT: Always prioritize actual screenplay dialogue over generic descriptions. If dialogue exists in context, it MUST appear in this section.

**Optimized Shot List**
Numbered shots with timecodes, lens, movement, purpose. Format: "0.00–2.40 — "Shot Name" (lens, movement) | Description | Purpose"

**Camera Notes**
Technical shooting notes, why specific choices work, what to preserve/avoid

**Finishing**
Post-production specs, grain overlay, color finishing, mix priorities, poster frame description

Use technical terminology AND creative direction. Be specific with measurements, focal lengths, color values. Maintain professional cinematography standards while telling a compelling story.`,
      },
      {
        role: 'user',
        content: `Original Brief: ${brief}
Platform: ${platform}
Duration: ${platform.toLowerCase() === 'tiktok' || platform.toLowerCase() === 'instagram' ? '4-8s for short-form' : '8-12s for standard'}${characterContext || ''}${voiceProfileString}

Team Insights:
${allInsights}

Generate the Sora prompt following the required structure exactly. CRITICAL: Use character descriptions EXACTLY as provided above (age, appearance, personality). Do not change character details.`,
      },
    ]

    const synthesisStream = await openai.chat.completions.create({
      model: getModelForFeature('synthesis'),
      messages: synthesisMessages,
      temperature: 0.5, // Lower temperature for more consistent technical output
      max_tokens: 2000, // Increased for comprehensive technical prompt
      stream: true,
    })

    let finalPrompt = ''
    let chunkBuffer = ''

    sendEvent('synthesis_start', {
      message: '📝 Crafting final optimized prompt...',
    })

    for await (const chunk of synthesisStream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        finalPrompt += content
        chunkBuffer += content

        if (chunkBuffer.length > 50) {
          sendEvent('synthesis_chunk', {
            content: chunkBuffer,
          })
          chunkBuffer = ''
        }
      }
    }

    if (chunkBuffer) {
      sendEvent('synthesis_chunk', {
        content: chunkBuffer,
      })
    }

    sendEvent('synthesis_complete', {
      finalPrompt,
      message: '✅ Final prompt ready!',
    })

    // Generate suggested shots
    sendEvent('status', {
      message: 'Generating suggested shot list...',
      stage: 'shots_start',
    })

    const shotsMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Generate a technical shot list following this exact format for each shot:

0.00–2.40 — "Shot Name" (focal length, movement type)
Description of what happens in shot. Purpose: why this shot matters.

Requirements:
- Use specific timecodes (e.g., 0.00–2.40, 2.40–4.50)
- Include exact focal lengths (24mm, 35mm, 50mm, 85mm)
- Specify movement (slow dolly left, handheld tracking, static lock-off, slow arc)
- One-line description of shot content
- Purpose statement explaining compositional/narrative function

Generate 2-4 shots that fit the total duration.`,
      },
      {
        role: 'user',
        content: `Based on this technical prompt, generate the optimized shot list:

${finalPrompt}

Shot list:`,
      },
    ]

    const shotsStream = await openai.chat.completions.create({
      model: getModelForFeature('synthesis'),
      messages: shotsMessages,
      temperature: 0.5, // Lower temperature for consistent technical format
      max_tokens: 800, // Increased for detailed shot descriptions
      stream: true,
    })

    let suggestedShots = ''
    for await (const chunk of shotsStream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        suggestedShots += content
        sendEvent('shots_chunk', {
          content,
        })
      }
    }

    sendEvent('shots_complete', {
      suggestedShots,
      message: '🎬 Shot list ready!',
    })

    return {
      finalPrompt,
      suggestedShots,
      agentResponses: round1Results,
    }
  } catch (error: any) {
    sendEvent('synthesis_error', {
      error: error.message || 'Synthesis failed',
    })
    throw error
  }
}
