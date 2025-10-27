/**
 * Admin authentication middleware
 * Checks if the authenticated user has admin privileges
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function checkAdminAuth(request: NextRequest): Promise<{
  isAdmin: boolean
  userId: string | null
  response?: NextResponse
}> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    // Not authenticated - redirect to login
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)

    return {
      isAdmin: false,
      userId: null,
      response: NextResponse.redirect(redirectUrl),
    }
  }

  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // Profile not found - redirect to dashboard
    return {
      isAdmin: false,
      userId: user.id,
      response: NextResponse.redirect(new URL('/dashboard', request.url)),
    }
  }

  const isAdmin = profile.is_admin || false

  if (!isAdmin) {
    // Not admin - redirect to dashboard with error
    const dashboardUrl = new URL('/dashboard', request.url)
    dashboardUrl.searchParams.set('error', 'unauthorized')

    return {
      isAdmin: false,
      userId: user.id,
      response: NextResponse.redirect(dashboardUrl),
    }
  }

  // User is admin - allow access
  return {
    isAdmin: true,
    userId: user.id,
  }
}

/**
 * Verify admin status for API routes
 * Returns user ID if admin, throws error otherwise
 */
export async function verifyAdminAPI(userId: string): Promise<boolean> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in API routes
          }
        },
      },
    }
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  return profile?.is_admin || false
}
