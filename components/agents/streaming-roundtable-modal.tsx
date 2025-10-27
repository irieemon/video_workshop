'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Agent {
  key: string
  name: string
  role: string
  color: string
  status: 'waiting' | 'analyzing' | 'complete'
  response: string
  isStreaming: boolean
}

interface DebateMessage {
  from: string
  fromName: string
  message: string
}

interface StreamEvent {
  type: string
  data: any
  timestamp: number
}

interface StreamingRoundtableModalProps {
  brief: string
  platform: string
  seriesId?: string
  projectId: string
  selectedCharacters?: string[]
  selectedSettings?: string[]
  episodeData?: any  // Episode data including screenplay context
  onComplete: (result: {
    finalPrompt: string
    suggestedShots: string
    conversationHistory?: AgentMessage[]
    debateMessages?: DebateMessage[]
  }) => void
  onClose: () => void
  isComplete?: boolean
  reviewMode?: boolean
  savedConversation?: {
    conversationHistory: AgentMessage[]
    debateMessages: DebateMessage[]
  }
}

const AGENTS: Agent[] = [
  {
    key: 'director',
    name: 'Director',
    role: 'Creative Director',
    color: 'blue',
    status: 'waiting',
    response: '',
    isStreaming: false,
  },
  {
    key: 'cinematographer',
    name: 'Cinematographer',
    role: 'Director of Photography',
    color: 'purple',
    status: 'waiting',
    response: '',
    isStreaming: false,
  },
  {
    key: 'editor',
    name: 'Editor',
    role: 'Video Editor',
    color: 'green',
    status: 'waiting',
    response: '',
    isStreaming: false,
  },
  {
    key: 'colorist',
    name: 'Colorist',
    role: 'Color Grading Specialist',
    color: 'orange',
    status: 'waiting',
    response: '',
    isStreaming: false,
  },
  {
    key: 'platform_expert',
    name: 'Platform Expert',
    role: 'Platform Specialist',
    color: 'pink',
    status: 'waiting',
    response: '',
    isStreaming: false,
  },
]

const COLOR_CLASSES = {
  blue: 'border-blue-500',
  purple: 'border-purple-500',
  green: 'border-green-500',
  orange: 'border-orange-500',
  pink: 'border-pink-500',
}

const PULSE_CLASSES = {
  blue: 'shadow-lg shadow-blue-500/50',
  purple: 'shadow-lg shadow-purple-500/50',
  green: 'shadow-lg shadow-green-500/50',
  orange: 'shadow-lg shadow-orange-500/50',
  pink: 'shadow-lg shadow-pink-500/50',
}

interface AgentMessage {
  agentKey: string
  agentName: string
  agentColor: string
  content: string
  isComplete: boolean
}

export function StreamingRoundtableModal({
  brief,
  platform,
  seriesId,
  projectId,
  selectedCharacters,
  selectedSettings,
  episodeData,
  onComplete,
  onClose,
  isComplete = false,
  reviewMode = false,
  savedConversation,
}: StreamingRoundtableModalProps) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS)
  const [activeAgentKey, setActiveAgentKey] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState('initialization')
  const [stageText, setStageText] = useState('Initializing creative session...')
  const [progress, setProgress] = useState(0)
  const [totalAgents, setTotalAgents] = useState(5)
  const [completedAgents, setCompletedAgents] = useState(0)
  const [conversationHistory, setConversationHistory] = useState<AgentMessage[]>([])
  const [debateMessages, setDebateMessages] = useState<DebateMessage[]>([])
  const [synthesisText, setSynthesisText] = useState('')
  const [shotsText, setShotsText] = useState('')
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [isGeneratingShots, setIsGeneratingShots] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [typingAgent, setTypingAgent] = useState<string | null>(null)

  const eventSourceRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const eventQueueRef = useRef<StreamEvent[]>([])
  const processingRef = useRef(false)
  const decoder = new TextDecoder()
  const lastAgentCompleteRef = useRef<number>(0)

  useEffect(() => {
    // If in review mode, load saved conversation
    if (reviewMode && savedConversation) {
      console.log('🔍 Review Mode - Loading saved conversation:', {
        conversationHistory: savedConversation.conversationHistory,
        debateMessages: savedConversation.debateMessages,
        historyLength: savedConversation.conversationHistory?.length,
        debateLength: savedConversation.debateMessages?.length,
      })
      setConversationHistory(savedConversation.conversationHistory)
      setDebateMessages(savedConversation.debateMessages)
      setStageText('Review: Creative Session')
      setProgress(100)
      setCompletedAgents(totalAgents)
      setSessionComplete(true)
    } else {
      // Start new streaming session
      startStreaming()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.cancel()
      }
    }
  }, [])

  // Track if user is manually scrolling
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false)

  // Detect user scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = contentRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

      if (!isAtBottom) {
        setIsUserScrolling(true)
      } else {
        setIsUserScrolling(false)
        setShowNewMessageBadge(false)
      }
    }

    const scrollElement = contentRef.current
    scrollElement?.addEventListener('scroll', handleScroll)

    return () => scrollElement?.removeEventListener('scroll', handleScroll)
  }, [])

  // Smart auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (!isUserScrolling && contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: 'smooth',
      })
    } else if (isUserScrolling) {
      // Show badge when new messages arrive while scrolled up
      setShowNewMessageBadge(true)
    }
  }, [conversationHistory, debateMessages, synthesisText, shotsText, isUserScrolling])

  async function startStreaming() {
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
          episodeData,  // Include screenplay context
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

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const event: StreamEvent = JSON.parse(line)

            // Natural pacing for message chunks
            if (event.type === 'message_chunk') {
              // 800ms pause between sentences
              await new Promise(resolve => setTimeout(resolve, 800))
            }

            // Typing indicator pause
            if (event.type === 'typing_start') {
              // 1.5s typing indicator before message starts
              await new Promise(resolve => setTimeout(resolve, 1500))
            }

            // Pause between agents
            if (event.type === 'message_complete') {
              lastAgentCompleteRef.current = Date.now()
              // 800ms pause before next agent
              await new Promise(resolve => setTimeout(resolve, 800))
            }

            handleEvent(event)
          } catch (e) {
            console.error('Failed to parse event:', line, e)
          }
        }
      }
    } catch (err: any) {
      console.error('Streaming error:', err)
    }
  }

  function handleEvent(event: StreamEvent) {
    const { type, data } = event

    switch (type) {
      case 'status':
        setStageText(data.message)
        setCurrentStage(data.stage)
        break

      case 'typing_start':
        // Show typing indicator
        setTypingAgent(data.agent)
        setActiveAgentKey(data.agent)
        setAgents(prev =>
          prev.map(agent =>
            agent.key === data.agent
              ? { ...agent, status: 'analyzing', isStreaming: false }
              : agent
          )
        )
        break

      case 'message_chunk':
        // Clear typing indicator and add sentence to conversation
        if (typingAgent === data.agent) {
          setTypingAgent(null)
        }

        setConversationHistory(prev => {
          const lastMsg = prev[prev.length - 1]

          // If this is the first chunk for this agent, create new message
          if (!lastMsg || lastMsg.agentKey !== data.agent || lastMsg.isComplete) {
            const agentInfo = AGENTS.find(a => a.key === data.agent)
            return [
              ...prev,
              {
                agentKey: data.agent,
                agentName: agentInfo?.name || '',
                agentColor: agentInfo?.color || 'blue',
                content: data.content,
                isComplete: false,
              },
            ]
          }

          // Otherwise, append to existing message
          return prev.map((msg, idx) =>
            idx === prev.length - 1 && msg.agentKey === data.agent
              ? { ...msg, content: msg.content + ' ' + data.content }
              : msg
          )
        })
        break

      case 'typing_stop':
        // Clear typing indicator when agent finishes
        if (typingAgent === data.agent) {
          setTypingAgent(null)
        }
        break

      case 'message_complete':
        // Mark agent as complete
        setAgents(prev =>
          prev.map(agent =>
            agent.key === data.agent
              ? { ...agent, status: 'complete', isStreaming: false }
              : agent
          )
        )
        setCompletedAgents(prev => {
          const newCount = prev + 1
          // Round 1: 5 agents = 0-60%, Round 2: debate = 60-80%, Synthesis = 80-90%, Shots = 90-100%
          let progressPercent = 0
          if (newCount <= 5) {
            // Round 1: Each agent = 12% (5 * 12% = 60%)
            progressPercent = (newCount / 5) * 60
          } else {
            // After Round 1, keep at 60% until synthesis
            progressPercent = 60
          }
          setProgress(progressPercent)
          return newCount
        })

        // Mark conversation message as complete
        setConversationHistory(prev =>
          prev.map(msg =>
            msg.agentKey === data.agent && !msg.isComplete
              ? { ...msg, isComplete: true }
              : msg
          )
        )
        break

      // Legacy events for backwards compatibility
      case 'agent_start':
      case 'agent_chunk':
      case 'agent_complete':
        // These are handled by new events above
        break

      case 'debate_start':
        setDebateMessages([])
        setStageText('Round 2: Collaborative Refinement')
        setProgress(60) // Round 1 complete, starting Round 2
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
          return [
            ...prev,
            {
              from: data.from,
              fromName: data.fromName,
              message: data.content,
            },
          ]
        })
        break

      case 'debate_message':
        // Final message already added via chunks
        break

      case 'debate_complete':
        // Keep debate messages visible, clear typing, update status
        setTypingAgent(null)
        setStageText('Synthesizing team insights...')
        setProgress(80) // Round 2 complete, starting synthesis
        break

      case 'synthesis_start':
        setIsSynthesizing(true)
        setTypingAgent(null)
        setStageText('Synthesizing team insights...')
        setSynthesisText('')
        setProgress(80)
        break

      case 'synthesis_chunk':
        setSynthesisText(prev => prev + data.content)
        break

      case 'synthesis_complete':
        setSynthesisText(data.finalPrompt)
        setIsSynthesizing(false)
        setProgress(90) // Synthesis complete, starting shots
        break

      case 'shots_start':
        setIsGeneratingShots(true)
        setStageText('Generating shot list...')
        setShotsText('')
        setProgress(90)
        break

      case 'shots_chunk':
        setShotsText(prev => prev + data.content)
        break

      case 'shots_complete':
        setShotsText(data.suggestedShots)
        setIsGeneratingShots(false)
        break

      case 'complete':
        setTypingAgent(null)
        setIsSynthesizing(false)
        setIsGeneratingShots(false)
        setSessionComplete(true)
        setStageText('✅ Creative session complete! Review the conversation below.')
        setProgress(100)
        // Don't auto-close - let user review conversation
        // Pass results to parent using event data (includes conversation history from backend)
        onComplete({
          finalPrompt: data.finalPrompt || synthesisText,
          suggestedShots: data.suggestedShots || shotsText,
          conversationHistory: data.conversationHistory || conversationHistory,
          debateMessages: data.debateMessages || debateMessages,
        })
        break
    }
  }

  const activeAgent = agents.find(a => a.key === activeAgentKey)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[90vw] h-[85vh] max-w-6xl bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">AI Creative Session</h2>
          <div className="flex items-center gap-2">
            {isComplete && (
              <Button variant="default" size="sm" onClick={onClose}>
                Done Reviewing
              </Button>
            )}
            {!isComplete && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{stageText}</span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-scenra-amber h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content Area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6 relative">
          {/* New Messages Badge */}
          {showNewMessageBadge && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <button
                onClick={() => {
                  contentRef.current?.scrollTo({
                    top: contentRef.current.scrollHeight,
                    behavior: 'smooth',
                  })
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                New messages ↓
              </button>
            </div>
          )}
          {/* Full Conversation View - Always visible */}
          <div className="space-y-6">
            {/* Round 1: Initial Analysis */}
            {conversationHistory.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Round 1: Initial Analysis
                </div>
                {conversationHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`bg-white border-2 rounded-lg p-6 transition-all duration-500 ${
                      COLOR_CLASSES[msg.agentColor as keyof typeof COLOR_CLASSES]
                    } ${
                      !msg.isComplete
                        ? PULSE_CLASSES[msg.agentColor as keyof typeof PULSE_CLASSES]
                        : ''
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {msg.agentName}
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Round 2: Collaborative Refinement */}
            {debateMessages.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Round 2: Collaborative Refinement
                </div>
                {debateMessages.map((msg, idx) => (
                  <div key={idx} className="bg-white border-2 border-purple-500 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{msg.fromName}</h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Typing Indicator */}
            {typingAgent && (
              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="text-sm italic">
                    {AGENTS.find(a => a.key === typingAgent)?.name} is typing
                  </span>
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            {/* Processing Status - Show as inline message, don't hide conversation */}
            {(isSynthesizing || isGeneratingShots) && !sessionComplete && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">
                    {isSynthesizing && 'Synthesizing insights into final prompt...'}
                    {isGeneratingShots && 'Generating suggested shot list...'}
                  </span>
                </div>
              </div>
            )}

            {/* Completion Message */}
            {sessionComplete && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✅</span>
                  <div>
                    <p className="text-lg font-semibold text-green-900">Session Complete!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Your optimized prompt and shot list are ready. Close this modal to view and edit the results.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent Pills - Always visible */}
        <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex gap-2 flex-wrap">
              {agents.map(agent => (
                <div
                  key={agent.key}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    agent.key === activeAgentKey
                      ? `bg-${agent.color}-100 text-${agent.color}-700 border-2 ${COLOR_CLASSES[agent.color as keyof typeof COLOR_CLASSES]}`
                      : agent.status === 'complete'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-white text-gray-500 border border-gray-300'
                  }`}
                >
                  {agent.name}
                  {agent.status === 'complete' && (
                    <span className="ml-2 text-xs">✓</span>
                  )}
                  {agent.status === 'analyzing' && agent.key !== activeAgentKey && (
                    <span className="ml-2 text-xs">...</span>
                  )}
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  )
}
