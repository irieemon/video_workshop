'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConceptDialogueState, SeriesConceptOutput } from '@/lib/types/series-concept.types';
import { initializeDialogueState } from '@/lib/ai/series-concept-agent';

interface ConceptAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onConceptGenerated: (concept: SeriesConceptOutput) => void;
}

export function ConceptAgentDialog({ open, onClose, onConceptGenerated }: ConceptAgentDialogProps) {
  const [dialogueState, setDialogueState] = useState<ConceptDialogueState | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAgentMessage, setCurrentAgentMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize dialogue when dialog opens
  useEffect(() => {
    if (open && !dialogueState) {
      setDialogueState(initializeDialogueState());
    }
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogueState?.messages, currentAgentMessage]);

  const sendMessage = async () => {
    if (!userInput.trim() || isStreaming) return;

    setIsStreaming(true);
    setCurrentAgentMessage('');

    // Optimistic update: add user message
    const updatedState = {
      ...dialogueState!,
      messages: [
        ...(dialogueState?.messages || []),
        {
          role: 'user' as const,
          content: userInput,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    setDialogueState(updatedState);
    const messageToSend = userInput;
    setUserInput('');

    try {
      // Stream agent response
      const response = await fetch('/api/series/concept/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          dialogueState: updatedState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let agentMessageBuffer = '';
      let newPhase = dialogueState?.phase;
      let newExchangeCount = dialogueState?.exchangeCount || 0;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Finalize agent message
              setDialogueState((prev) => ({
                ...prev!,
                phase: newPhase!,
                exchangeCount: newExchangeCount,
                messages: [
                  ...prev!.messages,
                  {
                    role: 'assistant',
                    content: agentMessageBuffer,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }));
              setCurrentAgentMessage('');
              setIsStreaming(false);
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                agentMessageBuffer += parsed.content;
                setCurrentAgentMessage(agentMessageBuffer);
              }
              if (parsed.phase) {
                newPhase = parsed.phase;
              }
              if (parsed.exchangeCount) {
                newExchangeCount = parsed.exchangeCount;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
      setIsStreaming(false);
    }
  };

  const generateConcept = async () => {
    if (!dialogueState) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/series/concept/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialogueState }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Generation failed - Full response:', data);
        const errorMessage = data.error || 'Failed to generate concept';
        const details = data.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : '';
        throw new Error(`${errorMessage}${details}`);
      }

      // Pass concept to parent
      onConceptGenerated(data.concept);
    } catch (error: any) {
      console.error('Failed to generate concept:', error);
      alert(`Failed to generate concept: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canGenerate = dialogueState && (dialogueState.phase === 'refinement' || dialogueState.exchangeCount >= 5);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Series Concept Agent
          </DialogTitle>
          <DialogDescription>
            Let&apos;s create your series concept together
          </DialogDescription>
          {dialogueState && (
            <Badge variant="outline" className="w-fit">
              Phase: {dialogueState.phase}
            </Badge>
          )}
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4" ref={scrollRef}>
            {!dialogueState?.messages.length && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Welcome! I&apos;ll help you create a comprehensive series concept.</p>
                <p className="text-sm">
                  Tell me about your series idea - what genre, what&apos;s the core concept?
                </p>
              </div>
            )}

            {dialogueState?.messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="text-xs font-semibold mb-1 text-primary">
                      Series Concept Agent
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {currentAgentMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                  <div className="text-xs font-semibold mb-1 text-primary">
                    Series Concept Agent
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{currentAgentMessage}</div>
                </div>
              </div>
            )}

            {isStreaming && !currentAgentMessage && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-3 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-[80px] max-h-[120px] resize-none"
              disabled={isStreaming || isGenerating}
            />
            <div className="flex flex-col gap-2">
              <Button onClick={sendMessage} disabled={!userInput.trim() || isStreaming || isGenerating} size="sm">
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              {canGenerate && (
                <Button
                  onClick={generateConcept}
                  disabled={isStreaming || isGenerating}
                  variant="secondary"
                  size="sm"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* Helper text */}
          <div className="text-xs text-muted-foreground text-center">
            {canGenerate ? (
              <>Click the sparkle button to generate your complete series concept</>
            ) : (
              <>The agent will guide you through creating a professional series concept</>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
