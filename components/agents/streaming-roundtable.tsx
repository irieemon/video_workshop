'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface Agent {
  key: string
  name: string
  role: string
  emoji: string
  expertise: string
  status: 'waiting' | 'thinking' | 'analyzing' | 'complete'
  response: string
  isStreaming: boolean
}

interface StreamEvent {
  type: string
  data: any
  timestamp: number
}

interface StreamingRoundtableProps {
  brief: string
  platform: string
  seriesId?: string
  projectId: string
  selectedCharacters?: string[]
  selectedSettings?: string[]
  onComplete: (result: { finalPrompt: string; suggestedShots: string }) => void
}

export function StreamingRoundtable({
  brief,
  platform,
  seriesId,
  projectId,
  selectedCharacters,
  selectedSettings,
  onComplete,
}: StreamingRoundtableProps) {
  const [agents, setAgents] = useState<Agent[]>([
    {
      key: 'director',
      name: 'Director',
      role: 'Creative Director',
      emoji: '🎬',
      expertise: 'Creative vision and storytelling',
      status: 'waiting',
      response: '',
      isStreaming: false,
    },
    {
      key: 'cinematographer',
      name: 'Cinematographer',
      role: 'Director of Photography',
      emoji: '📹',
      expertise: 'Visual composition and camera work',
      status: 'waiting',
      response: '',
      isStreaming: false,
    },
    {
      key: 'editor',
      name: 'Editor',
      role: 'Video Editor',
      emoji: '✂️',
      expertise: 'Pacing and flow',
      status: 'waiting',
      response: '',
      isStreaming: false,
    },
    {
      key: 'colorist',
      name: 'Colorist',
      role: 'Color Grading Specialist',
      emoji: '🎨',
      expertise: 'Color and mood',
      status: 'waiting',
      response: '',
      isStreaming: false,
    },
    {
      key: 'platform_expert',
      name: 'Platform Expert',
      role: 'Platform Specialist',
      emoji: '📱',
      expertise: 'Platform optimization',
      status: 'waiting',
      response: '',
      isStreaming: false,
    },
  ])

  const [statusMessage, setStatusMessage] = useState('Initializing creative team...')
  const [currentStage, setCurrentStage] = useState('initialization')
  const [stageText, setStageText] = useState('Initializing...')
  const [activeAgentKey, setActiveAgentKey] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [completedAgents, setCompletedAgents] = useState(0)
  const [progress, setProgress] = useState(0)
  const totalAgents = 5
  const [debateMessages, setDebateMessages] = useState<
    Array<{ from: string; fromName: string; fromEmoji: string; message: string }>
  >([])
  const [synthesisText, setSynthesisText] = useState('')
  const [shotsText, setShotsText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const decoderRef = useRef(new TextDecoder())

  const handleEvent = useCallback((event: StreamEvent) => {
    const { type, data } = event

    switch (type) {
      case 'status':
        setStageText(data.stage)
        break

      case 'agent_start':
        setActiveAgentKey(data.agent)
        setAgents(prev =>
          prev.map(agent =>
            agent.key === data.agent
              ? { ...agent, status: 'analyzing', isStreaming: true }
              : agent
          )
        )
        break

      case 'agent_chunk':
        setConversationHistory(prev => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.agent === data.agent) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, message: lastMsg.message + data.content },
            ]
          } else {
            return [
              ...prev,
              {
                agent: data.agent,
                name: agents.find(a => a.key === data.agent)?.name || '',
                message: data.content,
                icon: agents.find(a => a.key === data.agent)?.emoji || '🎬',
              },
            ]
          }
        })
        break

      case 'agent_complete':
        setAgents(prev =>
          prev.map(agent =>
            agent.key === data.agent
              ? { ...agent, status: 'complete', isStreaming: false }
              : agent
          )
        )
        setCompletedAgents(prev => prev + 1)
        setProgress(Math.min((completedAgents + 1) / totalAgents, 0.9) * 100)
        break

      case 'debate_start':
        setDebateMessages([])
        setStageText('Round 2: Debate')
        break

      case 'debate_chunk':
        setDebateMessages(prev => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.from === data.from) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, message: lastMsg.message + data.content },
            ]
          }
          const agent = agents.find(a => a.key === data.from)
          return [
            ...prev,
            {
              from: data.from,
              fromName: data.fromName,
              fromEmoji: agent?.emoji || '🎬',
              message: data.content
            },
          ]
        })
        break

      case 'debate_message':
        setDebateMessages(prev => {
          const lastMsg = prev[prev.length - 1]
          const agent = agents.find(a => a.key === data.from)
          if (lastMsg && lastMsg.from === data.from) {
            return [
              ...prev.slice(0, -1),
              {
                from: data.from,
                fromName: data.fromName,
                fromEmoji: agent?.emoji || '🎬',
                message: data.message
              },
            ]
          }
          return [
            ...prev,
            {
              from: data.from,
              fromName: data.fromName,
              fromEmoji: agent?.emoji || '🎬',
              message: data.message
            },
          ]
        })
        break

      case 'synthesis_start':
        setStageText('Synthesizing...')
        setProgress(90)
        break

      case 'synthesis_chunk':
        setSynthesisText(prev => prev + data.content)
        break

      case 'synthesis_complete':
        setSynthesisText(data.finalPrompt)
        break

      case 'shots_start':
        setStageText('Generating shot list...')
        break

      case 'shots_chunk':
        setShotsText(prev => prev + data.content)
        break

      case 'shots_complete':
        setShotsText(data.suggestedShots)
        break

      case 'complete':
        setIsComplete(true)
        setProgress(100)
        setStageText('Complete!')
        onComplete({
          finalPrompt: synthesisText,
          suggestedShots: shotsText,
        })
        break

      case 'error':
        setError(data.message)
        break
    }
  }, [synthesisText, shotsText, onComplete, agents, completedAgents, totalAgents])

  const startStreaming = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/roundtable/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brief,
          platform,
          seriesId,
          projectId,
          selectedCharacters,
          selectedSettings,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start streaming')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      eventSourceRef.current = reader

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoderRef.current.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const event: StreamEvent = JSON.parse(line)
            handleEvent(event)
          } catch (e) {
            console.error('Failed to parse event:', line, e)
          }
        }
      }
    } catch (err: any) {
      console.error('Streaming error:', err)
      setError(err.message || 'An error occurred')
    }
  }, [brief, platform, seriesId, projectId, selectedCharacters, selectedSettings, handleEvent])

  useEffect(() => {
    startStreaming()

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.cancel()
      }
    }
  }, [startStreaming])

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {!isComplete && !error && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
            {isComplete && <span className="text-2xl">✅</span>}
            {error && <span className="text-2xl">❌</span>}
            <div>
              <p className="font-medium text-blue-900">{statusMessage}</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <Card
            key={agent.key}
            className={`transition-all ${
              agent.status === 'thinking'
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : agent.status === 'complete'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{agent.emoji}</span>
                  <div>
                    <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    agent.status === 'thinking'
                      ? 'default'
                      : agent.status === 'complete'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {agent.status === 'thinking' && '🔄 Analyzing...'}
                  {agent.status === 'complete' && '✅ Done'}
                  {agent.status === 'waiting' && '⏳ Waiting'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">{agent.expertise}</p>
              {agent.response && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {agent.response}
                  {agent.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Debate Section */}
      {debateMessages.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🎭</span>
              <span>Creative Debate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {debateMessages.map((msg, idx) => (
              <div key={idx} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span>{msg.fromEmoji}</span>
                  <span className="font-semibold text-sm">{msg.fromName}</span>
                </div>
                <p className="text-sm text-gray-700">{msg.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Synthesis Section */}
      {synthesisText && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📝</span>
              <span>Final Optimized Prompt</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {synthesisText}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shots Section */}
      {shotsText && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🎬</span>
              <span>Suggested Shot List</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {shotsText}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
