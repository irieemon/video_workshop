import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { getModelForFeature } from '@/lib/ai/config';
import {
  initializeDialogueState,
  determinePhaseTransition,
  buildSystemPrompt,
} from '@/lib/ai/series-concept-agent';
import type { ConceptDialogueState } from '@/lib/types/series-concept.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DialogueRequest {
  message: string;
  dialogueState: ConceptDialogueState | null;
}

/**
 * POST /api/series/concept/dialogue
 * Stream interactive dialogue with Series Concept Agent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body: DialogueRequest = await request.json();
    const { message, dialogueState } = body;

    // Initialize or update dialogue state
    const currentState = dialogueState || initializeDialogueState();

    // Add user message
    currentState.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Determine phase transition
    const newPhase = determinePhaseTransition(currentState, message);
    currentState.phase = newPhase;
    currentState.exchangeCount++;

    // Build system prompt for current phase
    const systemPrompt = buildSystemPrompt(newPhase, currentState);

    // Build OpenAI messages
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history (last 10 messages to manage context)
    const recentHistory = currentState.messages.slice(-10);
    recentHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    });

    // Stream response from OpenAI
    const stream = await openai.chat.completions.create({
      model: getModelForFeature('agent'),
      messages,
      temperature: 0.7,
      stream: true,
    });

    // Create readable stream for response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    content,
                    phase: newPhase,
                  })}\n\n`
                )
              );
            }
          }

          // Send final state update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                phase: newPhase,
                exchangeCount: currentState.exchangeCount,
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Series concept dialogue error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500 }
    );
  }
}
