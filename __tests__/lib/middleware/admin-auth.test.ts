/**
 * Tests for Admin Authentication Middleware
 *
 * Tests the admin authentication and authorization middleware
 * used to protect admin-only routes and API endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'

// Mock next/headers cookies
const mockGetAll = jest.fn()
const mockSet = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => mockGetAll(),
    set: (name: string, value: string, options: object) => mockSet(name, value, options),
  }),
}))

// Mock Supabase SSR client
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Import after mocks are set up
import { checkAdminAuth, verifyAdminAPI } from '@/lib/middleware/admin-auth'

describe('Admin Authentication Middleware', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
    mockGetAll.mockReturnValue([])
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  function createMockRequest(pathname: string = '/admin'): NextRequest {
    const url = new URL(pathname, 'http://localhost:3000')
    return {
      url: url.toString(),
      nextUrl: {
        pathname,
      },
    } as NextRequest
  }

  describe('checkAdminAuth', () => {
    describe('Unauthenticated Users', () => {
      it('redirects to login when user is not authenticated', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const request = createMockRequest('/admin/dashboard')
        const result = await checkAdminAuth(request)

        expect(result.isAdmin).toBe(false)
        expect(result.userId).toBeNull()
        expect(result.response).toBeDefined()
        // Check that it's a redirect response
        expect(result.response?.status).toBe(307) // NextResponse.redirect uses 307
      })

      it('includes redirectTo parameter in login redirect', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const request = createMockRequest('/admin/users')
        const result = await checkAdminAuth(request)

        expect(result.response).toBeDefined()
        // The redirect URL should contain the original path
        const redirectUrl = result.response?.headers.get('location')
        expect(redirectUrl).toContain('/login')
        expect(redirectUrl).toContain('redirectTo=%2Fadmin%2Fusers')
      })

      it('redirects when auth error occurs', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth session missing' },
        })

        const request = createMockRequest('/admin')
        const result = await checkAdminAuth(request)

        expect(result.isAdmin).toBe(false)
        expect(result.userId).toBeNull()
        expect(result.response).toBeDefined()
      })
    })

    describe('Authenticated Non-Admin Users', () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' }

      beforeEach(() => {
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
      })

      it('redirects to dashboard when profile not found', async () => {
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Profile not found' },
              }),
            }),
          }),
        })

        const request = createMockRequest('/admin')
        const result = await checkAdminAuth(request)

        expect(result.isAdmin).toBe(false)
        expect(result.userId).toBe('user-123')
        expect(result.response).toBeDefined()
        expect(result.response?.headers.get('location')).toContain('/dashboard')
      })

      it('redirects to dashboard with error when user is not admin', async () => {
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { is_admin: false },
                error: null,
              }),
            }),
          }),
        })

        const request = createMockRequest('/admin')
        const result = await checkAdminAuth(request)

        expect(result.isAdmin).toBe(false)
        expect(result.userId).toBe('user-123')
        expect(result.response).toBeDefined()
        const redirectUrl = result.response?.headers.get('location')
        expect(redirectUrl).toContain('/dashboard')
        expect(redirectUrl).toContain('error=unauthorized')
      })

      it('handles null is_admin field gracefully', async () => {
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { is_admin: null },
                error: null,
              }),
            }),
          }),
        })

        const request = createMockRequest('/admin')
        const result = await checkAdminAuth(request)

        expect(result.isAdmin).toBe(false)
        expect(result.response).toBeDefined()
      })
    })

    describe('Authenticated Admin Users', () => {
      const mockAdminUser = { id: 'admin-123', email: 'admin@example.com' }

      beforeEach(() => {
        mockGetUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        })
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
              }),
            }),
          }),
        })
      })

      it('allows access for admin users', async () => {
        const request = createMockRequest('/admin/dashboard')
        const result = await checkAdminAuth(request)

        expect(result.isAdmin).toBe(true)
        expect(result.userId).toBe('admin-123')
        expect(result.response).toBeUndefined()
      })

      it('does not return a redirect response', async () => {
        const request = createMockRequest('/admin/users')
        const result = await checkAdminAuth(request)

        expect(result.response).toBeUndefined()
      })
    })

    describe('Database Query', () => {
      it('queries the correct table and columns', async () => {
        const mockUser = { id: 'user-456', email: 'test@example.com' }
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null,
            }),
          }),
        })

        mockFrom.mockReturnValue({ select: mockSelect })

        const request = createMockRequest('/admin')
        await checkAdminAuth(request)

        expect(mockFrom).toHaveBeenCalledWith('profiles')
        expect(mockSelect).toHaveBeenCalledWith('is_admin')
      })

      it('filters by user ID', async () => {
        const mockUser = { id: 'user-789', email: 'test@example.com' }
        mockGetUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const mockEq = jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { is_admin: false },
            error: null,
          }),
        })

        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnValue({ eq: mockEq }),
        })

        const request = createMockRequest('/admin')
        await checkAdminAuth(request)

        expect(mockEq).toHaveBeenCalledWith('id', 'user-789')
      })
    })
  })

  describe('verifyAdminAPI', () => {
    beforeEach(() => {
      mockFrom.mockReset()
    })

    it('returns true for admin users', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null,
            }),
          }),
        }),
      })

      const result = await verifyAdminAPI('admin-user-id')

      expect(result).toBe(true)
    })

    it('returns false for non-admin users', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: false },
              error: null,
            }),
          }),
        }),
      })

      const result = await verifyAdminAPI('regular-user-id')

      expect(result).toBe(false)
    })

    it('returns false when profile not found', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const result = await verifyAdminAPI('unknown-user-id')

      expect(result).toBe(false)
    })

    it('returns false when is_admin is null', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: null },
              error: null,
            }),
          }),
        }),
      })

      const result = await verifyAdminAPI('user-with-null-admin')

      expect(result).toBe(false)
    })

    it('queries the profiles table with correct user ID', async () => {
      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { is_admin: true },
          error: null,
        }),
      })

      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })

      mockFrom.mockReturnValue({ select: mockSelect })

      await verifyAdminAPI('specific-user-id')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockSelect).toHaveBeenCalledWith('is_admin')
      expect(mockEq).toHaveBeenCalledWith('id', 'specific-user-id')
    })
  })

  describe('Cookie Handling', () => {
    it('uses getAll in Supabase cookie handler', async () => {
      // The cookies are accessed internally by Supabase when making auth calls
      // We verify this by checking the createServerClient was called with a cookie handler
      const { createServerClient } = require('@supabase/ssr')

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_admin: true },
              error: null,
            }),
          }),
        }),
      })

      const request = createMockRequest('/admin')
      await checkAdminAuth(request)

      // Verify createServerClient was called with proper config including cookie handlers
      expect(createServerClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
    })
  })
})
