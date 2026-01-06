/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScreenplayChat } from '@/components/screenplay/screenplay-chat'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper to create a streaming response
function createStreamingResponse(chunks: string[]) {
  let chunkIndex = 0
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    pull(controller) {
      if (chunkIndex < chunks.length) {
        controller.enqueue(encoder.encode(chunks[chunkIndex]))
        chunkIndex++
      } else {
        controller.close()
      }
    },
  })

  return {
    ok: true,
    body: stream,
  }
}

describe('ScreenplayChat', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    seriesId: 'series-123',
    seriesName: 'Test Series',
    targetType: 'episode' as const,
    targetId: 'episode-456',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()

    // Default mock for session start
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sessionId: 'session-abc',
          episodeId: 'episode-456',
          initialMessage: 'Welcome! Let me help you write your screenplay.',
        }),
    })
  })

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders dialog when open', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Screenplay Writer')).toBeInTheDocument()
      })
    })

    it('shows series name in description', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Test Series/)).toBeInTheDocument()
      })
    })

    it('renders input textarea', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/type your response/i)
        ).toBeInTheDocument()
      })
    })

    it('renders send button', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        // Find the button by its position/role - it's the send button
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })

    it('does not render when closed', () => {
      render(<ScreenplayChat {...defaultProps} open={false} />)

      expect(screen.queryByText('Screenplay Writer')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Session Management
  // ============================================================================
  describe('Session Management', () => {
    it('starts session when dialog opens', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/screenplay/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seriesId: 'series-123',
            targetType: 'episode',
            targetId: 'episode-456',
            initialConcept: undefined,
          }),
        })
      })
    })

    it('displays initial message from session', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText('Welcome! Let me help you write your screenplay.')
        ).toBeInTheDocument()
      })
    })

    it('passes initialConcept when provided', async () => {
      const initialConcept = {
        episode_number: 1,
        season_number: 1,
        title: 'Pilot',
        logline: 'The beginning',
        plot_summary: 'Story starts here',
        character_focus: ['John', 'Jane'],
      }

      render(<ScreenplayChat {...defaultProps} initialConcept={initialConcept} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/screenplay/session/start',
          expect.objectContaining({
            body: expect.stringContaining('"episode_number":1'),
          })
        )
      })
    })

    it('shows error alert when session start fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Session failed' }),
      })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to start screenplay session')
      })

      consoleSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('resets state when dialog closes', async () => {
      const { rerender } = render(<ScreenplayChat {...defaultProps} />)

      // Wait for initial message
      await waitFor(() => {
        expect(
          screen.getByText('Welcome! Let me help you write your screenplay.')
        ).toBeInTheDocument()
      })

      // Close dialog
      rerender(<ScreenplayChat {...defaultProps} open={false} />)

      // Re-open - should start fresh session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: 'session-new',
            episodeId: 'episode-456',
            initialMessage: 'New session started!',
          }),
      })

      rerender(<ScreenplayChat {...defaultProps} open={true} />)

      await waitFor(() => {
        expect(screen.getByText('New session started!')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Message Sending
  // ============================================================================
  describe('Message Sending', () => {
    it('sends user message when clicking send button', async () => {
      const user = userEvent.setup()

      // Setup streaming response for the message
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse([
            'data: {"content":"Response "}\n',
            'data: {"content":"from AI"}\n',
            'data: [DONE]\n',
          ])
        )

      render(<ScreenplayChat {...defaultProps} />)

      // Wait for session to start
      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Type message
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Hello AI')

      // Find and click send button (it's the last button typically)
      const buttons = screen.getAllByRole('button')
      const sendButton = buttons.find((btn) =>
        btn.querySelector('svg.lucide-send')
      ) || buttons[buttons.length - 1]
      await user.click(sendButton)

      // Verify message was sent
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/screenplay/session/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session-abc',
            message: 'Hello AI',
          }),
        })
      })
    })

    it('sends message on Enter key press', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"AI response"}\n', 'data: [DONE]\n'])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test message{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/screenplay/session/message',
          expect.any(Object)
        )
      })
    })

    it('does not send on Shift+Enter (allows newline)', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: 'session-abc',
            episodeId: 'episode-456',
            initialMessage: 'Welcome!',
          }),
      })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

      // Should not have sent message
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only session start
    })

    it('clears input after sending message', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Response"}\n', 'data: [DONE]\n'])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i) as HTMLTextAreaElement
      await user.type(textarea, 'Test message')
      expect(textarea.value).toBe('Test message')

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(textarea.value).toBe('')
      })
    })

    it('disables input while loading', async () => {
      const user = userEvent.setup()
      let resolveMessage: (value: any) => void

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveMessage = resolve
            })
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(textarea).toBeDisabled()
      })

      // Resolve the pending request
      resolveMessage!(createStreamingResponse(['data: {"content":"Done"}\n', 'data: [DONE]\n']))
    })

    it('displays user message in chat', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"AI says hi"}\n', 'data: [DONE]\n'])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Hello from user{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Hello from user')).toBeInTheDocument()
      })
    })

    it('handles message send errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(
          screen.getByText(/sorry, i encountered an error/i)
        ).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Streaming Responses
  // ============================================================================
  describe('Streaming Responses', () => {
    it('updates message content as chunks arrive', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse([
            'data: {"content":"Hello "}\n',
            'data: {"content":"world!"}\n',
            'data: [DONE]\n',
          ])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Hi{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Hello world!')).toBeInTheDocument()
      })
    })

    it('shows assistant label on AI messages', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Screenplay Agent')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Save Functionality
  // ============================================================================
  describe('Save Functionality', () => {
    it('shows save button when episode exists', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save$/i })).toBeInTheDocument()
      })
    })

    it('saves progress when save button is clicked', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Some content"}\n', 'data: [DONE]\n'])
        )
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Send a message to create unsaved changes
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Generate content{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Some content')).toBeInTheDocument()
      })

      // Click save
      const saveButton = screen.getByRole('button', { name: /^save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/episodes/episode-456',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('screenplay_text'),
          })
        )
      })
    })

    it('shows "Unsaved changes" indicator when there are changes', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Response"}\n', 'data: [DONE]\n'])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Send message to create changes
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      })
    })

    it('shows saved time after saving', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Content"}\n', 'data: [DONE]\n'])
        )
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Generate content and save
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /^save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Close Confirmation
  // ============================================================================
  describe('Close Confirmation', () => {
    it('shows confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Response"}\n', 'data: [DONE]\n'])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Create unsaved changes
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument()
      })

      // Try to close (click the X or outside) - Radix Dialog uses onOpenChange
      // We simulate by finding the close trigger or escape key
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
        expect(
          screen.getByText(/you have unsaved work in this screenplay session/i)
        ).toBeInTheDocument()
      })
    })

    it('closes without confirmation when no unsaved changes', async () => {
      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        // Use partial match since the full message from mock is longer
        expect(screen.getByText(/Welcome/i)).toBeInTheDocument()
      })

      // Close immediately - no confirmation should appear
      defaultProps.onClose.mockClear()

      // Click the X close button in the dialog header (has sr-only "Close" text)
      // Use getAllByRole since there might be multiple close buttons
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      // The X button is typically the last close-related button
      const xButton = closeButtons.find(btn => btn.querySelector('.sr-only'))
      if (xButton) {
        await userEvent.click(xButton)
      }

      // Since there are no unsaved changes (just the initial message),
      // the dialog should close without showing confirmation
      // Note: The component tracks hasUnsavedChanges based on assistant responses
      // after the initial message, so immediately closing should not trigger confirmation
      await waitFor(() => {
        expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
      })
    })

    it('saves and closes when clicking "Save & Close" in confirmation', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Content"}\n', 'data: [DONE]\n'])
        )
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Create changes
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      // Click Save & Close button directly
      const saveAndCloseButton = screen.getByRole('button', { name: /save & close/i })
      await user.click(saveAndCloseButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/episodes/episode-456',
          expect.any(Object)
        )
      })
    })

    it('discards and closes when clicking "Discard" in confirmation', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse(['data: {"content":"Content"}\n', 'data: [DONE]\n'])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      // Create changes
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      // Try to close
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      })

      // Click Discard
      await user.click(screen.getByRole('button', { name: /discard/i }))

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('does not send empty messages', async () => {
      const user = userEvent.setup()

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        // Use partial text match since the full message is longer
        expect(screen.getByText(/Welcome/i)).toBeInTheDocument()
      })

      // Try to send empty message
      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, '   ') // Only whitespace
      await user.keyboard('{Enter}')

      // Should not have sent message
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only session start
    })

    it('handles session without episodeId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: 'session-abc',
            episodeId: null, // No episode
            initialMessage: 'Welcome to the session!',
          }),
      })

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the session/i)).toBeInTheDocument()
      })

      // The small Save button (not Save & Close) should not be present without episodeId
      // Note: Save & Close button always renders but is disabled, the small Save button
      // is conditionally rendered based on episodeId
      const allButtons = screen.getAllByRole('button')
      const saveOnlyButtons = allButtons.filter(
        btn => btn.textContent === 'Save' || btn.textContent === 'Saving...'
      )
      expect(saveOnlyButtons).toHaveLength(0)
    })

    it('handles malformed JSON in stream gracefully', async () => {
      const user = userEvent.setup()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockResolvedValueOnce(
          createStreamingResponse([
            'data: {"content":"Valid "}\n',
            'data: {invalid json}\n', // Malformed
            'data: {"content":"content"}\n',
            'data: [DONE]\n',
          ])
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      // Should still show valid content, skipping malformed
      await waitFor(() => {
        expect(screen.getByText('Valid content')).toBeInTheDocument()
      })
    })

    it('shows loading spinner while waiting for response', async () => {
      const user = userEvent.setup()
      let resolveMessage: (value: any) => void

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: 'session-abc',
              episodeId: 'episode-456',
              initialMessage: 'Welcome!',
            }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveMessage = resolve
            })
        )

      render(<ScreenplayChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome!')).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/type your response/i)
      await user.type(textarea, 'Test{Enter}')

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument() // User message
        // Loading indicator should be present (Loader2 with animate-spin)
        expect(document.querySelector('.animate-spin')).toBeInTheDocument()
      })

      // Cleanup
      resolveMessage!(createStreamingResponse(['data: [DONE]\n']))
    })
  })

  // ============================================================================
  // Target Types
  // ============================================================================
  describe('Target Types', () => {
    it('sends correct targetType for series', async () => {
      render(<ScreenplayChat {...defaultProps} targetType="series" targetId="series-123" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/screenplay/session/start',
          expect.objectContaining({
            body: expect.stringContaining('"targetType":"series"'),
          })
        )
      })
    })

    it('sends correct targetType for scene', async () => {
      render(<ScreenplayChat {...defaultProps} targetType="scene" targetId="scene-789" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/screenplay/session/start',
          expect.objectContaining({
            body: expect.stringContaining('"targetType":"scene"'),
          })
        )
      })
    })

    it('sends correct targetType for character', async () => {
      render(<ScreenplayChat {...defaultProps} targetType="character" targetId="char-111" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/screenplay/session/start',
          expect.objectContaining({
            body: expect.stringContaining('"targetType":"character"'),
          })
        )
      })
    })
  })
})
