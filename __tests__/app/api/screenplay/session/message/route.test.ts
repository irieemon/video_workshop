jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/screenplay-agent')
jest.mock('@/lib/ai/config')

// Store mock for OpenAI's create function - use var to avoid hoisting issues
var mockOpenAICreate: jest.Mock

// Mock OpenAI with streaming support
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: any[]) => mockOpenAICreate(...args),
      },
    },
  })),
}))

import { createClient } from '@/lib/supabase/server'
import { SCREENPLAY_AGENT_SYSTEM_PROMPT } from '@/lib/ai/screenplay-agent'
import { getModelForFeature } from '@/lib/ai/config'
import { POST } from '@/app/api/screenplay/session/message/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/screenplay/session/message', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  // Create a reusable async iterator factory for streaming responses
  const createMockStream = (chunks: string[]) => ({
    [Symbol.asyncIterator]: async function* () {
      for (const content of chunks) {
        yield { choices: [{ delta: { content } }] }
      }
    },
  })

  // Helper to consume a streaming response body (needed for stream processing to complete)
  const consumeStream = async (response: Response) => {
    // In the test environment, response.body may be a ReadableStream
    // We can use text() or arrayBuffer() to consume it, or iterate manually
    if (response.body && typeof (response.body as any)[Symbol.asyncIterator] === 'function') {
      // If it's an async iterable (ReadableStream), consume it
      for await (const _ of response.body as any) {
        // Just consume chunks
      }
    } else if (response.body && typeof (response.body as any).getReader === 'function') {
      const reader = (response.body as any).getReader()
      try {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } finally {
        reader.releaseLock()
      }
    } else if (typeof response.text === 'function') {
      // Fallback: use text() to consume the body
      await response.text()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Initialize mockOpenAICreate before each test
    mockOpenAICreate = jest.fn().mockResolvedValue(createMockStream(['Screenplay ', 'response']))

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(getModelForFeature as jest.Mock).mockReturnValue('gpt-4o')
  })

  describe('POST /api/screenplay/session/message', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'session-123', message: 'Test' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 404 when session not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'non-existent-session', message: 'Test message' },
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('returns streaming response with correct headers when session exists', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSession = {
        id: 'session-123',
        user_id: mockUser.id,
        series_id: 'series-456',
        target_type: 'episode',
        current_step: 'writing',
        conversation_history: [],
      }
      const mockSeries = {
        id: 'series-456',
        name: 'Test Series',
        screenplay_data: { logline: 'A test logline' },
        series_characters: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'screenplay_sessions') {
          callCount++
          if (callCount === 1) {
            // First call: fetch session
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          } else {
            // Second call: update session
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }
          }
        }
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSeries,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'session-123', message: 'Write scene 1' },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('includes series context in messages when series exists', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSession = {
        id: 'session-123',
        user_id: mockUser.id,
        series_id: 'series-456',
        target_type: 'episode',
        current_step: 'writing',
        conversation_history: [],
      }
      const mockSeries = {
        id: 'series-456',
        name: 'Mystery Series',
        screenplay_data: { logline: 'A detective solves crimes' },
        series_characters: [
          { name: 'Detective Smith', dramatic_profile: { role_in_story: 'protagonist' } },
        ],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'screenplay_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSession,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSeries,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'session-123', message: 'Write scene' },
      })

      await POST(request)

      // Verify OpenAI was called
      expect(mockOpenAICreate).toHaveBeenCalled()
    })

    it('processes screenplay and notifies when saved to episode', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSession = {
        id: 'session-123',
        user_id: mockUser.id,
        series_id: 'series-456',
        target_type: 'episode',
        current_step: 'writing',
        conversation_history: [],
        episode_id: 'episode-789',
      }

      // Create a structured screenplay with required markers and valid structure
      // The extractStructuredScreenplay function looks for these specific markers
      const validScreenplay = {
        acts: [],
        scenes: [
          {
            scene_id: 'scene-001',
            scene_number: 1,
            location: 'OFFICE',
            time_of_day: 'INT',
            time_period: 'DAY',
            description: 'A tense meeting takes place in the corner office.',
            characters: ['JOHN', 'SARAH'],
            action: ['John paces nervously', 'Sarah reviews documents'],
            dialogue: [],
          },
        ],
        beats: [],
      }
      const screenplayJson = JSON.stringify(validScreenplay, null, 2)
      const aiResponseWithScreenplay = `Here is your screenplay:\n\n---STRUCTURED-SCREENPLAY-START---\n\`\`\`json\n${screenplayJson}\n\`\`\`\n---STRUCTURED-SCREENPLAY-END---`

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Track if episodes.update was called
      const episodeUpdateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'screenplay_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSession,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'episodes') {
          return {
            update: episodeUpdateMock,
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      // Mock OpenAI to return a screenplay in JSON format
      mockOpenAICreate.mockResolvedValue(createMockStream([aiResponseWithScreenplay]))

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'session-123', message: 'Generate screenplay' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Consume stream and collect all data
      const chunks: string[] = []
      if (response.body && typeof (response.body as any)[Symbol.asyncIterator] === 'function') {
        const decoder = new TextDecoder()
        for await (const chunk of response.body as any) {
          chunks.push(decoder.decode(chunk))
        }
      }
      const streamContent = chunks.join('')

      // When screenplay is successfully extracted and saved, the stream includes screenplay_saved event
      // The route sends this after updating the episode
      // Note: Need small delay because async operations inside ReadableStream.start() may still be pending
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(episodeUpdateMock).toHaveBeenCalled()
    })

    it('returns 500 when OpenAI call fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSession = {
        id: 'session-123',
        user_id: mockUser.id,
        series_id: 'series-456',
        target_type: 'episode',
        current_step: 'writing',
        conversation_history: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'screenplay_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSession,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      // Mock OpenAI failure
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'))

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'session-123', message: 'Test' },
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('handles empty screenplay extraction gracefully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSession = {
        id: 'session-123',
        user_id: mockUser.id,
        series_id: 'series-456',
        target_type: 'episode',
        current_step: 'writing',
        conversation_history: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Track episode updates - should NOT be called when screenplay is invalid/empty
      const episodeUpdateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'screenplay_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockSession,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'episodes') {
          return {
            update: episodeUpdateMock,
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      // Mock OpenAI to return response without a valid JSON screenplay block
      mockOpenAICreate.mockResolvedValue(createMockStream(['Just a regular ', 'chat response without screenplay']))

      const request = createMockRequest('http://localhost:3000/api/screenplay/session/message', {
        method: 'POST',
        body: { sessionId: 'session-123', message: 'Generate' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Consume stream to complete processing
      await consumeStream(response)

      // Episode should not be updated when no valid screenplay is extracted
      expect(episodeUpdateMock).not.toHaveBeenCalled()
    })
  })
})
