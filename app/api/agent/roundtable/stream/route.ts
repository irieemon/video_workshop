import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamAgentRoundtable } from '@/lib/ai/agent-orchestrator-stream'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        encoder.encode(
          JSON.stringify({ type: 'error', data: { message: 'Unauthorized' } }) + '\n'
        ),
        {
          status: 401,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    const body = await request.json()
    const { brief, platform, seriesId, selectedCharacters, selectedSettings, episodeData } = body

    // Validate required fields
    if (!brief || !platform) {
      return new Response(
        encoder.encode(
          JSON.stringify({
            type: 'error',
            data: { message: 'Missing required fields: brief, platform' },
          }) + '\n'
        ),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    // Fetch series context if applicable (same as non-streaming endpoint)
    let visualTemplate = null
    let seriesCharacters = null
    let seriesSettings = null
    let visualAssets = null
    let characterRelationships = null
    let seriesSoraSettings = null
    let characterContext = ''
    let screenplayContext = ''

    if (seriesId) {
      const { data: series } = await supabase
        .from('series')
        .select(
          'visual_template, sora_camera_style, sora_lighting_mood, sora_color_palette, sora_overall_tone, sora_narrative_prefix'
        )
        .eq('id', seriesId)
        .single()

      visualTemplate = series?.visual_template

      if (series) {
        seriesSoraSettings = {
          sora_camera_style: series.sora_camera_style,
          sora_lighting_mood: series.sora_lighting_mood,
          sora_color_palette: series.sora_color_palette,
          sora_overall_tone: series.sora_overall_tone,
          sora_narrative_prefix: series.sora_narrative_prefix,
        }
      }

      // Fetch selected characters
      if (selectedCharacters && selectedCharacters.length > 0) {
        const { data: characters } = await supabase
          .from('series_characters')
          .select('*')
          .in('id', selectedCharacters)
        seriesCharacters = characters

        if (characters && characters.length > 0) {
          const characterBlocks = characters.map(
            char => char.sora_prompt_template || generateCharacterPromptBlock(char)
          )
          characterContext = `\n\nCHARACTERS IN THIS VIDEO:\n${characterBlocks.join('\n\n')}\n\nIMPORTANT: The character descriptions above are LOCKED. Use them exactly as provided for consistency across videos.\n\n`
        }

        // Fetch character relationships
        const { data: relationships } = await supabase
          .from('character_relationships')
          .select(`
            *,
            character_a:series_characters!character_relationships_character_a_id_fkey(id, name),
            character_b:series_characters!character_relationships_character_b_id_fkey(id, name)
          `)
          .eq('series_id', seriesId)
          .or(
            `character_a_id.in.(${selectedCharacters.join(',')}),character_b_id.in.(${selectedCharacters.join(',')})`
          )
        characterRelationships = relationships
      }

      // Fetch selected settings
      if (selectedSettings && selectedSettings.length > 0) {
        const { data: settings } = await supabase
          .from('series_settings')
          .select('*')
          .in('id', selectedSettings)
        seriesSettings = settings
      }

      // Fetch visual assets
      const { data: assets } = await supabase
        .from('series_visual_assets')
        .select('*')
        .eq('series_id', seriesId)
        .order('display_order', { ascending: true })
      visualAssets = assets
    }

    // Process episode screenplay context if available
    if (episodeData && episodeData.episode) {
      const { episode, series } = episodeData
      const parts: string[] = []

      parts.push(`\n\nEPISODE SCREENPLAY CONTEXT:`)
      parts.push(`\nSeries: "${series.name}" - Season ${episode.season_number}, Episode ${episode.episode_number}: "${episode.title}"`)

      if (episode.logline) {
        parts.push(`\nLogline: ${episode.logline}`)
      }

      if (episode.synopsis && episode.synopsis !== episode.logline) {
        parts.push(`\nSynopsis: ${episode.synopsis}`)
      }

      // Include structured screenplay data if available
      if (episode.structured_screenplay?.scenes && episode.structured_screenplay.scenes.length > 0) {
        parts.push(`\n\nSTRUCTURED SCREENPLAY (${episode.structured_screenplay.scenes.length} scenes):`)

        // Include first few scenes as examples
        const scenesToInclude = episode.structured_screenplay.scenes.slice(0, 3)
        scenesToInclude.forEach((scene: any, idx: number) => {
          parts.push(`\n\nScene ${scene.scene_number}: ${scene.location} - ${scene.time_of_day} ${scene.time_period}`)
          parts.push(`Description: ${scene.description}`)

          if (scene.characters && scene.characters.length > 0) {
            parts.push(`Characters: ${scene.characters.join(', ')}`)
          }

          if (scene.dialogue && scene.dialogue.length > 0) {
            parts.push(`Dialogue:`)
            scene.dialogue.forEach((d: any) => {
              const lines = Array.isArray(d.lines) ? d.lines.join(' ') : d.lines
              parts.push(`  - ${d.character}: "${lines}"`)
            })
          }

          if (scene.action && scene.action.length > 0) {
            parts.push(`Actions: ${scene.action.join('; ')}`)
          }
        })

        if (episode.structured_screenplay.scenes.length > 3) {
          parts.push(`\n... and ${episode.structured_screenplay.scenes.length - 3} more scenes`)
        }
      } else if (episode.screenplay_text) {
        // Include unstructured screenplay text (truncated if too long)
        const maxLength = 1000
        const truncated = episode.screenplay_text.length > maxLength
        parts.push(`\n\nSCREENPLAY TEXT:`)
        parts.push(truncated ? episode.screenplay_text.substring(0, maxLength) + '...' : episode.screenplay_text)
      }

      parts.push(`\n\nIMPORTANT: This video is based on the above screenplay. Use the scene descriptions, dialogue, actions, and character interactions to inform your creative decisions.\n`)

      screenplayContext = parts.join('')
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        // Track conversation history for review feature
        const conversationHistory: any[] = []
        const debateMessages: any[] = []
        let controllerClosed = false

        const sendEvent = (type: string, data: any) => {
          // Prevent sending events after controller is closed
          if (controllerClosed) {
            console.warn('Attempted to send event after controller closed:', type)
            return
          }

          try {
            const message = JSON.stringify({ type, data, timestamp: Date.now() }) + '\n'
            controller.enqueue(encoder.encode(message))

            // Track conversation data as it streams
            if (type === 'message_complete') {
              conversationHistory.push({
                agentKey: data.agent, // CRITICAL: Include agentKey for proper UI rendering
                agentName: data.name,
                agentColor: data.agent === 'director' ? 'blue' :
                            data.agent === 'cinematographer' ? 'purple' :
                            data.agent === 'editor' ? 'green' :
                            data.agent === 'colorist' ? 'orange' : 'pink',
                content: data.conversationalResponse || '',
                isComplete: true,
              })
            } else if (type === 'debate_message') {
              debateMessages.push({
                from: data.from,
                fromName: data.fromName,
                message: data.message,
              })
            }
          } catch (error) {
            console.error('Error sending event:', error)
            controllerClosed = true
          }
        }

        try {
          // Start the streaming roundtable
          const result = await streamAgentRoundtable(
            {
              brief,
              platform,
              visualTemplate: visualTemplate || undefined,
              seriesCharacters: seriesCharacters || undefined,
              seriesSettings: seriesSettings || undefined,
              visualAssets: visualAssets || undefined,
              characterRelationships: characterRelationships || undefined,
              seriesSoraSettings: seriesSoraSettings || undefined,
              characterContext: characterContext || undefined,
              screenplayContext: screenplayContext || undefined,
              userId: user.id,
            },
            sendEvent
          )

          // Send completion event with actual data INCLUDING conversation history
          sendEvent('complete', {
            message: 'Roundtable completed successfully',
            finalPrompt: result.finalPrompt,
            suggestedShots: result.suggestedShots,
            conversationHistory,
            debateMessages,
          })
        } catch (error: any) {
          console.error('Streaming roundtable error:', error)
          sendEvent('error', { message: error.message || 'An error occurred' })
        } finally {
          // Only close if not already closed
          if (!controllerClosed) {
            try {
              controller.close()
              controllerClosed = true
            } catch (error) {
              console.error('Error closing controller:', error)
            }
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error: any) {
    console.error('Stream initialization error:', error)
    return new Response(
      encoder.encode(
        JSON.stringify({ type: 'error', data: { message: 'Failed to initialize stream' } }) + '\n'
      ),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    )
  }
}
