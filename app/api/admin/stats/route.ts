import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createAPILogger, LOG_MESSAGES } from '@/lib/logger'

/**
 * GET /api/admin/stats
 * Get system statistics and health metrics
 * Admin only
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const logger = createAPILogger('/api/admin/stats', user?.id)

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
    logger.warn('Non-admin attempted to access stats API', { userId: user.id })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get admin count
    const { count: totalAdmins } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true)

    // Get free vs premium users
    const { count: freeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'free')

    const { count: premiumUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'premium')

    // Get total videos
    const { count: totalVideos } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })

    // Get total projects
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    // Get total series
    const { count: totalSeries } = await supabase
      .from('series')
      .select('*', { count: 'exact', head: true })

    // Get videos created this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: videosThisMonth } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Get videos created today
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count: videosToday } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())

    // Get active users (created video in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeUsersData } = await supabase
      .from('videos')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const activeUsers30d = activeUsersData
      ? new Set(activeUsersData.map((v) => v.user_id)).size
      : 0

    // Get active users (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: activeUsers7dData } = await supabase
      .from('videos')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString())

    const activeUsers7d = activeUsers7dData
      ? new Set(activeUsers7dData.map((v) => v.user_id)).size
      : 0

    // Calculate average videos per user
    const avgVideosPerUser =
      totalUsers && totalUsers > 0 ? (totalVideos || 0) / totalUsers : 0

    // Get Sora generation stats
    const { count: totalSoraGenerations } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .not('sora_video_id', 'is', null)

    const { count: successfulSoraGenerations } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('sora_status', 'completed')

    const soraSuccessRate =
      totalSoraGenerations && totalSoraGenerations > 0
        ? (successfulSoraGenerations || 0) / totalSoraGenerations
        : 0

    const stats = {
      total_users: totalUsers || 0,
      total_admins: totalAdmins || 0,
      total_videos: totalVideos || 0,
      total_projects: totalProjects || 0,
      total_series: totalSeries || 0,
      videos_this_month: videosThisMonth || 0,
      videos_today: videosToday || 0,
      active_users_30d: activeUsers30d,
      active_users_7d: activeUsers7d,
      free_tier_users: freeUsers || 0,
      premium_users: premiumUsers || 0,
      avg_videos_per_user: Math.round(avgVideosPerUser * 100) / 100,
      total_sora_generations: totalSoraGenerations || 0,
      sora_success_rate: Math.round(soraSuccessRate * 10000) / 100, // Percentage with 2 decimals
    }

    logger.info('Admin fetched system stats')

    return NextResponse.json(stats)
  } catch (error) {
    logger.error(LOG_MESSAGES.API_REQUEST_ERROR, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
