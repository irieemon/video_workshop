import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder as any
global.TextDecoder = TextDecoder as any

// Polyfill for Radix UI components (pointer capture APIs)
// These are browser APIs not available in jsdom that Radix UI components use
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false)
}
if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = jest.fn()
}
if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = jest.fn()
}

// Polyfill for ResizeObserver (used by many UI libraries)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Polyfill for scrollIntoView (used by Radix UI Select)
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = jest.fn()
}

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

/**
 * Creates a fully chainable Supabase query builder mock
 * Supports all common query patterns: .select().eq().limit().single() etc.
 */
function createChainableQueryBuilder() {
  const defaultResponse = { data: null, error: null }

  const builder: Record<string, jest.Mock> = {}

  // All chainable methods return the builder itself
  const chainableMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent',
    'overlaps', 'textSearch', 'match', 'not', 'or', 'and', 'filter',
    'order', 'limit', 'range', 'abortSignal', 'throwOnError',
  ]

  chainableMethods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder)
  })

  // Terminal methods that return promises
  builder.single = jest.fn().mockResolvedValue(defaultResponse)
  builder.maybeSingle = jest.fn().mockResolvedValue(defaultResponse)
  builder.csv = jest.fn().mockResolvedValue(defaultResponse)

  // Make the builder itself thenable (for await without .single())
  builder.then = jest.fn((resolve) => resolve(defaultResponse))

  return builder
}

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
    from: jest.fn(() => createChainableQueryBuilder()),
  })),
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    from: jest.fn(() => createChainableQueryBuilder()),
  })),
}))

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  response: 'Test AI response',
                }),
              },
            },
          ],
        })),
      },
    },
  })),
}))

// Mock Next.js server APIs for Next.js 15 compatibility
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => {
    return {
      url,
      method: init?.method || 'GET',
      headers: new Headers(init?.headers),
      json: async () => {
        if (typeof init?.body === 'string') {
          return JSON.parse(init.body)
        }
        return init?.body || {}
      },
    }
  }),
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      json: async () => data,
    })),
    redirect: jest.fn((url, init) => ({
      status: init || 307,
      headers: new Headers({ location: url.toString() }),
      json: async () => ({}),
    })),
  },
}))
