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
 * Create a complete Supabase query builder mock
 * Returns fully chainable mock that satisfies TypeScript
 */
function createSupabaseQueryBuilder() {
  const mockData = { data: null, error: null }

  const builder: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockData),
    maybeSingle: jest.fn().mockResolvedValue(mockData),
    csv: jest.fn().mockResolvedValue(mockData),
    // Terminal operations that return promises
    then: jest.fn((resolve) => resolve(mockData)),
  }

  return builder
}

/**
 * Create a mock Supabase client for testing
 * @param options - Configuration for default responses
 */
export function createMockSupabaseClient(options: {
  user?: any
  profiles?: any[]
  defaultData?: any
  defaultError?: any
} = {}) {
  const defaultUser = options.user || { id: 'test-user-id', email: 'test@example.com' }
  const defaultProfile = {
    id: 'test-user-id',
    is_admin: false,
    subscription_tier: 'premium',
    usage_current: { videos_this_month: 0 },
    usage_quota: { videos_per_month: 100 }
  }

  const mockFrom = jest.fn((table: string) => {
    const builder = createSupabaseQueryBuilder()

    // Configure default responses by table
    if (table === 'profiles') {
      builder.single.mockResolvedValue({
        data: options.profiles?.[0] || defaultProfile,
        error: options.defaultError || null,
      })
    } else {
      builder.single.mockResolvedValue({
        data: options.defaultData || null,
        error: options.defaultError || null,
      })
    }

    return builder
  })

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: defaultUser },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: defaultUser } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
    },
    from: mockFrom,
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  }
}

/**
 * Create a configured query builder for specific test scenarios
 * Use this for fine-grained control in individual tests
 */
export function createConfiguredQueryBuilder(config: {
  selectData?: any
  insertData?: any
  updateData?: any
  deleteData?: any
  error?: any
}) {
  const builder = createSupabaseQueryBuilder()

  if (config.selectData !== undefined) {
    builder.then.mockImplementation((resolve: any) => resolve({
      data: config.selectData,
      error: config.error || null,
    }))
  }

  if (config.insertData !== undefined) {
    builder.single.mockResolvedValue({
      data: config.insertData,
      error: config.error || null,
    })
  }

  if (config.updateData !== undefined) {
    builder.single.mockResolvedValue({
      data: config.updateData,
      error: config.error || null,
    })
  }

  if (config.deleteData !== undefined) {
    builder.single.mockResolvedValue({
      data: config.deleteData,
      error: config.error || null,
    })
  }

  return builder
}
