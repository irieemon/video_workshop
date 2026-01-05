jest.mock('@/lib/supabase/server')
jest.mock('@/lib/encryption/api-key-encryption', () => ({
  encryptApiKey: jest.fn((key: string) => ({
    encrypted: `encrypted_${key}`,
    suffix: key.slice(-4),
  })),
  isValidOpenAIKeyFormat: jest.fn((key: string) => key.startsWith('sk-')),
  isValidAnthropicKeyFormat: jest.fn((key: string) => key.startsWith('sk-ant-')),
  detectKeyProvider: jest.fn((key: string) => {
    if (key.startsWith('sk-ant-')) return 'anthropic'
    if (key.startsWith('sk-')) return 'openai'
    return 'unknown'
  }),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/user/api-keys/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/user/api-keys', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/user/api-keys', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('returns list of API keys for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockKeys = [
        {
          id: 'key-1',
          provider: 'openai',
          key_suffix: 'abc1',
          key_name: 'Production',
          is_valid: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockKeys,
              error: null,
            }),
          }),
        }),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keys).toHaveLength(1)
      expect(data.keys[0].provider).toBe('openai')
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const response = await GET()

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/user/api-keys', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/user/api-keys', {
        method: 'POST',
        body: { api_key: 'sk-test123' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when api_key is not provided', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/user/api-keys', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('API key is required')
    })

    it('returns 400 when provider cannot be detected', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/user/api-keys', {
        method: 'POST',
        body: { api_key: 'invalid-key-format' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Unable to detect API key provider')
    })

    it('returns 409 when duplicate key name exists', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'existing-key' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/user/api-keys', {
        method: 'POST',
        body: { api_key: 'sk-test123456789', key_name: 'Default' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already have a')
    })

    it('creates API key successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const newKey = {
        id: 'new-key-id',
        provider: 'openai',
        key_suffix: '6789',
        key_name: 'Production',
        is_valid: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }

        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newKey,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/user/api-keys', {
        method: 'POST',
        body: { api_key: 'sk-test123456789', key_name: 'Production' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.key.id).toBe('new-key-id')
      expect(data.key.provider).toBe('openai')
    })
  })
})
