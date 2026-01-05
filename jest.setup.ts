import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream, WritableStream, TransformStream } from 'stream/web'

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder as any
global.TextDecoder = TextDecoder as any

// Polyfill Web Streams API for SSE/streaming route tests
if (typeof globalThis.ReadableStream === 'undefined') {
  (global as any).ReadableStream = ReadableStream
}
if (typeof globalThis.WritableStream === 'undefined') {
  (global as any).WritableStream = WritableStream
}
if (typeof globalThis.TransformStream === 'undefined') {
  (global as any).TransformStream = TransformStream
}

// Polyfill Web APIs (Response, Request, Headers) for Jest/jsdom test environment
// jsdom doesn't provide Fetch API globals, so we create minimal implementations

// Minimal Response mock that supports JSON body and headers
class MockResponse {
  body: string | null
  status: number
  statusText: string
  headers: Map<string, string>
  ok: boolean

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.body = typeof body === 'string' ? body : body ? JSON.stringify(body) : null
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Map()
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => this.headers.set(key, value))
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => this.headers.set(key, value))
      } else {
        Object.entries(init.headers).forEach(([key, value]) => this.headers.set(key, value))
      }
    }
  }

  async json() {
    return this.body ? JSON.parse(this.body) : null
  }

  async text() {
    return this.body || ''
  }
}

// Use native if available (Node 18+), otherwise use mock
if (typeof globalThis.Response === 'undefined') {
  (global as any).Response = MockResponse
} else {
  (global as any).Response = globalThis.Response
}

if (typeof globalThis.Request === 'undefined') {
  // Minimal Request mock
  (global as any).Request = class MockRequest {
    url: string
    method: string
    headers: Headers
    constructor(url: string, init?: RequestInit) {
      this.url = url
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
    }
  }
} else {
  (global as any).Request = globalThis.Request
}

if (typeof globalThis.fetch === 'undefined') {
  (global as any).fetch = jest.fn()
} else {
  (global as any).fetch = globalThis.fetch
}

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
jest.mock('next/server', () => {
  // Create a mock NextResponse class that can be used as constructor or static methods
  class MockNextResponse {
    body: any
    status: number
    headers: Headers

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Headers(init?.headers)
    }

    async json() {
      if (this.body instanceof Buffer || this.body instanceof Uint8Array) {
        return null // Binary data, not JSON
      }
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }

    async arrayBuffer() {
      if (this.body instanceof Buffer) {
        return this.body.buffer.slice(this.body.byteOffset, this.body.byteOffset + this.body.byteLength)
      }
      if (this.body instanceof Uint8Array) {
        return this.body.buffer
      }
      return new ArrayBuffer(0)
    }

    // Static methods
    static json(data: any, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(data), init)
      response.json = async () => data
      return response
    }

    static redirect(url: string | URL, init?: number | ResponseInit) {
      const status = typeof init === 'number' ? init : init?.status || 307
      const response = new MockNextResponse(null, { status })
      response.headers.set('location', url.toString())
      return response
    }
  }

  return {
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
    NextResponse: MockNextResponse,
  }
})
