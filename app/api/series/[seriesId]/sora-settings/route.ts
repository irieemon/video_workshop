import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const body = await request.json()
    const {
      sora_camera_style,
      sora_lighting_mood,
      sora_color_palette,
      sora_overall_tone,
      sora_narrative_prefix,
    } = body

    // Verify series belongs to user's project
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('project_id, projects!inner(user_id)')
      .eq('id', seriesId)
      .single()

    if (seriesError || !series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    // Type assertion for nested relation
    const projectData = series.projects as unknown as { user_id: string }
    if (projectData.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update Sora settings
    const { data: updatedSeries, error: updateError } = await supabase
      .from('series')
      .update({
        sora_camera_style: sora_camera_style || null,
        sora_lighting_mood: sora_lighting_mood || null,
        sora_color_palette: sora_color_palette || null,
        sora_overall_tone: sora_overall_tone || null,
        sora_narrative_prefix: sora_narrative_prefix || null,
      })
      .eq('id', seriesId)
      .select('sora_camera_style, sora_lighting_mood, sora_color_palette, sora_overall_tone, sora_narrative_prefix')
      .single()

    if (updateError) {
      console.error('Sora settings update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update Sora settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedSeries)
  } catch (error) {
    console.error('Sora settings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
