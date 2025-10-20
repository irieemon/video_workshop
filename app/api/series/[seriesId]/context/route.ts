import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/series/[seriesId]/context - Get series with characters and settings for video creation
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

    // Fetch series with characters, settings, and visual assets
    const { data: series, error } = await supabase
      .from('series')
      .select(
        `
        *,
        project:projects!inner(id, user_id),
        characters:series_characters(*),
        settings:series_settings(*),
        visual_assets:series_visual_assets(*)
      `
      )
      .eq('id', seriesId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw error
    }

    // Verify ownership
    if (series.project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(series)
  } catch (error: any) {
    console.error('Series context fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch series context' },
      { status: 500 }
    )
  }
}
