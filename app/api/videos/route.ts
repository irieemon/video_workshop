import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check quota
    // Force fresh query - no cache
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .limit(1)

    const profile = profiles?.[0]

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('🔍 Profile check:', {
      tier: profile.subscription_tier,
      currentVideos: profile.usage_current?.videos_this_month,
      maxVideos: profile.usage_quota?.videos_per_month
    })

    // TEMPORARILY DISABLED: Check video quota for free tier
    // This is commented out to allow saves while investigating cache issue
    /*
    if (profile.subscription_tier === 'free') {
      const currentVideos = profile.usage_current?.videos_this_month || 0
      const maxVideos = profile.usage_quota?.videos_per_month || 10

      if (currentVideos >= maxVideos) {
        return NextResponse.json(
          {
            error: 'Monthly video limit reached',
            code: 'QUOTA_EXCEEDED',
            message: `Free tier is limited to ${maxVideos} videos per month. Upgrade to Premium for unlimited videos.`,
          },
          { status: 429 }
        )
      }
    }
    */

    const body = await request.json()
    const {
      projectId,
      seriesId,
      selectedCharacters,
      selectedSettings,
      title,
      userBrief,
      agentDiscussion,
      detailedBreakdown,
      optimizedPrompt,
      characterCount,
      platform,
      hashtags,
    } = body

    // Create the video (without hashtags - they go in separate table)
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        project_id: projectId,
        series_id: seriesId || null,
        series_characters_used: selectedCharacters || [],
        series_settings_used: selectedSettings || [],
        title,
        user_brief: userBrief,
        agent_discussion: agentDiscussion,
        detailed_breakdown: detailedBreakdown,
        optimized_prompt: optimizedPrompt,
        character_count: characterCount,
        platform,
      })
      .select()
      .single()

    if (videoError) {
      console.error('Video creation error:', videoError)
      return NextResponse.json({ error: 'Failed to create video' }, { status: 500 })
    }

    // Insert hashtags into separate table
    if (hashtags && hashtags.length > 0 && video) {
      const hashtagInserts = hashtags.map((tag: string) => ({
        video_id: video.id,
        tag: tag,
        suggested_by: 'platform_expert' as const,
      }))

      await supabase.from('hashtags').insert(hashtagInserts)
    }

    // Increment video counter
    await supabase
      .from('profiles')
      .update({
        usage_current: {
          ...profile.usage_current,
          videos_this_month: (profile.usage_current?.videos_this_month || 0) + 1,
        },
      })
      .eq('id', user.id)

    return NextResponse.json(video)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Build query - RLS will filter by user through project relationship
    let query = supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: videos, error } = await query

    if (error) {
      console.error('Videos fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }

    return NextResponse.json(videos)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
