import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  encryptApiKey,
  isValidOpenAIKeyFormat,
  isValidAnthropicKeyFormat,
  detectKeyProvider,
} from '@/lib/encryption/api-key-encryption'

export type ApiKeyProvider = 'openai' | 'anthropic' | 'stability' | 'replicate'

export interface ApiKeyResponse {
  id: string
  provider: ApiKeyProvider
  key_suffix: string
  key_name: string
  is_valid: boolean
  last_validated_at: string | null
  last_used_at: string | null
  created_at: string
}

/**
 * GET /api/user/api-keys
 * List all API keys for the authenticated user (with masked values)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select(
        'id, provider, key_suffix, key_name, is_valid, last_validated_at, last_used_at, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    return NextResponse.json({ keys: keys || [] })
  } catch (error) {
    console.error('Error in GET /api/user/api-keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/api-keys
 * Add a new API key
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { api_key, key_name = 'Default', provider: specifiedProvider } = body

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Detect or validate provider
    const detectedProvider = detectKeyProvider(api_key)
    const provider = specifiedProvider || detectedProvider

    if (provider === 'unknown') {
      return NextResponse.json(
        { error: 'Unable to detect API key provider. Please specify the provider.' },
        { status: 400 }
      )
    }

    // Validate key format based on provider
    if (provider === 'openai' && !isValidOpenAIKeyFormat(api_key)) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format. Keys should start with "sk-".' },
        { status: 400 }
      )
    }

    if (provider === 'anthropic' && !isValidAnthropicKeyFormat(api_key)) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key format. Keys should start with "sk-ant-".' },
        { status: 400 }
      )
    }

    // Check if user already has a key with this name for this provider
    const { data: existingKey } = await supabase
      .from('user_api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('key_name', key_name)
      .single()

    if (existingKey) {
      return NextResponse.json(
        { error: `You already have a ${provider} key named "${key_name}". Please use a different name or delete the existing key.` },
        { status: 409 }
      )
    }

    // Encrypt the API key
    const { encrypted, suffix } = encryptApiKey(api_key)

    // Store the encrypted key
    const { data: newKey, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        provider,
        encrypted_key: encrypted,
        key_suffix: suffix,
        key_name,
        is_valid: true, // Assume valid initially
        last_validated_at: new Date().toISOString(),
      })
      .select('id, provider, key_suffix, key_name, is_valid, created_at')
      .single()

    if (error) {
      console.error('Error storing API key:', error)
      return NextResponse.json({ error: 'Failed to store API key' }, { status: 500 })
    }

    return NextResponse.json({ key: newKey }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/user/api-keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
