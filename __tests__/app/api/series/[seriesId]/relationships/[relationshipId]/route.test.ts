jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { PATCH, DELETE } from '@/app/api/series/[seriesId]/relationships/[relationshipId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/[seriesId]/relationships/[relationshipId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440001'
  const relationshipId = '550e8400-e29b-41d4-a716-446655440002'
  const mockParams = Promise.resolve({ seriesId, relationshipId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('PATCH /api/series/[seriesId]/relationships/[relationshipId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'PATCH',
        body: { description: 'Updated description' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
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

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'PATCH',
        body: { description: 'Updated' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Series not found')
    })

    it('returns 404 when relationship not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // First call for series, second for relationship check
      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(
                callCount++ === 0
                  ? { data: mockSeries, error: null }
                  : { data: null, error: { code: 'PGRST116' } }
              ),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'PATCH',
        body: { description: 'Updated' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Relationship not found')
    })

    it('returns 400 for invalid relationship_type', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockRelationship = { id: relationshipId, series_id: seriesId }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(
                callCount++ === 0
                  ? { data: mockSeries, error: null }
                  : { data: mockRelationship, error: null }
              ),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'PATCH',
        body: { relationship_type: 'invalid_type' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid relationship_type')
    })

    it('returns 400 when custom type lacks custom_label', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockRelationship = { id: relationshipId, series_id: seriesId }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(
                callCount++ === 0
                  ? { data: mockSeries, error: null }
                  : { data: mockRelationship, error: null }
              ),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'PATCH',
        body: { relationship_type: 'custom' }, // Missing custom_label
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('custom_label is required')
    })

    it('successfully updates relationship', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockRelationship = { id: relationshipId, series_id: seriesId }
      const updatedRelationship = {
        ...mockRelationship,
        description: 'Updated description',
        intensity: 8,
        character_a: { id: 'char1', name: 'Alice' },
        character_b: { id: 'char2', name: 'Bob' },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(
                callCount++ === 0
                  ? { data: mockSeries, error: null }
                  : { data: mockRelationship, error: null }
              ),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedRelationship,
                error: null,
              }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'PATCH',
        body: { description: 'Updated description', intensity: 8 },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.description).toBe('Updated description')
      expect(data.intensity).toBe(8)
    })
  })

  describe('DELETE /api/series/[seriesId]/relationships/[relationshipId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
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

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('successfully deletes relationship', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSeries,
                error: null,
              }),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('deleted successfully')
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('http://localhost:3000/api/series/test/relationships/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
