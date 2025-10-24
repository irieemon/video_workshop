import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch video with project, series, and hashtags
    const { data: video, error } = await supabase
      .from('videos')
      .select(
        `
        *,
        project:projects(*),
        series:series!videos_series_id_fkey(*),
        hashtags:hashtags(tag)
      `
      )
      .eq('id', id)
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Transform hashtags from array of objects to array of strings
    const transformedVideo = {
      ...video,
      hashtags: video.hashtags?.map((h: any) => h.tag) || [],
    }

    return NextResponse.json(transformedVideo)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title } = body

    // Update video
    const { data: video, error } = await supabase
      .from('videos')
      .update({ title })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Failed to update video' }, { status: 500 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to decrement counter
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Delete video
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
    }

    // Decrement video counter
    if (profile) {
      await supabase
        .from('profiles')
        .update({
          usage_current: {
            ...profile.usage_current,
            videos_this_month: Math.max((profile.usage_current?.videos_this_month || 1) - 1, 0),
          },
        })
        .eq('id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
