jest.mock('@/lib/supabase/server')

// Mock @react-pdf/renderer before any imports
// The components need to be actual functions that work with React.createElement
jest.mock('@react-pdf/renderer', () => {
  // Create mock components that return simple React-like elements
  const createMockComponent = (name: string) => {
    const MockComponent = (props: any) => ({
      type: name,
      props,
      $$typeof: Symbol.for('react.element'),
    })
    MockComponent.displayName = name
    return MockComponent
  }

  return {
    renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('fake pdf content')),
    Document: createMockComponent('Document'),
    Page: createMockComponent('Page'),
    Text: createMockComponent('Text'),
    View: createMockComponent('View'),
    StyleSheet: {
      create: jest.fn((styles: any) => styles),
    },
    Font: {
      register: jest.fn(),
    },
  }
})

import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { POST } from '@/app/api/videos/[id]/export/pdf/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/videos/[id]/export/pdf', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const videoId = 'video-123'
  const mockParams = Promise.resolve({ id: videoId })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    ;(renderToBuffer as jest.Mock).mockResolvedValue(Buffer.from('fake pdf content'))
  })

  describe('POST /api/videos/[id]/export/pdf', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(401)
    })

    it('returns 404 when video not found', async () => {
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

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('returns 400 when video has no optimized prompt', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        title: 'Test Video',
        optimized_prompt: null, // No prompt
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVideo,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('no optimized prompt')
    })

    it('generates and returns PDF successfully', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        title: 'My Awesome Video',
        optimized_prompt: 'A cinematic scene of a sunset over the ocean',
        created_at: '2024-01-15T12:00:00Z',
        hashtags: ['sunset', 'cinematic', 'ocean'],
        target_platform: 'YouTube',
        sora_generation_settings: {
          aspect_ratio: '16:9',
          duration: 10,
          resolution: '1080p',
          model: 'sora-v1',
        },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVideo,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toContain('My Awesome Video.pdf')
      expect(renderToBuffer).toHaveBeenCalled()
    })

    it('generates PDF for video without optional fields', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        title: 'Simple Video',
        optimized_prompt: 'A simple scene',
        created_at: '2024-01-15T12:00:00Z',
        // No hashtags, no target_platform, no sora_generation_settings
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVideo,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
    })

    it('uses default filename when video has no title', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        title: null, // No title
        optimized_prompt: 'A scene without a title',
        created_at: '2024-01-15T12:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVideo,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Disposition')).toContain('video-prompt.pdf')
    })

    it('returns 500 when PDF generation fails', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        title: 'Test Video',
        optimized_prompt: 'A scene',
        created_at: '2024-01-15T12:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVideo,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Mock PDF generation failure
      ;(renderToBuffer as jest.Mock).mockRejectedValue(new Error('PDF generation failed'))

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to generate PDF')
    })

    it('includes all sora generation settings in PDF when available', async () => {
      const mockUser = { id: 'test-user-id' }
      const mockVideo = {
        id: videoId,
        title: 'Full Spec Video',
        optimized_prompt: 'A comprehensive scene',
        created_at: '2024-01-15T12:00:00Z',
        sora_generation_settings: {
          aspect_ratio: '9:16',
          duration: 15,
          resolution: '720p',
          model: 'sora-pro',
        },
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockVideo,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createMockRequest(
        `http://localhost:3000/api/videos/${videoId}/export/pdf`,
        { method: 'POST' }
      )
      const response = await POST(request, { params: mockParams })

      expect(response.status).toBe(200)
      // Verify renderToBuffer was called (which receives the document with all specs)
      expect(renderToBuffer).toHaveBeenCalled()
    })
  })
})
