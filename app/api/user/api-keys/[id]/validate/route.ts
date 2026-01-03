import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptApiKey } from '@/lib/encryption/api-key-encryption'
import OpenAI from 'openai'

/**
 * POST /api/user/api-keys/[id]/validate
 * Validate an API key by making a test request to the provider
 */
export async function POST(
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

    // Fetch the encrypted key
    const { data: keyRecord } = await supabase
      .from('user_api_keys')
      .select('id, encrypted_key, provider')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!keyRecord) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Decrypt the key
    let apiKey: string
    try {
      apiKey = decryptApiKey(keyRecord.encrypted_key)
    } catch (error) {
      // Key cannot be decrypted - encryption secret may have changed
      await supabase
        .from('user_api_keys')
        .update({
          is_valid: false,
          validation_error: 'Unable to decrypt key. Please re-add the key.',
          last_validated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return NextResponse.json(
        { valid: false, error: 'Unable to decrypt key. Please delete and re-add the key.' },
        { status: 400 }
      )
    }

    // Validate based on provider
    let isValid = false
    let validationError: string | null = null

    switch (keyRecord.provider) {
      case 'openai':
        try {
          const openai = new OpenAI({ apiKey })
          // Make a minimal API call to test the key
          await openai.models.list()
          isValid = true
        } catch (error: any) {
          isValid = false
          if (error?.status === 401) {
            validationError = 'Invalid API key'
          } else if (error?.status === 429) {
            // Rate limited but key is valid
            isValid = true
          } else {
            validationError = error?.message || 'Failed to validate key'
          }
        }
        break

      case 'anthropic':
        // For Anthropic, we could make a test call to their API
        // For now, just validate the format
        isValid = apiKey.startsWith('sk-ant-')
        if (!isValid) {
          validationError = 'Invalid Anthropic API key format'
        }
        break

      default:
        // For other providers, assume format is valid if we got this far
        isValid = true
    }

    // Update the key record with validation result
    await supabase
      .from('user_api_keys')
      .update({
        is_valid: isValid,
        validation_error: validationError,
        last_validated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (isValid) {
      return NextResponse.json({ valid: true })
    } else {
      return NextResponse.json({ valid: false, error: validationError })
    }
  } catch (error) {
    console.error('Error in POST /api/user/api-keys/[id]/validate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
