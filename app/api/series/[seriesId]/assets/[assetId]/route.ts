import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/series/[seriesId]/assets/[assetId] - Delete a visual asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; assetId: string }> }
) {
  try {
    const { seriesId, assetId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify series ownership and get asset
    const { data: asset, error: assetError } = await supabase
      .from('series_visual_assets')
      .select('*, series:series!inner(id, project:projects!inner(id, user_id))')
      .eq('id', assetId)
      .eq('series_id', seriesId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (asset.series.project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('series-assets')
      .remove([asset.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error } = await supabase
      .from('series_visual_assets')
      .delete()
      .eq('id', assetId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Asset delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset' },
      { status: 500 }
    )
  }
}

// PATCH /api/series/[seriesId]/assets/[assetId] - Update asset metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; assetId: string }> }
) {
  try {
    const { seriesId, assetId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify series ownership
    const { data: asset, error: assetError } = await supabase
      .from('series_visual_assets')
      .select('*, series:series!inner(id, project:projects!inner(id, user_id))')
      .eq('id', assetId)
      .eq('series_id', seriesId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (asset.series.project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, description, assetType } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (assetType !== undefined) updates.asset_type = assetType

    // Update asset
    const { data: updatedAsset, error } = await supabase
      .from('series_visual_assets')
      .update(updates)
      .eq('id', assetId)
      .select()
      .single()

    if (error) throw error

    // Generate signed URL
    const { data: urlData } = await supabase.storage
      .from('series-assets')
      .createSignedUrl(updatedAsset.storage_path, 3600)

    return NextResponse.json({
      ...updatedAsset,
      url: urlData?.signedUrl || null,
    })
  } catch (error: any) {
    console.error('Asset update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update asset' },
      { status: 500 }
    )
  }
}
