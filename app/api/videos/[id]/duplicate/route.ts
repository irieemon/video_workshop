import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
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

    // Fetch the original video
    const { data: originalVideo, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalVideo) {
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: 404 }
      )
    }

    // Create duplicated video with reset generated content
    const { data: duplicatedVideo, error: createError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        series_id: originalVideo.series_id,
        project_id: originalVideo.project_id,
        title: `(Copy) ${originalVideo.title}`,
        user_brief: originalVideo.user_brief,
        platform: originalVideo.platform,
        status: 'draft', // Reset status to draft
        // Reset all generated content
        agent_discussion: null,
        optimized_prompt: null,
        detailed_breakdown: null,
        character_count: null,
        sora_video_url: null,
        sora_generation_status: null,
        sora_generation_id: null,
        sora_error_message: null,
        sora_generation_cost: null,
        sora_completed_at: null,
        // Keep series context selections if they existed
        series_characters_used: originalVideo.series_characters_used,
        series_settings_used: originalVideo.series_settings_used,
      })
      .select()
      .single()

    if (createError || !duplicatedVideo) {
      console.error('Video duplication error:', createError)
      return NextResponse.json(
        { error: 'Failed to duplicate video' },
        { status: 500 }
      )
    }

    return NextResponse.json(duplicatedVideo)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
