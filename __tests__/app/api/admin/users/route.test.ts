jest.mock('@/lib/supabase/server')
jest.mock('@/lib/logger', () => ({
  createAPILogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  LOG_MESSAGES: {
    AUTH_UNAUTHORIZED: 'Unauthorized',
    API_REQUEST_ERROR: 'API error',
  },
}))

import { createClient } from '@/lib/supabase/server'
import { GET, PATCH } from '@/app/api/admin/users/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/admin/users', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/admin/users', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: false },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users')
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('returns paginated user list for admin users', async () => {
      const mockUser = { id: 'admin-user-id' }
      const mockUsers = [
        { id: 'user-1', email: 'alice@test.com', full_name: 'Alice', subscription_tier: 'premium' },
        { id: 'user-2', email: 'bob@test.com', full_name: 'Bob', subscription_tier: 'free' },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: admin check
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: users list with pagination
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockUsers,
                count: 2,
                error: null,
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      })
    })

    it('filters users by search query', async () => {
      const mockUser = { id: 'admin-user-id' }
      const mockUsers = [{ id: 'user-1', email: 'alice@test.com', full_name: 'Alice' }]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      let capturedOrFilter: string | null = null
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                or: jest.fn().mockImplementation((filter: string) => {
                  capturedOrFilter = filter
                  return Promise.resolve({
                    data: mockUsers,
                    count: 1,
                    error: null,
                  })
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users?search=alice')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(1)
      expect(capturedOrFilter).toContain('alice')
    })

    it('filters users by subscription tier', async () => {
      const mockUser = { id: 'admin-user-id' }
      const mockUsers = [{ id: 'user-1', email: 'premium@test.com', subscription_tier: 'premium' }]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      let capturedTierFilter: string | null = null
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                eq: jest.fn().mockImplementation((field: string, value: string) => {
                  if (field === 'subscription_tier') {
                    capturedTierFilter = value
                  }
                  return Promise.resolve({
                    data: mockUsers,
                    count: 1,
                    error: null,
                  })
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users?tier=premium')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(1)
      expect(capturedTierFilter).toBe('premium')
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'admin-user-id' }

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
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                count: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/admin/users', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { userId: 'target-user-id', updates: { is_admin: true } },
      })
      const response = await PATCH(request)

      expect(response.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: false },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { userId: 'target-user-id', updates: { is_admin: true } },
      })
      const response = await PATCH(request)

      expect(response.status).toBe(403)
    })

    it('returns 400 when userId is not provided', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { updates: { is_admin: true } },
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID required')
    })

    it('prevents self-demotion from admin', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { userId: 'admin-user-id', updates: { is_admin: false } },
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot remove your own admin privileges')
    })

    it('prevents revoking the last admin', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: admin check for current user
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: count admins
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 1, // Only one admin exists
              error: null,
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { userId: 'other-admin-id', updates: { is_admin: false } },
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot revoke last admin. At least one admin must remain.')
    })

    it('successfully updates user for admin', async () => {
      const mockUser = { id: 'admin-user-id' }
      const updatedUser = {
        id: 'target-user-id',
        email: 'user@test.com',
        subscription_tier: 'premium',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: admin check
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        // Second call: update user
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedUser,
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { userId: 'target-user-id', updates: { subscription_tier: 'premium' } },
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription_tier).toBe('premium')
    })

    it('returns 500 on update error', async () => {
      const mockUser = { id: 'admin-user-id' }

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
                single: jest.fn().mockResolvedValue({
                  data: { is_admin: true },
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: { userId: 'target-user-id', updates: { subscription_tier: 'premium' } },
      })
      const response = await PATCH(request)

      expect(response.status).toBe(500)
    })
  })
})
