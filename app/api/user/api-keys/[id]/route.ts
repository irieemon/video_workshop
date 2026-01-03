import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptApiKey } from '@/lib/encryption/api-key-encryption'

/**
 * DELETE /api/user/api-keys/[id]
 * Delete an API key
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the key belongs to the user before deleting
    const { data: existingKey } = await supabase
      .from('user_api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting API key:', error)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/user/api-keys/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/user/api-keys/[id]
 * Update an API key (name, or replace the key itself)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key_name } = body

    // Verify the key belongs to the user
    const { data: existingKey } = await supabase
      .from('user_api_keys')
      .select('id, provider')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}

    if (key_name) {
      // Check if the new name conflicts with existing key
      const { data: nameConflict } = await supabase
        .from('user_api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', existingKey.provider)
        .eq('key_name', key_name)
        .neq('id', id)
        .single()

      if (nameConflict) {
        return NextResponse.json(
          { error: `You already have a key named "${key_name}" for this provider.` },
          { status: 409 }
        )
      }

      updateData.key_name = key_name
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updatedKey, error } = await supabase
      .from('user_api_keys')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, provider, key_suffix, key_name, is_valid, created_at')
      .single()

    if (error) {
      console.error('Error updating API key:', error)
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
    }

    return NextResponse.json({ key: updatedKey })
  } catch (error) {
    console.error('Error in PATCH /api/user/api-keys/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
