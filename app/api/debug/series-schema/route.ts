import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Diagnostic endpoint to check series table schema and data state
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

    // Check 4: Count series for current user
    try {
      const { count: userSeriesCount } = await supabase
        .from('series')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      diagnostics.checks.series_for_current_user = userSeriesCount
    } catch (e: any) {
      diagnostics.checks.series_for_current_user = `Error: ${e.message}`
    }

    // Check 5: Sample series data (first 3)
    try {
      const { data: sampleSeries } = await supabase
        .from('series')
        .select('id, name, user_id, created_at')
        .limit(3)
        .order('created_at', { ascending: false })

      diagnostics.checks.sample_series = sampleSeries
    } catch (e: any) {
      diagnostics.checks.sample_series = `Error: ${e.message}`
    }

    // Diagnosis summary
    diagnostics.diagnosis = {
      schema_valid: diagnostics.checks.user_id_column_exists === true,
      data_populated: diagnostics.checks.series_with_null_user_id === 0,
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
