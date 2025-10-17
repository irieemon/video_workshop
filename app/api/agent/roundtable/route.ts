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
    const { brief, platform, seriesId, projectId } = body

    // Validate required fields
    if (!brief || !platform || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: brief, platform, projectId' },
        { status: 400 }
      )
    }

    // Fetch series template if applicable
    let visualTemplate = null
    if (seriesId) {
      const { data: series } = await supabase
        .from('series')
        .select('visual_template')
        .eq('id', seriesId)
        .single()
      visualTemplate = series?.visual_template
    }

    // Run agent roundtable (orchestration logic)
    const result = await runAgentRoundtable({
      brief,
      platform,
      visualTemplate: visualTemplate || undefined,
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
