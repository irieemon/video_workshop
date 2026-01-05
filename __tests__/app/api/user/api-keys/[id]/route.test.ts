jest.mock('@/lib/supabase/server')
jest.mock('@/lib/encryption/api-key-encryption', () => ({
  decryptApiKey: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { DELETE, PATCH } from '@/app/api/user/api-keys/[id]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/user/api-keys/[id]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const keyId = '550e8400-e29b-41d4-a716-446655440000'
  const mockParams = Promise.resolve({ id: keyId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('DELETE /api/user/api-keys/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

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

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when key belongs to different user', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Simulates the query returning nothing because of user_id mismatch
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

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('deletes API key successfully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_api_keys') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: keyId },
                    error: null,
                  }),
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on database delete failure', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_api_keys') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: keyId },
                    error: null,
                  }),
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/user/api-keys/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        {
          method: 'PATCH',
          body: { key_name: 'New Name' },
        }
      )
      const response = await PATCH(request, { params: mockParams })

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

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        {
          method: 'PATCH',
          body: { key_name: 'New Name' },
        }
      )
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when no valid fields to update', async () => {
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
                data: { id: keyId, provider: 'openai' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        {
          method: 'PATCH',
          body: {},
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No valid fields to update')
    })

    it('returns 409 when key_name conflicts with existing key', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_api_keys') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockImplementation(() => {
                    callCount++
                    if (callCount === 1) {
                      // First call: verify key exists for this user
                      return Promise.resolve({
                        data: { id: keyId, provider: 'openai' },
                        error: null,
                      })
                    }
                    return Promise.resolve({ data: null, error: null })
                  }),
                  eq: jest.fn().mockReturnValue({
                    neq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: { id: 'other-key' }, // Conflicting key exists
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        {
          method: 'PATCH',
          body: { key_name: 'Existing Name' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already have a key named')
    })

    it('updates key name successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const updatedKey = {
        id: keyId,
        provider: 'openai',
        key_suffix: '...xyz',
        key_name: 'Updated Name',
        is_valid: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_api_keys') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: keyId, provider: 'openai' },
                    error: null,
                  }),
                  eq: jest.fn().mockReturnValue({
                    neq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: null, // No conflict
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: updatedKey,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(
        `http://localhost:3000/api/user/api-keys/${keyId}`,
        {
          method: 'PATCH',
          body: { key_name: 'Updated Name' },
        }
      )
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key.key_name).toBe('Updated Name')
    })
  })
})
