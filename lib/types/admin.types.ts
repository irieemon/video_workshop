/**
 * Admin Dashboard Types
 * Type definitions for admin-specific features and data structures
 */

/**
 * User summary with usage statistics for admin dashboard
 */
export interface AdminUserSummary {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  subscription_tier: 'free' | 'premium'
  is_admin: boolean
  created_at: string
  updated_at: string
  usage_current: {
    projects: number
    videos_this_month: number
    consultations_this_month: number
  }
  usage_quota: {
    projects: number
    videos_per_month: number
    consultations_per_month: number
  }
}

/**
 * System-wide statistics for admin dashboard
 */
export interface SystemStats {
  total_users: number
  total_admins: number
  total_videos: number
  total_projects: number
  total_series: number
  videos_this_month: number
  videos_today: number
  active_users_30d: number
  active_users_7d: number
  free_tier_users: number
  premium_users: number
  avg_videos_per_user: number
  total_sora_generations: number
  sora_success_rate: number
}

/**
 * User activity summary for admin monitoring
 */
export interface UserActivity {
  user_id: string
  email: string
  full_name: string | null
  last_login: string | null
  videos_created: number
  projects_created: number
  series_created: number
  last_video_created: string | null
  is_active: boolean
}

/**
 * Video generation metrics for admin analytics
 */
export interface VideoGenerationMetrics {
  total_generations: number
  successful_generations: number
  failed_generations: number
  pending_generations: number
  avg_generation_time_seconds: number
  success_rate: number
  generations_by_day: Array<{
    date: string
    count: number
    success_count: number
    fail_count: number
  }>
}

/**
 * Usage quota summary for monitoring
 */
export interface QuotaUsageSummary {
  tier: 'free' | 'premium'
  user_count: number
  avg_usage_percentage: number
  users_at_limit: number
  users_near_limit: number // >80% of quota
  total_quota_videos: number
  total_used_videos: number
}

/**
 * Admin action log entry for audit trail
 */
export interface AdminActionLog {
  id: string
  admin_id: string
  admin_email: string
  action_type: 'promote_admin' | 'revoke_admin' | 'update_user' | 'delete_user' | 'reset_quota'
  target_user_id: string | null
  target_user_email: string | null
  details: Record<string, unknown>
  timestamp: string
  ip_address: string | null
}

/**
 * System health metrics for monitoring
 */
export interface SystemHealth {
  database_status: 'healthy' | 'degraded' | 'down'
  api_response_time_ms: number
  error_rate_percentage: number
  active_sessions: number
  storage_used_gb: number
  storage_limit_gb: number
  last_backup: string | null
  uptime_percentage_30d: number
}

/**
 * Rate limit status for a specific user
 */
export interface UserRateLimitStatus {
  user_id: string
  email: string
  is_admin: boolean
  video_creation_limit: number
  video_creation_remaining: number
  ai_roundtable_limit: number
  ai_roundtable_remaining: number
  reset_time: string
  is_rate_limited: boolean
}

/**
 * Bulk user operation result
 */
export interface BulkUserOperationResult {
  success_count: number
  failure_count: number
  errors: Array<{
    user_id: string
    email: string
    error: string
  }>
}
