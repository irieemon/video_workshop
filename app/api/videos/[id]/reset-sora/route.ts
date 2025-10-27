import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/videos/[id]/reset-sora
 * Manually reset a stuck Sora generation to allow retry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Fetch video with ownership verification
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id, sora_generation_status, sora_started_at')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Verify ownership
    if (video.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow reset for queued, in_progress, or failed statuses
    if (video.sora_generation_status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot reset completed generation' },
        { status: 400 }
      )
    }

    // Reset the Sora generation fields
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        sora_generation_status: null,
        sora_job_id: null,
        sora_started_at: null,
        sora_error_message: null,
      })
      .eq('id', videoId)

    if (updateError) {
      console.error('Failed to reset Sora generation:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset generation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sora generation reset successfully. You can now retry.',
    })
  } catch (error: any) {
    console.error('Reset Sora error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
