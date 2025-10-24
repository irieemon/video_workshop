import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/settings - List all settings in a series
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify series ownership
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found or access denied' }, { status: 404 })
      }
      throw seriesError
    }

    // Fetch settings
    const { data: settings, error } = await supabase
      .from('series_settings')
      .select('*')
      .eq('series_id', seriesId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST /api/series/[seriesId]/settings - Create a new setting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify series ownership
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, user_id')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found or access denied' }, { status: 404 })
      }
      throw seriesError
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      environment_type,
      time_of_day,
      atmosphere,
      details,
      introduced_episode_id,
      is_primary
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Setting name is required' },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Setting description is required' },
        { status: 400 }
      )
    }

    // Check for duplicate setting name in series
    const { data: existingSetting } = await supabase
      .from('series_settings')
      .select('id')
      .eq('series_id', seriesId)
      .eq('name', name.trim())
      .single()

    if (existingSetting) {
      return NextResponse.json(
        { error: 'A setting with this name already exists in this series' },
        { status: 409 }
      )
    }

    // Validate environment_type if provided
    const validEnvironmentTypes = ['interior', 'exterior', 'mixed', 'other']
    if (environment_type && !validEnvironmentTypes.includes(environment_type)) {
      return NextResponse.json(
        { error: `Invalid environment_type. Must be one of: ${validEnvironmentTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create setting
    const { data: setting, error } = await supabase
      .from('series_settings')
      .insert({
        series_id: seriesId,
        name: name.trim(),
        description: description.trim(),
        environment_type: environment_type || null,
        time_of_day: time_of_day?.trim() || null,
        atmosphere: atmosphere?.trim() || null,
        details: details || {},
        introduced_episode_id: introduced_episode_id || null,
        is_primary: is_primary !== undefined ? is_primary : false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(setting, { status: 201 })
  } catch (error: any) {
    console.error('Setting creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create setting' },
      { status: 500 }
    )
  }
}
