import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/visual-style - Get series visual style
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

    // Fetch visual style with ownership verification
    const { data: visualStyle, error } = await supabase
      .from('series_visual_style')
      .select(
        `
        *,
        series:series!inner(
          id,
          project:projects!inner(id, user_id)
        )
      `
      )
      .eq('series_id', seriesId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Visual style not found' }, { status: 404 })
      }
      throw error
    }

    const seriesData = Array.isArray(visualStyle.series) ? visualStyle.series[0] : visualStyle.series
    const project = Array.isArray(seriesData.project) ? seriesData.project[0] : seriesData.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove series from response
    const { series, ...visualStyleData } = visualStyle
    return NextResponse.json(visualStyleData)
  } catch (error: any) {
    console.error('Visual style fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch visual style' },
      { status: 500 }
    )
  }
}

// PATCH /api/series/[seriesId]/visual-style - Update series visual style
export async function PATCH(
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

    // Verify ownership
    const { data: visualStyle, error: styleError } = await supabase
      .from('series_visual_style')
      .select(
        `
        id,
        series:series!inner(
          id,
          project:projects!inner(id, user_id)
        )
      `
      )
      .eq('series_id', seriesId)
      .single()

    if (styleError) {
      if (styleError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Visual style not found' }, { status: 404 })
      }
      throw styleError
    }

    const seriesData = Array.isArray(visualStyle.series) ? visualStyle.series[0] : visualStyle.series
    const project = Array.isArray(seriesData.project) ? seriesData.project[0] : seriesData.project
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      cinematography,
      lighting,
      color_palette,
      composition_rules,
      audio_style,
      default_platform
    } = body

    // Validate default_platform if provided
    const validPlatforms = ['tiktok', 'instagram', 'youtube-shorts', 'both']
    if (default_platform && !validPlatforms.includes(default_platform)) {
      return NextResponse.json(
        { error: `Invalid default_platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (cinematography !== undefined) updateData.cinematography = cinematography
    if (lighting !== undefined) updateData.lighting = lighting
    if (color_palette !== undefined) updateData.color_palette = color_palette
    if (composition_rules !== undefined) updateData.composition_rules = composition_rules
    if (audio_style !== undefined) updateData.audio_style = audio_style
    if (default_platform !== undefined) updateData.default_platform = default_platform

    // Update visual style
    const { data: updatedVisualStyle, error } = await supabase
      .from('series_visual_style')
      .update(updateData)
      .eq('series_id', seriesId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updatedVisualStyle)
  } catch (error: any) {
    console.error('Visual style update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update visual style' },
      { status: 500 }
    )
  }
}
