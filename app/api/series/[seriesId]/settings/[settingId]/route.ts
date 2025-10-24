import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/settings/[settingId] - Get specific setting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; settingId: string }> }
) {
  try {
    const { seriesId, settingId } = await params
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

    // Fetch setting
    const { data: setting, error } = await supabase
      .from('series_settings')
      .select('*')
      .eq('id', settingId)
      .eq('series_id', seriesId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(setting)
  } catch (error: any) {
    console.error('Setting fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch setting' },
      { status: 500 }
    )
  }
}

// PATCH /api/series/[seriesId]/settings/[settingId] - Update setting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; settingId: string }> }
) {
  try {
    const { seriesId, settingId } = await params
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

    // Validate environment_type if provided
    const validEnvironmentTypes = ['interior', 'exterior', 'mixed', 'other']
    if (environment_type && !validEnvironmentTypes.includes(environment_type)) {
      return NextResponse.json(
        { error: `Invalid environment_type. Must be one of: ${validEnvironmentTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Setting name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) {
      if (!description || description.trim().length === 0) {
        return NextResponse.json(
          { error: 'Setting description cannot be empty' },
          { status: 400 }
        )
      }
      updateData.description = description.trim()
    }
    if (environment_type !== undefined) updateData.environment_type = environment_type
    if (time_of_day !== undefined) updateData.time_of_day = time_of_day?.trim() || null
    if (atmosphere !== undefined) updateData.atmosphere = atmosphere?.trim() || null
    if (details !== undefined) updateData.details = details
    if (introduced_episode_id !== undefined) updateData.introduced_episode_id = introduced_episode_id
    if (is_primary !== undefined) updateData.is_primary = is_primary

    // Update setting
    const { data: updatedSetting, error } = await supabase
      .from('series_settings')
      .update(updateData)
      .eq('id', settingId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updatedSetting)
  } catch (error: any) {
    console.error('Setting update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update setting' },
      { status: 500 }
    )
  }
}

// DELETE /api/series/[seriesId]/settings/[settingId] - Delete setting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; settingId: string }> }
) {
  try {
    const { seriesId, settingId } = await params
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

    // Delete setting
    const { error } = await supabase
      .from('series_settings')
      .delete()
      .eq('id', settingId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Setting deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete setting' },
      { status: 500 }
    )
  }
}
