import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAPILogger, LOG_MESSAGES } from '@/lib/logger'

/**
 * GET /api/admin/users
 * List all users with their usage statistics
 * Admin only
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/admin/users', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    logger.warn('Non-admin attempted to access admin API', { userId: user.id })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || ''
    const adminOnly = searchParams.get('adminOnly') === 'true'

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    if (tier) {
      query = query.eq('subscription_tier', tier)
    }

    if (adminOnly) {
      query = query.eq('is_admin', true)
    }

    const { data: users, error, count } = await query

    if (error) {
      logger.error('Failed to fetch users', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    logger.info('Admin fetched user list', {
      count: users?.length,
      total: count,
      filters: { search, tier, adminOnly },
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users
 * Update user admin status or subscription tier
 * Admin only
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/admin/users', user?.id)

  if (authError || !user) {
    logger.warn(LOG_MESSAGES.AUTH_UNAUTHORIZED)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    logger.warn('Non-admin attempted to modify user', { userId: user.id })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Prevent self-demotion from admin
    if (userId === user.id && updates.is_admin === false) {
      return NextResponse.json(
        { error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      )
    }

    // Check if revoking admin would leave no admins
    if (updates.is_admin === false) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true)

      if (count && count <= 1) {
        return NextResponse.json(
          { error: 'Cannot revoke last admin. At least one admin must remain.' },
          { status: 400 }
        )
      }
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update user', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    logger.info('Admin updated user', {
      targetUserId: userId,
      updates,
      adminId: user.id,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
