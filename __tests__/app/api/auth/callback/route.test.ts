jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/auth/callback/route'
import { NextRequest } from 'next/server'

describe('/api/auth/callback', () => {
  const mockSupabaseClient = {
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('GET /api/auth/callback', () => {
    it('redirects to dashboard when no code provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/callback')
      const response = await GET(request)

      expect(response.status).toBe(307) // NextResponse.redirect uses 307
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('exchanges code for session and redirects to dashboard on success', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=auth-code-123'
      )
      const response = await GET(request)

      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth-code-123')
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('redirects to login with error message on OAuth failure', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid code' },
      })

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=invalid-code'
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/login?error=Invalid%20code'
      )
    })

    it('uses correct origin from request URL', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      })

      const request = new NextRequest(
        'https://myapp.example.com/api/auth/callback?code=auth-code'
      )
      const response = await GET(request)

      expect(response.headers.get('location')).toBe('https://myapp.example.com/dashboard')
    })

    it('handles expired OAuth codes gracefully', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'OAuth code has expired' },
      })

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=expired-code'
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=OAuth%20code%20has%20expired')
    })
  })
})
