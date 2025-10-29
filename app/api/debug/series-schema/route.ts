import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Diagnostic endpoint to check series table schema and data state
 * Used to debug Phase 2 migration status in production
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const diagnostics: any = {
      user_id: user.id,
      timestamp: new Date().toISOString(),
      checks: {}
    }

    // Check 1: Does user_id column exist in series table?
    try {
      const { data: seriesWithUserId, error: userIdCheckError } = await supabase
        .from('series')
        .select('id, user_id, name')
        .limit(1)

      diagnostics.checks.user_id_column_exists = !userIdCheckError
      if (userIdCheckError) {
        diagnostics.checks.user_id_column_error = userIdCheckError.message
      }
    } catch (e: any) {
      diagnostics.checks.user_id_column_exists = false
      diagnostics.checks.user_id_column_error = e.message
    }

    // Check 2: Count total series
    const { count: totalSeries } = await supabase
      .from('series')
      .select('*', { count: 'exact', head: true })
    diagnostics.checks.total_series_count = totalSeries

    // Check 3: Count series with NULL user_id
    try {
      const { count: nullUserIdCount } = await supabase
        .from('series')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
      diagnostics.checks.series_with_null_user_id = nullUserIdCount
    } catch (e: any) {
      diagnostics.checks.series_with_null_user_id = 'N/A (column might not exist)'
    }

    // Check 4: Count series for current user (new way - direct user_id)
    try {
      const { count: userSeriesCount } = await supabase
        .from('series')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      diagnostics.checks.series_for_current_user_direct = userSeriesCount
    } catch (e: any) {
      diagnostics.checks.series_for_current_user_direct = `Error: ${e.message}`
    }

    // Check 5: Count series for current user (old way - through projects)
    try {
      // Get user's project IDs
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)

      const projectIds = projects?.map(p => p.id) || []

      if (projectIds.length > 0) {
        const { count: projectSeriesCount } = await supabase
          .from('series')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
        diagnostics.checks.series_for_current_user_via_projects = projectSeriesCount
      } else {
        diagnostics.checks.series_for_current_user_via_projects = 0
        diagnostics.checks.note = 'User has no projects'
      }
    } catch (e: any) {
      diagnostics.checks.series_for_current_user_via_projects = `Error: ${e.message}`
    }

    // Check 6: Sample series data (first 3)
    try {
      const { data: sampleSeries } = await supabase
        .from('series')
        .select('id, name, user_id, project_id, created_at')
        .limit(3)
        .order('created_at', { ascending: false })

      diagnostics.checks.sample_series = sampleSeries
    } catch (e: any) {
      diagnostics.checks.sample_series = `Error: ${e.message}`
    }

    // Diagnosis summary
    diagnostics.diagnosis = {
      migration_applied: diagnostics.checks.user_id_column_exists === true,
      data_populated: diagnostics.checks.series_with_null_user_id === 0,
      recommended_action: ''
    }

    if (!diagnostics.diagnosis.migration_applied) {
      diagnostics.diagnosis.recommended_action = 'Run Phase 2 migration: supabase-migrations/resume-decouple-migration.sql'
    } else if (!diagnostics.diagnosis.data_populated) {
      diagnostics.diagnosis.recommended_action = 'Run migration to populate user_id values from existing project relationships'
    } else {
      diagnostics.diagnosis.recommended_action = 'Schema is up to date. Check if user has any series created.'
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error: any) {
    console.error('Schema diagnostic error:', error)
    return NextResponse.json(
      {
        error: 'Diagnostic check failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
