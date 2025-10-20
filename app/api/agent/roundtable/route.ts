import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { brief, platform, seriesId, projectId, selectedCharacters, selectedSettings } = body

    // Validate required fields
    if (!brief || !platform || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: brief, platform, projectId' },
        { status: 400 }
      )
    }

    // Fetch series context if applicable
    let visualTemplate = null
    let seriesCharacters = null
    let seriesSettings = null
    let visualAssets = null

    if (seriesId) {
      const { data: series } = await supabase
        .from('series')
        .select('visual_template')
        .eq('id', seriesId)
        .single()
      visualTemplate = series?.visual_template

      // Fetch selected characters
      if (selectedCharacters && selectedCharacters.length > 0) {
        const { data: characters } = await supabase
          .from('series_characters')
          .select('*')
          .in('id', selectedCharacters)
        seriesCharacters = characters
      }

      // Fetch selected settings
      if (selectedSettings && selectedSettings.length > 0) {
        const { data: settings } = await supabase
          .from('series_settings')
          .select('*')
          .in('id', selectedSettings)
        seriesSettings = settings
      }

      // Fetch all visual assets for this series
      const { data: assets } = await supabase
        .from('series_visual_assets')
        .select('*')
        .eq('series_id', seriesId)
        .order('display_order', { ascending: true })
      visualAssets = assets
    }

    // Run agent roundtable (orchestration logic)
    const result = await runAgentRoundtable({
      brief,
      platform,
      visualTemplate: visualTemplate || undefined,
      seriesCharacters: seriesCharacters || undefined,
      seriesSettings: seriesSettings || undefined,
      visualAssets: visualAssets || undefined,
      userId: user.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Roundtable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
