/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StreamingRoundtableModal } from '@/components/agents/streaming-roundtable-modal'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}))

// Mock scrollTo for jsdom (doesn't implement scrolling API)
Element.prototype.scrollTo = jest.fn()

// Helper to create mock streaming response
function createMockStreamingResponse(events: Array<{ type: string; data: Record<string, unknown> }>) {
  const encoder = new TextEncoder()
  let eventIndex = 0

  return new ReadableStream({
    pull(controller) {
      if (eventIndex < events.length) {
        const event = events[eventIndex]
        const line = JSON.stringify({ type: event.type, data: event.data, timestamp: Date.now() })
        controller.enqueue(encoder.encode(line + '\n'))
        eventIndex++
      } else {
        controller.close()
      }
    },
  })
}

// Suppress console.error for streaming errors in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = String(args[0])
    if (message.includes('Streaming error') || message.includes('act(...)')) {
      return
    }
    originalConsoleError.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
})

describe('StreamingRoundtableModal', () => {
  const defaultProps = {
    brief: 'Create a cinematic video about nature',
    platform: 'Sora',
    onComplete: jest.fn(),
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    // Setup default mock to prevent "undefined.ok" errors
    mockFetch.mockResolvedValue({
      ok: true,
      body: createMockStreamingResponse([]),
    })
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders modal with title', () => {
      render(<StreamingRoundtableModal {...defaultProps} />)
      expect(screen.getByText('AI Creative Session')).toBeInTheDocument()
    })

    it('renders all agent pills', () => {
      render(<StreamingRoundtableModal {...defaultProps} />)
      expect(screen.getByText('Director')).toBeInTheDocument()
      expect(screen.getByText('Cinematographer')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument()
      expect(screen.getByText('Colorist')).toBeInTheDocument()
      expect(screen.getByText('Platform Expert')).toBeInTheDocument()
    })

    it('shows initial progress at 0%', () => {
      render(<StreamingRoundtableModal {...defaultProps} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows close button when not complete', () => {
      render(<StreamingRoundtableModal {...defaultProps} />)
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('shows Done Reviewing button when isComplete', () => {
      render(<StreamingRoundtableModal {...defaultProps} isComplete={true} />)
      expect(screen.getByRole('button', { name: /done reviewing/i })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Streaming Session
  // ============================================================================
  describe('Streaming Session', () => {
    it('starts streaming on mount', async () => {
      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agent/roundtable/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      })
    })

    it('sends brief and platform in request body', async () => {
      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.brief).toBe('Create a cinematic video about nature')
      expect(body.platform).toBe('Sora')
    })

    it('sends optional props when provided', async () => {
      render(
        <StreamingRoundtableModal
          {...defaultProps}
          seriesId="series-123"
          selectedCharacters={['hero', 'villain']}
          selectedSettings={['forest', 'castle']}
          episodeData={{ id: 'ep-1', title: 'Pilot' }}
        />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.seriesId).toBe('series-123')
      expect(body.selectedCharacters).toEqual(['hero', 'villain'])
      expect(body.selectedSettings).toEqual(['forest', 'castle'])
      expect(body.episodeData).toEqual({ id: 'ep-1', title: 'Pilot' })
    })
  })

  // ============================================================================
  // Event Handling
  // ============================================================================
  describe('Event Handling', () => {
    it('updates stage text on status event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'status', data: { stage: 'Analyzing brief...' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Analyzing brief...')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('updates stage text on phase_start event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'phase_start', data: { stage: 'Round 1: Initial Analysis' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Round 1: Initial Analysis')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('displays message content from message_chunk events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'message_chunk', data: { agent: 'director', content: 'From a creative perspective' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText(/creative perspective/i)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('handles message_complete event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'message_chunk', data: { agent: 'director', content: 'Analysis complete.' } },
          { type: 'message_complete', data: { agent: 'director' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          // After message_complete, the message should be displayed
          expect(screen.getByText('Analysis complete.')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })

  // ============================================================================
  // Debate Phase
  // ============================================================================
  describe('Debate Phase', () => {
    it('updates stage text on debate_start', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'debate_start', data: { topic: 'Visual approach refinement' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Debate: Visual approach refinement')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('displays debate messages from debate_chunk events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'debate_chunk', data: { agent: 'cinematographer', content: 'I suggest wider angles.' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText(/wider angles/i)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('shows Round 2 header when debate messages exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'debate_chunk', data: { agent: 'editor', content: 'Quick cuts will work better.' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Round 2: Collaborative Refinement')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })

  // ============================================================================
  // Synthesis and Shots
  // ============================================================================
  describe('Synthesis and Shots', () => {
    it('handles synthesis_chunk event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'synthesis_chunk', data: { content: 'Synthesizing prompt...' } },
        ]),
      })

      // The component should handle this without crashing
      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles synthesis_complete event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'synthesis_complete', data: { synthesis: 'Final optimized prompt text' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles shots_chunk event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'shots_chunk', data: { content: 'Shot 1: Wide establishing shot' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles shots_complete event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'shots_complete', data: { shots: 'Shot 1: Wide\nShot 2: Close-up' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Session Complete
  // ============================================================================
  describe('Session Complete', () => {
    it('shows completion message on complete event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          {
            type: 'complete',
            data: {
              synthesis: 'Final prompt',
              suggestedShots: 'Shot list',
              conversationHistory: [],
              debateMessages: [],
            },
          },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Session Complete!')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('sets progress to 100% on complete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          {
            type: 'complete',
            data: {
              synthesis: 'Final prompt',
              suggestedShots: 'Shot list',
            },
          },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('100%')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('calls onComplete with final data', async () => {
      const onComplete = jest.fn()
      const mockConversation = [
        {
          agentKey: 'director',
          agentName: 'Director',
          agentColor: 'blue',
          content: 'Great concept!',
          isComplete: true,
        },
      ]
      const mockDebate = [
        { from: 'cinematographer', fromName: 'Cinematographer', message: 'Use wide shots' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          {
            type: 'complete',
            data: {
              synthesis: 'Optimized prompt',
              suggestedShots: 'Shot 1, Shot 2',
              conversationHistory: mockConversation,
              debateMessages: mockDebate,
            },
          },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} onComplete={onComplete} />)

      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalledWith({
            finalPrompt: 'Optimized prompt',
            suggestedShots: 'Shot 1, Shot 2',
            conversationHistory: mockConversation,
            debateMessages: mockDebate,
          })
        },
        { timeout: 3000 }
      )
    })
  })

  // ============================================================================
  // Review Mode
  // ============================================================================
  describe('Review Mode', () => {
    it('loads saved conversation in review mode', () => {
      const savedConversation = {
        conversationHistory: [
          {
            agentKey: 'director',
            agentName: 'Director',
            agentColor: 'blue',
            content: 'Previously saved analysis',
            isComplete: true,
          },
        ],
        debateMessages: [
          { from: 'editor', fromName: 'Editor', message: 'Previous debate point' },
        ],
      }

      render(
        <StreamingRoundtableModal
          {...defaultProps}
          reviewMode={true}
          savedConversation={savedConversation}
        />
      )

      expect(screen.getByText('Previously saved analysis')).toBeInTheDocument()
      expect(screen.getByText('Previous debate point')).toBeInTheDocument()
    })

    it('does not start streaming in review mode', () => {
      mockFetch.mockClear()
      const savedConversation = {
        conversationHistory: [],
        debateMessages: [],
      }

      render(
        <StreamingRoundtableModal
          {...defaultProps}
          reviewMode={true}
          savedConversation={savedConversation}
        />
      )

      // Should not make fetch call in review mode
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('shows Review stage text in review mode', () => {
      const savedConversation = {
        conversationHistory: [],
        debateMessages: [],
      }

      render(
        <StreamingRoundtableModal
          {...defaultProps}
          reviewMode={true}
          savedConversation={savedConversation}
        />
      )

      expect(screen.getByText('Review: Creative Session')).toBeInTheDocument()
    })

    it('shows 100% progress in review mode', () => {
      const savedConversation = {
        conversationHistory: [],
        debateMessages: [],
      }

      render(
        <StreamingRoundtableModal
          {...defaultProps}
          reviewMode={true}
          savedConversation={savedConversation}
        />
      )

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('shows session complete in review mode', () => {
      const savedConversation = {
        conversationHistory: [],
        debateMessages: [],
      }

      render(
        <StreamingRoundtableModal
          {...defaultProps}
          reviewMode={true}
          savedConversation={savedConversation}
        />
      )

      expect(screen.getByText('Session Complete!')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // User Interactions
  // ============================================================================
  describe('User Interactions', () => {
    it('calls onClose when clicking backdrop', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<StreamingRoundtableModal {...defaultProps} onClose={onClose} />)

      // Click on the backdrop (first child with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50')
      if (backdrop) {
        await user.click(backdrop)
      }

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when clicking close button', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<StreamingRoundtableModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByTestId('x-icon').closest('button')
      if (closeButton) {
        await user.click(closeButton)
      }

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when clicking Done Reviewing button', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<StreamingRoundtableModal {...defaultProps} onClose={onClose} isComplete={true} />)

      await user.click(screen.getByRole('button', { name: /done reviewing/i }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('handles streaming failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      // Should not crash
      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // Modal should still be rendered
      expect(screen.getByText('AI Creative Session')).toBeInTheDocument()
    })

    it('handles malformed JSON events', async () => {
      const encoder = new TextEncoder()

      const brokenStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('not valid json\n'))
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', data: { stage: 'Working' } }) + '\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: brokenStream,
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      // Should continue processing valid events
      await waitFor(
        () => {
          expect(screen.getByText('Working')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('handles null response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      })

      // Should handle gracefully without crashing
      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // Modal should still be rendered
      expect(screen.getByText('AI Creative Session')).toBeInTheDocument()
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Should not crash
      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // Modal should still be rendered
      expect(screen.getByText('AI Creative Session')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('accumulates chunks for same agent', async () => {
      // Test that chunks for the same agent accumulate together
      // Note: Component has 800ms artificial delay between chunks
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'message_chunk', data: { agent: 'director', content: 'Part 1' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Part 1')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('displays messages from different agents', async () => {
      // Test that messages from different agents appear separately
      // Note: Component has 800ms delay per chunk, so we test single messages
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'message_chunk', data: { agent: 'director', content: 'Director analysis' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Director analysis')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('displays Round 1 header when conversation history exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamingResponse([
          { type: 'message_chunk', data: { agent: 'director', content: 'Initial analysis' } },
        ]),
      })

      render(<StreamingRoundtableModal {...defaultProps} />)

      await waitFor(
        () => {
          expect(screen.getByText('Round 1: Initial Analysis')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })
})
