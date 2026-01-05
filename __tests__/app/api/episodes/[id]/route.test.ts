import { createClient } from '@/lib/supabase/server'
import { GET, PUT, DELETE } from '@/app/api/episodes/[id]/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/episodes/[id]', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const episodeId = '550e8400-e29b-41d4-a716-446655440000'
  const mockParams = Promise.resolve({ id: episodeId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/episodes/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns episode when found', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockEpisode = {
        id: episodeId,
        series_id: 'series-123',
        title: 'Episode 1',
        logline: 'A test episode',
        status: 'draft',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEpisode,
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`)
      const response = await GET(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode).toEqual(mockEpisode)
    })

    it('returns 404 when episode not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed')
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`)
      const response = await GET(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('PUT /api/episodes/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'PUT',
        body: { title: 'Updated Title' },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('updates episode title successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const updatedEpisode = {
        id: episodeId,
        title: 'Updated Title',
        logline: 'Original logline',
        status: 'draft',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedEpisode,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'PUT',
        body: { title: 'Updated Title' },
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.title).toBe('Updated Title')
    })

    it('updates episode status', async () => {
      const mockUser = { id: 'test-user-id' }
      const updatedEpisode = {
        id: episodeId,
        title: 'Episode 1',
        status: 'published',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedEpisode,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'PUT',
        body: { status: 'published' },
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.status).toBe('published')
    })

    it('updates screenplay text', async () => {
      const mockUser = { id: 'test-user-id' }
      const screenplayText = 'FADE IN: A beautiful sunrise...'
      const updatedEpisode = {
        id: episodeId,
        screenplay_text: screenplayText,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedEpisode,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'PUT',
        body: { screenplay_text: screenplayText },
      })
      const response = await PUT(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.episode.screenplay_text).toBe(screenplayText)
    })

    it('returns 500 on update failure', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
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
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'PUT',
        body: { title: 'New Title' },
      })
      const response = await PUT(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/episodes/[id]', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('deletes episode successfully', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on delete failure', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      })

      const request = createMockRequest(`http://localhost:3000/api/episodes/${episodeId}`, {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })
})
