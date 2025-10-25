import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/projects/[id]/series/associate - Associate existing series with project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      throw projectError
    }

    // Parse request body
    const body = await request.json()
    const { series_id } = body

    if (!series_id) {
      return NextResponse.json(
        { error: 'Series ID is required' },
        { status: 400 }
      )
    }

    // Verify series ownership
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, name')
      .eq('id', series_id)
      .eq('user_id', user.id)
      .single()

    if (seriesError) {
      if (seriesError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }
      throw seriesError
    }

    // Check if association already exists
    const { data: existingAssociation } = await supabase
      .from('project_series')
      .select('id')
      .eq('project_id', projectId)
      .eq('series_id', series_id)
      .single()

    if (existingAssociation) {
      return NextResponse.json(
        { error: 'Series is already associated with this project' },
        { status: 409 }
      )
    }

    // Create association
    const { data: association, error: associationError } = await supabase
      .from('project_series')
      .insert({
        project_id: projectId,
        series_id: series_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (associationError) throw associationError

    return NextResponse.json(
      { message: 'Series associated successfully', association },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Series association error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to associate series' },
      { status: 500 }
    )
  }
}
