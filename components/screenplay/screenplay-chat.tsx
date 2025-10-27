'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Film, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface EpisodeConcept {
  episode_number: number
  season_number: number
  title: string
  logline: string
  plot_summary: string
  character_focus: string[]
  season_title?: string
  season_arc?: string
}

interface ScreenplayChatProps {
  open: boolean
  onClose: () => void
  seriesId: string
  seriesName: string
  targetType: 'series' | 'episode' | 'scene' | 'character'
  targetId?: string
  initialConcept?: EpisodeConcept
}

export function ScreenplayChat({
  open,
  onClose,
  seriesId,
  seriesName,
  targetType,
  targetId,
  initialConcept,
}: ScreenplayChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Intelligent auto-scroll: only scroll if user is near bottom or not manually scrolling
  useEffect(() => {
    if (!scrollRef.current) return

    const scrollContainer = scrollRef.current
    const isNearBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100

    // Auto-scroll if user is near bottom OR not currently scrolling
    if (isNearBottom || !isUserScrolling) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [messages, isUserScrolling])

  // Detect user scrolling
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      // User is scrolling
      setIsUserScrolling(true)

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Check if user scrolled to bottom
      const isAtBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 10

      if (isAtBottom) {
        // User scrolled to bottom, resume auto-scroll
        setIsUserScrolling(false)
      } else {
        // Set timeout to resume auto-scroll after user stops scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          const currentlyAtBottom =
            scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 10
          if (currentlyAtBottom) {
            setIsUserScrolling(false)
          }
        }, 1000)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const startSession = useCallback(async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/screenplay/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId,
          targetType,
          targetId,
          initialConcept,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session')
      }

      setSessionId(data.sessionId)
      setEpisodeId(data.episodeId || null)
      setMessages([
        {
          role: 'assistant',
          content: data.initialMessage,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (error: any) {
      console.error('Failed to start session:', error)
      alert('Failed to start screenplay session')
    } finally {
      setIsLoading(false)
    }
  }, [seriesId, targetType, targetId, initialConcept])

  // Start session when dialog opens, reset when closed
  useEffect(() => {
    if (open && !sessionId) {
      startSession()
    } else if (!open) {
      // Reset state when dialog closes
      setMessages([])
      setSessionId(null)
      setEpisodeId(null)
      setInput('')
      setIsUserScrolling(false)
      setLastSaved(null)
    }
  }, [open, sessionId, startSession])

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return

    // Save input before clearing it
    const messageContent = input.trim()

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/screenplay/session/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: messageContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                break
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantMessage += parsed.content
                  // Update message in real-time
                  setMessages((prev) => {
                    const last = prev[prev.length - 1]
                    if (last && last.role === 'assistant') {
                      return [
                        ...prev.slice(0, -1),
                        { ...last, content: assistantMessage },
                      ]
                    } else {
                      return [
                        ...prev,
                        {
                          role: 'assistant',
                          content: assistantMessage,
                          timestamp: new Date().toISOString(),
                        },
                      ]
                    }
                  })
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const saveProgress = async () => {
    if (!episodeId || isSaving) return

    setIsSaving(true)
    try {
      // Compile screenplay text from messages
      const screenplayText = messages
        .filter((m) => m.role === 'assistant')
        .map((m) => m.content)
        .join('\n\n')

      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenplay_text: screenplayText,
          status: 'in-progress',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save progress')
      }

      setLastSaved(new Date())
    } catch (error: any) {
      console.error('Failed to save progress:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Screenplay Writer
              </DialogTitle>
              <DialogDescription>
                {seriesName} - Professional screenplay structure
              </DialogDescription>
            </div>
            {episodeId && (
              <div className="flex items-center gap-2">
                {lastSaved && (
                  <span className="text-xs text-muted-foreground">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  onClick={saveProgress}
                  disabled={isSaving || !messages.length}
                  variant="outline"
                  size="sm"
                >
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3',
                    message.role === 'user'
                      ? 'bg-scenra-amber text-white'
                      : 'bg-scenra-dark-panel border border-scenra-blue/20 text-scenra-light'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="text-xs font-semibold mb-1 text-scenra-amber">
                      Screenplay Agent
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-scenra-dark-panel border border-scenra-blue/20 rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-scenra-blue" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <div className="text-xs text-scenra-gray text-center">
          The screenplay agent will guide you through professional story structure
        </div>
      </DialogContent>
    </Dialog>
  )
}
