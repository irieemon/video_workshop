import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { SCREENPLAY_AGENT_SYSTEM_PROMPT } from '@/lib/ai/screenplay-agent'
import { getModelForFeature } from '@/lib/ai/config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-JK5lVhiqePvkP3UHeLcABv0p',
})

interface MessageRequest {
  sessionId: string
  message: string
}

/**
 * POST /api/screenplay/session/message
 * Send message to screenplay agent and stream response
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: MessageRequest = await request.json()
    const { sessionId, message } = body

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('screenplay_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return new Response('Session not found', { status: 404 })
    }

    // Get series context
    const { data: series } = await supabase
      .from('series')
      .select('*, series_characters(*)')
      .eq('id', session.series_id)
      .single()

    // Build context for agent
    let contextMessage = ''

    if (series) {
      contextMessage += `\n\n## Current Series Context\n`
      contextMessage += `**Series**: ${series.name}\n`

      if (series.screenplay_data?.logline) {
        contextMessage += `**Logline**: ${series.screenplay_data.logline}\n`
      }

      if (series.series_characters && series.series_characters.length > 0) {
        contextMessage += `\n**Characters**:\n`
        series.series_characters.forEach((char: any) => {
          contextMessage += `- ${char.name}`
          if (char.dramatic_profile?.role_in_story) {
            contextMessage += ` (${char.dramatic_profile.role_in_story})`
          }
          contextMessage += `\n`
        })
      }

      contextMessage += `\n**Current Task**: ${session.target_type}\n`
      contextMessage += `**Current Step**: ${session.current_step}\n`
    }

    // Add user message to history
    const conversationHistory = [
      ...(session.conversation_history || []),
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]

    // Prepare messages for OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: SCREENPLAY_AGENT_SYSTEM_PROMPT + contextMessage,
      },
    ]

    // Add conversation history (last 10 messages to keep context manageable)
    const recentHistory = conversationHistory.slice(-10)
    recentHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })
    })

    // Stream response from OpenAI
    const stream = await openai.chat.completions.create({
      model: getModelForFeature('agent'),
      messages,
      temperature: 0.7,
      stream: true,
    })

    // Create readable stream for response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullResponse += content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }

          // Update session with full conversation
          const updatedHistory = [
            ...conversationHistory,
            {
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date().toISOString(),
            },
          ]

          await supabase
            .from('screenplay_sessions')
            .update({
              conversation_history: updatedHistory,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', sessionId)

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Screenplay message error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500 }
    )
  }
}
