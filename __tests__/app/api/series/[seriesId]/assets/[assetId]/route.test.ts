jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { DELETE, PATCH } from '@/app/api/series/[seriesId]/assets/[assetId]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/series/[seriesId]/assets/[assetId]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440001'
  const assetId = '550e8400-e29b-41d4-a716-446655440003'
  const mockParams = Promise.resolve({ seriesId, assetId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    // Add storage mock
    mockSupabaseClient.storage = {
      from: jest.fn().mockReturnValue({
        remove: jest.fn().mockResolvedValue({ error: null }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed-url' },
        }),
      }),
    }
  })

  describe('DELETE /api/series/[seriesId]/assets/[assetId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
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

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when asset not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

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
                  : { data: null, error: { code: 'PGRST116' } }
              ),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Asset not found')
    })

    it('successfully deletes asset', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockAsset = { id: assetId, series_id: seriesId, storage_path: 'series-123/asset.png' }

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
                  : { data: mockAsset, error: null }
              ),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('series-assets')
    })

    it('continues with db delete even if storage delete fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockAsset = { id: assetId, series_id: seriesId, storage_path: 'series-123/asset.png' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock storage error
      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          remove: jest.fn().mockResolvedValue({ error: { message: 'Storage error' } }),
        }),
      }

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(
                callCount++ === 0
                  ? { data: mockSeries, error: null }
                  : { data: mockAsset, error: null }
              ),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      // Should still succeed even though storage delete failed
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('PATCH /api/series/[seriesId]/assets/[assetId]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'PATCH',
        body: { name: 'Updated name' },
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

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'PATCH',
        body: { name: 'Updated' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 404 when asset not found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }

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
                  : { data: null, error: { code: 'PGRST116' } }
              ),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'PATCH',
        body: { name: 'Updated' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Asset not found')
    })

    it('successfully updates asset and returns signed URL', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: mockUser.id }
      const mockAsset = { id: assetId, series_id: seriesId, storage_path: 'series-123/asset.png' }
      const updatedAsset = {
        ...mockAsset,
        name: 'Updated Asset Name',
        description: 'New description',
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
                  : { data: mockAsset, error: null }
              ),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedAsset,
                error: null,
              }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'PATCH',
        body: { name: 'Updated Asset Name', description: 'New description' },
      })
      const response = await PATCH(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Asset Name')
      expect(data.description).toBe('New description')
      expect(data.url).toBe('https://example.com/signed-url')
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

      const request = createMockRequest('http://localhost:3000/api/series/test/assets/test', {
        method: 'PATCH',
        body: { name: 'Test' },
      })
      const response = await PATCH(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
