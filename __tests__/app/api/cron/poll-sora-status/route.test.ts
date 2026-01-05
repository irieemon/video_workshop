jest.mock('@/lib/supabase/server')

// Mock OpenAI module - note the class-style mock required for dynamic import
const mockVideosRetrieve = jest.fn()
const mockVideosDownloadContent = jest.fn()
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: class MockOpenAI {
      videos = {
        retrieve: mockVideosRetrieve,
        downloadContent: mockVideosDownloadContent,
      }
    },
  }
})

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/cron/poll-sora-status/route'
import { createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

describe('/api/cron/poll-sora-status', () => {
  const mockSupabaseClient = createMockSupabaseClient()
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'test-cron-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      OPENAI_API_KEY: 'test-openai-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function createCronRequest(authToken?: string) {
    const headers = new Headers()
    if (authToken) {
      headers.set('authorization', `Bearer ${authToken}`)
    }
    return {
      url: 'http://localhost:3000/api/cron/poll-sora-status',
      method: 'GET',
      headers,
    } as any
  }

  describe('Authorization', () => {
    it('returns 401 when no authorization header', async () => {
      const request = createCronRequest()
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('returns 401 when authorization token is wrong', async () => {
      const request = createCronRequest('wrong-secret')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('allows request with valid CRON_SECRET', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('No active generations')
    })
  })

  describe('No active generations', () => {
    it('returns success with no processing when no active videos', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(0)
    })

    it('returns success with null active videos', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Fetch errors', () => {
    it('returns 500 when fetching active videos fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Timeout detection', () => {
    it('marks video as failed when timed out (>15 minutes)', async () => {
      const timedOutVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'job-1',
        sora_generation_status: 'in_progress',
        sora_started_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago
      }

      let callCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        // First call: fetch active videos
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                not: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [timedOutVideo],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Second call: update as timed out
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.timedOut).toBe(1)
    })
  })

  describe('Sora API status checking', () => {
    it('handles completed video and downloads content', async () => {
      const activeVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'job-1',
        sora_generation_status: 'in_progress',
        sora_started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago (not timed out)
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              // Check if it's the active videos query (has .in and .not chained)
              if (fields.includes('sora_job_id')) {
                return {
                  in: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                      order: jest.fn().mockResolvedValue({
                        data: [activeVideo],
                        error: null,
                      }),
                    }),
                  }),
                }
              }
              // Full video fetch (single record)
              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...activeVideo, optimized_prompt: 'test prompt' },
                    error: null,
                  }),
                }),
              }
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      // Mock OpenAI API responses
      mockVideosRetrieve.mockResolvedValue({
        status: 'completed',
      })

      mockVideosDownloadContent.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('fake video content')),
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.success).toBe(1)
      expect(mockVideosRetrieve).toHaveBeenCalledWith('job-1')
    })

    it('handles failed video status from Sora API', async () => {
      const activeVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'job-1',
        sora_generation_status: 'in_progress',
        sora_started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              if (fields.includes('sora_job_id')) {
                return {
                  in: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                      order: jest.fn().mockResolvedValue({
                        data: [activeVideo],
                        error: null,
                      }),
                    }),
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: activeVideo,
                    error: null,
                  }),
                }),
              }
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      mockVideosRetrieve.mockResolvedValue({
        status: 'failed',
        error: { message: 'Content policy violation' },
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.failed).toBe(1)
    })

    it('handles API 404 error (job not found)', async () => {
      const activeVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'nonexistent-job',
        sora_generation_status: 'in_progress',
        sora_started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              if (fields.includes('sora_job_id')) {
                return {
                  in: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                      order: jest.fn().mockResolvedValue({
                        data: [activeVideo],
                        error: null,
                      }),
                    }),
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: activeVideo,
                    error: null,
                  }),
                }),
              }
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      mockVideosRetrieve.mockRejectedValue({
        status: 404,
        message: 'Job not found',
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.failed).toBe(1)
    })

    it('skips video when full video fetch fails', async () => {
      const activeVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'job-1',
        sora_generation_status: 'in_progress',
        sora_started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }

      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation(() => {
        fromCallCount++

        if (fromCallCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                not: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [activeVideo],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        // Full video fetch fails
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Video not found' },
              }),
            }),
          }),
        }
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.errors).toHaveLength(1)
    })
  })

  describe('Processing status', () => {
    it('updates status when still processing', async () => {
      const activeVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'job-1',
        sora_generation_status: 'queued',
        sora_started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              if (fields.includes('sora_job_id')) {
                return {
                  in: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                      order: jest.fn().mockResolvedValue({
                        data: [activeVideo],
                        error: null,
                      }),
                    }),
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: activeVideo,
                    error: null,
                  }),
                }),
              }
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      mockVideosRetrieve.mockResolvedValue({
        status: 'processing', // Still processing
      })

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Neither success nor failed since still processing
      expect(data.results.success).toBe(0)
      expect(data.results.failed).toBe(0)
    })
  })

  describe('Download errors', () => {
    it('marks video as failed when download fails', async () => {
      const activeVideo = {
        id: 'video-1',
        user_id: 'user-1',
        sora_job_id: 'job-1',
        sora_generation_status: 'in_progress',
        sora_started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'videos') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              if (fields.includes('sora_job_id')) {
                return {
                  in: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                      order: jest.fn().mockResolvedValue({
                        data: [activeVideo],
                        error: null,
                      }),
                    }),
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: activeVideo,
                    error: null,
                  }),
                }),
              }
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      mockVideosRetrieve.mockResolvedValue({
        status: 'completed',
      })

      mockVideosDownloadContent.mockRejectedValue(new Error('Download failed'))

      const request = createCronRequest('test-cron-secret')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.failed).toBe(1)
    })
  })
})
