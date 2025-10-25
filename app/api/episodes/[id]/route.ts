import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/episodes/[id]
 * Get a single episode by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // RLS policies handle user filtering automatically
    const { data: episode, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ episode })
  } catch (error: any) {
    console.error('Get episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/episodes/[id]
 * Update an episode
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      logline,
      screenplay_text,
      structured_screenplay,
      status,
      current_session_id,
    } = body

    // Build update object with only provided fields
    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (logline !== undefined) updates.logline = logline
    if (screenplay_text !== undefined) updates.screenplay_text = screenplay_text
    if (structured_screenplay !== undefined) updates.structured_screenplay = structured_screenplay
    if (status !== undefined) updates.status = status
    if (current_session_id !== undefined) updates.current_session_id = current_session_id

    // RLS policies handle user filtering automatically
    const { data: episode, error } = await supabase
      .from('episodes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !episode) {
      console.error('Failed to update episode:', error)
      return NextResponse.json(
        { error: 'Failed to update episode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ episode })
  } catch (error: any) {
    console.error('Update episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/episodes/[id]
 * Delete an episode
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // RLS policies handle user filtering automatically
    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete episode:', error)
      return NextResponse.json(
        { error: 'Failed to delete episode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete episode error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
