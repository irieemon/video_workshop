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
import { GET } from '@/app/api/admin/stats/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/admin/stats', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/admin/stats', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // User is not admin
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

      const request = createMockRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('returns stats for admin users', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Create stateful mock to track calls
      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        // First call: profiles for admin check
        if (callCount === 1 && table === 'profiles') {
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

        // Subsequent calls: count queries
        // Return mock for select with count option
        return {
          select: jest.fn().mockImplementation((_, options) => {
            if (options?.count === 'exact') {
              // This is a count query
              return {
                eq: jest.fn().mockReturnThis(),
                not: jest.fn().mockReturnThis(),
                gte: jest.fn().mockResolvedValue({
                  count: 10,
                  error: null,
                }),
              }
            }

            // Regular select
            return {
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockResolvedValue({
                data: [
                  { user_id: 'user-1' },
                  { user_id: 'user-2' },
                  { user_id: 'user-1' }, // Duplicate to test unique counting
                ],
                error: null,
              }),
            }
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('total_users')
      expect(data).toHaveProperty('total_videos')
      expect(data).toHaveProperty('total_series')
      expect(data).toHaveProperty('active_users_30d')
      expect(data).toHaveProperty('sora_success_rate')
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let isFirstCall = true
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (isFirstCall && table === 'profiles') {
          isFirstCall = false
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
        // Throw on subsequent queries
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('handles zero counts gracefully', async () => {
      const mockUser = { id: 'admin-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1 && table === 'profiles') {
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
          select: jest.fn().mockImplementation((_, options) => {
            if (options?.count === 'exact') {
              return {
                eq: jest.fn().mockReturnThis(),
                not: jest.fn().mockReturnThis(),
                gte: jest.fn().mockResolvedValue({
                  count: 0, // Zero counts
                  error: null,
                }),
              }
            }
            return {
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockResolvedValue({
                data: [], // Empty arrays
                error: null,
              }),
            }
          }),
        }
      })

      const request = createMockRequest('http://localhost:3000/api/admin/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total_users).toBe(0)
      expect(data.active_users_30d).toBe(0)
      expect(data.avg_videos_per_user).toBe(0)
      expect(data.sora_success_rate).toBe(0)
    })
  })
})
