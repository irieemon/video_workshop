jest.mock('@/lib/supabase/server')
jest.mock('@/lib/encryption/api-key-encryption', () => ({
  decryptApiKey: jest.fn((encrypted: string) => {
    if (encrypted === 'corrupted-key') throw new Error('Decryption failed')
    if (encrypted === 'encrypted_sk-ant-valid') return 'sk-ant-valid-key'
    if (encrypted.startsWith('encrypted_')) return encrypted.replace('encrypted_', '')
    return encrypted
  }),
}))

// Mock OpenAI
const mockModelsList = jest.fn()
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    models: {
      list: () => mockModelsList(),
    },
  }))
})

import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/user/api-keys/[id]/validate/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/user/api-keys/[id]/validate', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const keyId = 'key-123'
  const mockParams = Promise.resolve({ id: keyId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    mockModelsList.mockReset()
  })

  describe('POST /api/user/api-keys/[id]/validate', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when key not found', async () => {
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
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when key cannot be decrypted', async () => {
      const mockUser = { id: 'test-user-id' }

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
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: keyId,
                      encrypted_key: 'corrupted-key',
                      provider: 'openai',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toContain('decrypt')
    })

    it('validates OpenAI key successfully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockModelsList.mockResolvedValue({ data: [{ id: 'gpt-4' }] })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: keyId,
                      encrypted_key: 'encrypted_sk-test-key',
                      provider: 'openai',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
    })

    it('validates Anthropic key by format', async () => {
      const mockUser = { id: 'test-user-id' }

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
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: keyId,
                      encrypted_key: 'encrypted_sk-ant-valid',
                      provider: 'anthropic',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
    })

    it('treats rate limit as valid key', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Simulate rate limit error (429)
      mockModelsList.mockRejectedValue({ status: 429, message: 'Rate limited' })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: keyId,
                      encrypted_key: 'encrypted_sk-test-key',
                      provider: 'openai',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
    })

    it('returns invalid for 401 errors', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Simulate 401 error (invalid key)
      mockModelsList.mockRejectedValue({ status: 401, message: 'Invalid API key' })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: keyId,
                      encrypted_key: 'encrypted_sk-test-key',
                      provider: 'openai',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const request = createMockRequest(`http://localhost:3000/api/user/api-keys/${keyId}/validate`, {
        method: 'POST',
      })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(false)
      expect(data.error).toBe('Invalid API key')
    })
  })
})
