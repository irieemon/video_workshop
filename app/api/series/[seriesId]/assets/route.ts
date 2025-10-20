import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// GET /api/series/[seriesId]/assets - List all visual assets for a series
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify series ownership
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, project:projects!inner(id, user_id)')
      .eq('id', seriesId)
      .single()

    if (seriesError || !series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    if (series.project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch visual assets
    const { data: assets, error } = await supabase
      .from('series_visual_assets')
      .select('*')
      .eq('series_id', seriesId)
      .order('display_order', { ascending: true })

    if (error) throw error

    // Generate signed URLs for each asset
    const assetsWithUrls = await Promise.all(
      (assets || []).map(async (asset) => {
        const { data: urlData } = await supabase.storage
          .from('series-assets')
          .createSignedUrl(asset.storage_path, 3600) // 1 hour expiry

        return {
          ...asset,
          url: urlData?.signedUrl || null,
        }
      })
    )

    return NextResponse.json(assetsWithUrls)
  } catch (error: any) {
    console.error('Assets fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

// POST /api/series/[seriesId]/assets - Upload a new visual asset
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify series ownership
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, project:projects!inner(id, user_id)')
      .eq('id', seriesId)
      .single()

    if (seriesError || !series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    if (series.project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const assetType = formData.get('assetType') as string || 'other'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${user.id}/${seriesId}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('series-assets')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get image dimensions if it's an image
    let width: number | null = null
    let height: number | null = null

    if (file.type.startsWith('image/')) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const dimensions = await getImageDimensions(buffer, file.type)
        width = dimensions?.width || null
        height = dimensions?.height || null
      } catch (err) {
        console.warn('Failed to get image dimensions:', err)
      }
    }

    // Create database record
    const { data: asset, error } = await supabase
      .from('series_visual_assets')
      .insert({
        series_id: seriesId,
        name: name.trim(),
        description: description?.trim() || null,
        asset_type: assetType,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        width,
        height,
      })
      .select()
      .single()

    if (error) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('series-assets').remove([storagePath])
      throw error
    }

    // Generate signed URL
    const { data: urlData } = await supabase.storage
      .from('series-assets')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json(
      { ...asset, url: urlData?.signedUrl || null },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Asset upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload asset' },
      { status: 500 }
    )
  }
}

// Helper function to get image dimensions (basic implementation)
async function getImageDimensions(
  buffer: Buffer,
  mimeType: string
): Promise<{ width: number; height: number } | null> {
  // For now, return null - we can implement proper image dimension extraction
  // using a library like 'sharp' or 'probe-image-size' if needed
  return null
}
