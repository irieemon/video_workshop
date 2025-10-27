import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/auth/signout/route'
import { createMockRequest, createMockSupabaseClient } from '@/__tests__/helpers/api-route-test-helpers'

jest.mock('@/lib/supabase/server')

describe('/api/auth/signout', () => {
  const mockSupabaseClient = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/auth/signout', () => {
    it('signs out successfully and redirects to login', async () => {
      mockSupabaseClient.auth.signOut = jest.fn().mockResolvedValue({
        error: null,
      })

      const request = createMockRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      })

      const response = await POST(request)

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toContain('/login')
    })

    it('returns 500 when signout fails', async () => {
      mockSupabaseClient.auth.signOut = jest.fn().mockResolvedValue({
        error: { message: 'Signout failed' },
      })

      const request = createMockRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Signout failed')
    })
  })
})
