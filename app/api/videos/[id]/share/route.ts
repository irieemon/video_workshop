import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

/**
 * POST /api/videos/[id]/share
 * Generates a shareable link for a video prompt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Fetch video to verify ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, share_token, is_public, optimized_prompt')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (!video.optimized_prompt) {
      return NextResponse.json(
        { error: 'Cannot share video without an optimized prompt' },
        { status: 400 }
      )
    }

    // If share token already exists, return existing URL
    if (video.share_token && video.is_public) {
      const shareUrl = `${getBaseUrl()}/share/${video.share_token}`
      return NextResponse.json({
        shareUrl,
        shareToken: video.share_token,
        isNew: false,
      })
    }

    // Generate new share token (12 char alphanumeric)
    const shareToken = nanoid(12)

    // Update video with share token
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        share_token: shareToken,
        is_public: true,
        shared_at: new Date().toISOString(),
      })
      .eq('id', videoId)

    if (updateError) {
      console.error('Failed to generate share link:', updateError)
      return NextResponse.json(
        { error: 'Failed to generate share link' },
        { status: 500 }
      )
    }

    const shareUrl = `${getBaseUrl()}/share/${shareToken}`

    return NextResponse.json({
      shareUrl,
      shareToken,
      isNew: true,
    })
  } catch (error: any) {
    console.error('Share video error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/videos/[id]/share
 * Removes the shareable link (makes video private again)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Update video to remove sharing
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        share_token: null,
        is_public: false,
        shared_at: null,
      })
      .eq('id', videoId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to remove share link:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove share link' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unshare video error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/videos/[id]/share
 * Gets the current share status of a video
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: videoId } = await params

    const { data: video, error } = await supabase
      .from('videos')
      .select('share_token, is_public, shared_at')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json({
      isPublic: video.is_public,
      shareToken: video.share_token,
      shareUrl: video.share_token
        ? `${getBaseUrl()}/share/${video.share_token}`
        : null,
      sharedAt: video.shared_at,
    })
  } catch (error: any) {
    console.error('Get share status error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get base URL for share links
 */
function getBaseUrl(): string {
  // In production, use the actual domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  // In development
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
