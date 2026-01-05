jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/series/standalone/route'
import { createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/standalone', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/series/standalone', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('returns standalone series from RPC function', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: 'standalone-series-id-123',
        error: null,
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('standalone-series-id-123')
      expect(data.name).toBe('Standalone Videos')
    })

    it('falls back to direct query when RPC fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // RPC fails
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      })

      // Direct query succeeds
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'fallback-series-id', name: 'Standalone Videos' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('fallback-series-id')
    })

    it('creates new standalone series when none exists', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // RPC fails
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: direct query fails (no series exists)
        if (callCount === 1) {
          return {
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
          }
        }

        // Second call: create new series
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'new-series-id', name: 'Standalone Videos' },
                error: null,
              }),
            }),
          }),
        }
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('new-series-id')
    })

    it('returns 500 when creation fails', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
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
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      })

      const response = await GET()

      expect(response.status).toBe(500)
    })
  })
})
