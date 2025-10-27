/**
 * API Route Test Helpers for Next.js 15
 *
 * Provides utilities for testing API routes with proper mocking of Next.js server components
 */

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(url: string, options: {
  method?: string
  body?: any
  headers?: Record<string, string>
} = {}) {
  const { method = 'GET', body, headers = {} } = options

  return {
    url,
    method,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body || {}),
  } as any
}

/**
 * Create a mock Supabase client for testing
 * @param options - Optional configuration for table-specific mocks
 */
export function createMockSupabaseClient(options: {
  profiles?: any[]
} = {}) {
  const profileData = options.profiles || [{
    id: 'test-user-id',
    is_admin: false,
    subscription_tier: 'premium',
    usage_current: { videos_this_month: 0 },
    usage_quota: { videos_per_month: 100 }
  }]

  const mockFrom = jest.fn((table: string) => {
    const chainable = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }

    // Default handling for profiles table
    if (table === 'profiles') {
      chainable.select = jest.fn().mockReturnValue({
        ...chainable,
        eq: jest.fn().mockReturnValue({
          ...chainable,
          limit: jest.fn().mockResolvedValue({
            data: profileData,
            error: null,
          }),
        }),
      })
    }

    return chainable
  })

  return {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: mockFrom,
  }
}
