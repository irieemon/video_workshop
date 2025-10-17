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

    // Check usage quota (freemium tier)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, usage_quota, usage_current')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.subscription_tier === 'free') {
      if (
        profile.usage_current.consultations_this_month >=
        profile.usage_quota.consultations_per_month
      ) {
        return NextResponse.json(
          {
            error: 'Monthly consultation limit reached. Upgrade to Premium for unlimited access.',
            code: 'QUOTA_EXCEEDED',
          },
          { status: 429 }
        )
      }
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

    // Increment usage counter
    await supabase.rpc('increment_consultation_usage', { user_id: user.id })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Roundtable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
