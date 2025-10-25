import OpenAI from 'openai'
import type { StructuredScreenplay, Scene } from '@/lib/types/database.types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ScreenplayToPromptOptions {
  screenplay_text: string
  structured_screenplay?: StructuredScreenplay | null
  scene_id?: string // Convert specific scene only
  series_context?: {
    name: string
    visual_template?: any
    characters?: any[]
    settings?: any[]
  }
}

export interface SoraPrompt {
  prompt: string
  scene_description: string
  technical_details: {
    shot_type?: string
    camera_movement?: string
    lighting?: string
    mood?: string
    duration_estimate?: number
  }
  visual_elements: string[]
  characters_involved: string[]
}

/**
 * Convert screenplay text or structured screenplay to Sora-optimized video prompt
 */
export async function convertScreenplayToPrompt(
  options: ScreenplayToPromptOptions
): Promise<SoraPrompt> {
  const {
    screenplay_text,
    structured_screenplay,
    scene_id,
    series_context,
  } = options

  // Extract specific scene if scene_id provided
  let targetScene: Scene | null = null
  if (scene_id && structured_screenplay?.scenes) {
    targetScene = structured_screenplay.scenes.find(
      (s) => s.scene_id === scene_id
    ) || null
  }

  // Build context for AI
  const contextParts: string[] = []

  if (series_context) {
    contextParts.push(`Series: ${series_context.name}`)

    if (series_context.visual_template) {
      contextParts.push(
        `Visual Style: ${JSON.stringify(series_context.visual_template, null, 2)}`
      )
    }

    if (series_context.characters && series_context.characters.length > 0) {
      const charDescriptions = series_context.characters
        .map((c: any) => `- ${c.name}: ${c.description || 'No description'}`)
        .join('\n')
      contextParts.push(`Characters:\n${charDescriptions}`)
    }

    if (series_context.settings && series_context.settings.length > 0) {
      const settingDescriptions = series_context.settings
        .map((s: any) => `- ${s.name}: ${s.description || 'No description'}`)
        .join('\n')
      contextParts.push(`Settings:\n${settingDescriptions}`)
    }
  }

  const context = contextParts.length > 0 ? contextParts.join('\n\n') : ''

  // Build screenplay content for conversion
  let screenplayContent: string

  if (targetScene) {
    // Convert specific scene
    screenplayContent = formatSceneForConversion(targetScene)
  } else if (structured_screenplay?.scenes && structured_screenplay.scenes.length > 0) {
    // Convert first scene if structured screenplay available
    screenplayContent = formatSceneForConversion(structured_screenplay.scenes[0])
  } else {
    // Use raw screenplay text
    screenplayContent = screenplay_text.slice(0, 2000) // Limit to first 2000 chars
  }

  // Call OpenAI to convert to Sora prompt
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an expert at converting screenplay scenes into optimized video generation prompts for Sora, OpenAI's text-to-video model.

Your task is to analyze screenplay text and create detailed, visual prompts that Sora can use to generate high-quality video content.

Key principles for Sora prompts:
1. Be extremely detailed and descriptive about visual elements
2. Specify camera angles, movements, and shot types
3. Describe lighting, mood, and atmosphere
4. Include character details, actions, and emotions
5. Mention setting details, props, and environment
6. Specify temporal elements (time of day, season, weather)
7. Keep prompts focused on what can be SHOWN, not internal thoughts
8. Use cinematic language that describes visual storytelling

Return your response as JSON with this structure:
{
  "prompt": "The final Sora-optimized prompt (200-300 words)",
  "scene_description": "Brief description of what the scene shows",
  "technical_details": {
    "shot_type": "wide/medium/close-up/etc",
    "camera_movement": "static/pan/tilt/dolly/etc",
    "lighting": "natural/dramatic/soft/etc",
    "mood": "tense/peaceful/exciting/etc",
    "duration_estimate": "estimated seconds for scene"
  },
  "visual_elements": ["array", "of", "key", "visual", "elements"],
  "characters_involved": ["character", "names"]
}`,
      },
      {
        role: 'user',
        content: `${context ? `SERIES CONTEXT:\n${context}\n\n` : ''}SCREENPLAY SCENE TO CONVERT:\n\n${screenplayContent}`,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const result = completion.choices[0]?.message?.content
  if (!result) {
    throw new Error('No response from OpenAI')
  }

  const parsedResult: SoraPrompt = JSON.parse(result)
  return parsedResult
}

/**
 * Format a structured scene for conversion
 */
function formatSceneForConversion(scene: Scene): string {
  const parts: string[] = []

  // Scene heading
  parts.push(
    `${scene.time_of_day}. ${scene.location.toUpperCase()} - ${scene.time_period}`
  )

  // Description
  if (scene.description) {
    parts.push(scene.description)
  }

  // Characters present
  if (scene.characters && scene.characters.length > 0) {
    parts.push(`Characters: ${scene.characters.join(', ')}`)
  }

  // Action lines
  if (scene.action && scene.action.length > 0) {
    parts.push(scene.action.join('\n\n'))
  }

  // Dialogue
  if (scene.dialogue && scene.dialogue.length > 0) {
    const dialogueText = scene.dialogue
      .map((d) => {
        const lines = d.lines.join('\n')
        return `${d.character}\n${lines}`
      })
      .join('\n\n')
    parts.push(dialogueText)
  }

  return parts.join('\n\n')
}

/**
 * Convert entire episode screenplay to multiple Sora prompts (one per scene)
 */
export async function convertEpisodeToPrompts(
  options: ScreenplayToPromptOptions
): Promise<SoraPrompt[]> {
  const { structured_screenplay } = options

  if (!structured_screenplay?.scenes || structured_screenplay.scenes.length === 0) {
    // If no structured screenplay, convert as single prompt
    const singlePrompt = await convertScreenplayToPrompt(options)
    return [singlePrompt]
  }

  // Convert each scene to a prompt
  const prompts: SoraPrompt[] = []

  for (const scene of structured_screenplay.scenes) {
    const prompt = await convertScreenplayToPrompt({
      ...options,
      scene_id: scene.scene_id,
    })
    prompts.push(prompt)
  }

  return prompts
}
