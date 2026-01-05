import { createClient } from '@/lib/supabase/server'
import { POST, GET } from '@/app/api/series/[seriesId]/assets/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/series/[seriesId]/assets', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const seriesId = '550e8400-e29b-41d4-a716-446655440000'

  // Next.js 15 uses Promise<params> pattern
  const createParams = (id: string) => Promise.resolve({ seriesId: id })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/series/[seriesId]/assets', () => {
    it('returns assets with signed URLs', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockAssets = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          series_id: seriesId,
          name: 'Hero Portrait',
          asset_type: 'character_reference',
          storage_path: 'test-user-id/series-id/image.png',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          series_id: seriesId,
          name: 'Location Shot',
          asset_type: 'setting_reference',
          storage_path: 'test-user-id/series-id/location.jpg',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockAssets,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.example.com/signed-url' },
          }),
        }),
      }

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/assets`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Hero Portrait')
      expect(data[0].url).toBe('https://storage.example.com/signed-url')
    })

    it('returns empty array when no assets', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/assets`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('handles null signed URL gracefully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockAssets = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          series_id: seriesId,
          name: 'Asset',
          storage_path: 'path/to/file.png',
        },
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockAssets,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({
            data: null,  // No signed URL
          }),
        }),
      }

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/assets`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data[0].url).toBeNull()
    })

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/assets`)
      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
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
        return {}
      })

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/assets`)
      const response = await GET(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 500 on database error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createMockRequest(`http://localhost:3000/api/series/${seriesId}/assets`)
      const response = await GET(request, { params: createParams(seriesId) })

      expect(response.status).toBe(500)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('POST /api/series/[seriesId]/assets', () => {
    // Helper to create mock FormData request
    function createFormDataRequest(
      url: string,
      formDataFields: Record<string, string | File>
    ): NextRequest {
      const formData = new FormData()
      for (const [key, value] of Object.entries(formDataFields)) {
        formData.append(key, value)
      }

      return {
        url,
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest
    }

    it('returns 401 for unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file, name: 'Test Asset' }
      )

      const response = await POST(request, { params: createParams(seriesId) })

      expect(response.status).toBe(401)
    })

    it('returns 404 when series not found', async () => {
      const mockUser = { id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
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
        return {}
      })

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file, name: 'Test Asset' }
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 400 for missing file', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        return {}
      })

      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { name: 'Test Asset' }  // No file
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No file provided')
    })

    it('returns 400 for missing name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        return {}
      })

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file }  // No name
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('name is required')
    })

    it('returns 400 for empty name', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        return {}
      })

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file, name: '   ' }  // Empty/whitespace name
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('name is required')
    })

    it('returns 400 for invalid file type', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        return {}
      })

      const file = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file, name: 'Test Asset' }
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    it('returns 400 for file too large', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        return {}
      })

      // Create a file larger than 10MB by overriding size property
      const largeFile = new File(['test'], 'test.png', { type: 'image/png' })
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })

      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file: largeFile, name: 'Test Asset' }
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('File too large')
    })

    it('uploads asset successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockAsset = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        series_id: seriesId,
        name: 'Test Asset',
        asset_type: 'character_reference',
        storage_path: 'test-user-id/series-id/test.png',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_visual_assets') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAsset,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ error: null }),
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.example.com/signed-url' },
          }),
        }),
      }

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        {
          file,
          name: 'Test Asset',
          description: 'A test asset',
          assetType: 'character_reference',
        }
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Test Asset')
      expect(data.url).toBe('https://storage.example.com/signed-url')
    })

    it('returns 500 on storage upload error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        return {}
      })

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            error: { message: 'Storage error' },
          }),
        }),
      }

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file, name: 'Test Asset' }
      )

      const response = await POST(request, { params: createParams(seriesId) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('upload')
      consoleErrorSpy.mockRestore()
    })

    it('cleans up uploaded file on database error', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockSeries = { id: seriesId, user_id: 'test-user-id' }
      const mockRemove = jest.fn().mockResolvedValue({ error: null })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
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
          }
        }
        if (table === 'series_visual_assets') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database insert failed' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      mockSupabaseClient.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ error: null }),
          remove: mockRemove,
        }),
      }

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const file = new File(['test content'], 'test.png', { type: 'image/png' })
      const request = createFormDataRequest(
        `http://localhost:3000/api/series/${seriesId}/assets`,
        { file, name: 'Test Asset' }
      )

      const response = await POST(request, { params: createParams(seriesId) })

      expect(response.status).toBe(500)
      // Verify cleanup was called
      expect(mockRemove).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })
})
