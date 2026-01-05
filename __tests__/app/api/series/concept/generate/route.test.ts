jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai/config', () => ({
  getModelForFeature: jest.fn().mockReturnValue('gpt-4'),
}))
jest.mock('@/lib/validation/series-concept-validator', () => ({
  validateSeriesConcept: jest.fn(),
  validateBusinessRules: jest.fn(),
}))
jest.mock('js-yaml', () => ({
  load: jest.fn(),
}))

// Create mock that can be configured per-test
const mockChatCompletionsCreate = jest.fn()
;(global as any).__mockChatCompletionsCreate = mockChatCompletionsCreate

// Must mock OpenAI BEFORE importing the route (module-scope instantiation)
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: any[]) => (global as any).__mockChatCompletionsCreate(...args),
      },
    },
  }))
})

import { createClient } from '@/lib/supabase/server'
import { validateSeriesConcept, validateBusinessRules } from '@/lib/validation/series-concept-validator'
import yaml from 'js-yaml'
import { POST } from '@/app/api/series/concept/generate/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/concept/generate', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('POST /api/series/concept/generate', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: { dialogueState: { messages: [] } },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 500 when YAML extraction fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'No YAML here, just plain text' } }],
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: {
          dialogueState: {
            messages: [{ role: 'user', content: 'Create a sci-fi series' }],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to extract YAML')
    })

    it('returns 500 when YAML parsing fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '```yaml\ninvalid: yaml: content:\n```' } }],
      })

      ;(yaml.load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML')
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: {
          dialogueState: {
            messages: [{ role: 'user', content: 'Create a series' }],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('YAML parsing failed')
    })

    it('returns 400 when schema validation fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '```yaml\ntitle: Test\n```' } }],
      })

      ;(yaml.load as jest.Mock).mockReturnValue({ title: 'Test' })

      ;(validateSeriesConcept as jest.Mock).mockReturnValue({
        success: false,
        errors: {
          format: () => ({ issues: ['Missing required fields'] }),
        },
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: {
          dialogueState: {
            messages: [{ role: 'user', content: 'Create a series' }],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid concept structure')
    })

    it('returns 400 when business rules validation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const validConcept = {
        title: 'Test Series',
        description: 'A test',
        characters: [],
        seasons: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '```yaml\ntitle: Test Series\n```' } }],
      })

      ;(yaml.load as jest.Mock).mockReturnValue(validConcept)

      ;(validateSeriesConcept as jest.Mock).mockReturnValue({
        success: true,
        data: validConcept,
      })

      ;(validateBusinessRules as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Must have at least 3 seasons'],
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: {
          dialogueState: {
            messages: [{ role: 'user', content: 'Create a series' }],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Business rule violations')
    })

    it('generates concept successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const validConcept = {
        title: 'The Cosmic Voyage',
        description: 'An epic sci-fi adventure',
        genre: 'sci-fi',
        characters: [
          { name: 'Captain James', role: 'protagonist' },
          { name: 'Dr. Chen', role: 'supporting' },
        ],
        seasons: [{ title: 'Season 1', episodes: [] }],
        settings: [{ name: 'Starship Aurora', importance: 'high' }],
        relationships: [],
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{
          message: {
            content: `\`\`\`yaml
title: The Cosmic Voyage
description: An epic sci-fi adventure
\`\`\``,
          },
        }],
      })

      ;(yaml.load as jest.Mock).mockReturnValue(validConcept)

      ;(validateSeriesConcept as jest.Mock).mockReturnValue({
        success: true,
        data: validConcept,
      })

      ;(validateBusinessRules as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      })

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: {
          dialogueState: {
            messages: [
              { role: 'user', content: 'Create a sci-fi series about space exploration' },
              { role: 'assistant', content: 'Great idea! Let me develop this...' },
            ],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.concept).toBeDefined()
      expect(data.concept.title).toBe('The Cosmic Voyage')
      expect(mockChatCompletionsCreate).toHaveBeenCalled()
    })

    it('returns 500 on unexpected error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockChatCompletionsCreate.mockRejectedValue(new Error('OpenAI API error'))

      const request = createMockRequest('http://localhost:3000/api/series/concept/generate', {
        method: 'POST',
        body: {
          dialogueState: {
            messages: [{ role: 'user', content: 'Create a series' }],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })
  })
})
