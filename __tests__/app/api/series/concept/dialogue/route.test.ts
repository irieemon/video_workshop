jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/series-concept-agent')
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
import {
  initializeDialogueState,
  determinePhaseTransition,
  buildSystemPrompt,
} from '@/lib/ai/series-concept-agent'
import { getModelForFeature } from '@/lib/ai/config'
import { POST } from '@/app/api/series/concept/dialogue/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/concept/dialogue', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  // Create a reusable async iterator factory for streaming responses
  const createMockStream = (chunks: string[]) => ({
    [Symbol.asyncIterator]: async function* () {
      for (const content of chunks) {
        yield { choices: [{ delta: { content } }] }
      }
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Initialize mockOpenAICreate before each test
    mockOpenAICreate = jest.fn().mockResolvedValue(createMockStream(['Hello ', 'there!']))

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(getModelForFeature as jest.Mock).mockReturnValue('gpt-4o')

    // Mock series-concept-agent functions
    ;(initializeDialogueState as jest.Mock).mockReturnValue({
      phase: 'discovery',
      messages: [],
      extractedElements: {},
      exchangeCount: 0,
    })
    ;(determinePhaseTransition as jest.Mock).mockReturnValue('discovery')
    ;(buildSystemPrompt as jest.Mock).mockReturnValue('System prompt for dialogue')
  })

  describe('POST /api/series/concept/dialogue', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Test message', dialogueState: null },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 500 when JSON parsing fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Create a request that will fail JSON parsing
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('initializes dialogue state when not provided', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Start conversation', dialogueState: null },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(initializeDialogueState).toHaveBeenCalled()
    })

    it('uses existing dialogue state when provided', async () => {
      const mockUser = { id: 'test-user-id' }
      const existingState = {
        phase: 'refinement',
        messages: [
          { role: 'user', content: 'Previous message', timestamp: '2024-01-01' },
        ],
        extractedElements: { genre: 'sci-fi' },
        exchangeCount: 5,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Continue conversation', dialogueState: existingState },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(initializeDialogueState).not.toHaveBeenCalled()
      expect(determinePhaseTransition).toHaveBeenCalled()
    })

    it('returns streaming response with correct headers', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Hello', dialogueState: null },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('determines phase transition for each message', async () => {
      const mockUser = { id: 'test-user-id' }
      const dialogueState = {
        phase: 'discovery',
        messages: [],
        extractedElements: {},
        exchangeCount: 0,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock phase transition to refinement
      ;(determinePhaseTransition as jest.Mock).mockReturnValue('refinement')

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Refine the concept', dialogueState },
      })

      await POST(request)

      // determinePhaseTransition is called with the state after user message is added
      // The phase in the state passed to determinePhaseTransition is from input (discovery)
      // but the result (refinement) gets assigned back, so in the received call the state
      // already has phase: 'refinement' because the same object reference is modified
      expect(determinePhaseTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Refine the concept', role: 'user' }),
          ]),
        }),
        'Refine the concept'
      )
    })

    it('builds system prompt for current phase', async () => {
      const mockUser = { id: 'test-user-id' }
      const dialogueState = {
        phase: 'synthesis',
        messages: [],
        extractedElements: { title: 'My Series' },
        exchangeCount: 10,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Final thoughts', dialogueState },
      })

      await POST(request)

      expect(buildSystemPrompt).toHaveBeenCalled()
    })

    it('returns 500 when OpenAI call fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock OpenAI failure
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'))

      const request = createMockRequest('http://localhost:3000/api/series/concept/dialogue', {
        method: 'POST',
        body: { message: 'Test message', dialogueState: null },
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).toContain('Internal server error')
    })
  })
})
