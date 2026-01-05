jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/debug/series-schema/route'
import { createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/debug/series-schema', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/debug/series-schema', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('returns 401 when auth returns error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid session' },
      })

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('returns diagnostics with all schema checks for authenticated user', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSampleSeries = [
        { id: 'series-1', name: 'Series 1', user_id: mockUser.id, created_at: '2024-01-01' },
        { id: 'series-2', name: 'Series 2', user_id: mockUser.id, created_at: '2024-01-02' },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock all the diagnostic queries - they all go to 'series' table
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields: string, options?: any) => {
          // Check 1: user_id column exists (select with limit)
          if (fields === 'id, user_id, name') {
            return {
              limit: jest.fn().mockResolvedValue({
                data: [mockSampleSeries[0]],
                error: null,
              }),
            }
          }

          // Check 2 & 3 & 4: count queries (head: true)
          if (options?.head === true) {
            return {
              is: jest.fn().mockResolvedValue({
                count: 0,
                error: null,
              }),
              eq: jest.fn().mockResolvedValue({
                count: 2,
                error: null,
              }),
            }
          }

          // Check 5: sample series
          if (fields === 'id, name, user_id, created_at') {
            return {
              limit: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockSampleSeries,
                  error: null,
                }),
              }),
            }
          }

          // Default return for count without head
          return {
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user_id).toBe(mockUser.id)
      expect(data.timestamp).toBeDefined()
      expect(data.checks).toBeDefined()
      expect(data.diagnosis).toBeDefined()
    })

    it('handles user_id column check error gracefully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Return error for user_id column check
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields: string, options?: any) => {
          if (fields === 'id, user_id, name') {
            return {
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Column user_id does not exist' },
              }),
            }
          }

          // Other queries succeed
          if (options?.head === true) {
            return {
              is: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }
          }

          return {
            limit: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.checks.user_id_column_exists).toBe(false)
      expect(data.checks.user_id_column_error).toBe('Column user_id does not exist')
    })

    it('returns 500 when diagnostic check fails with exception', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Throw an error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Diagnostic check failed')
      expect(data.details).toBe('Database connection failed')
    })

    it('includes stack trace in development mode on error', async () => {
      const mockUser = { id: 'test-user-id' }
      const originalEnv = process.env.NODE_ENV

      // Set to development mode
      process.env.NODE_ENV = 'development'

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Test error')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.stack).toBeDefined()

      // Restore
      process.env.NODE_ENV = originalEnv
    })
  })
})
